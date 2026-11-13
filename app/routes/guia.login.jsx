import { useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import db from "../db.server";
import { GuideShell, useT } from "../components/guide/GuideShell";
import {
  clearFailedLogins,
  createGuideSession,
  createPendingLogin,
  destroyPendingLogin,
  getGuideFromRequest,
  getPendingLogin,
  loginBlocked,
  normalizeEmail,
  pendingCookie,
  recordFailedLogin,
  redirectTo,
  sessionCookie,
  sessionCookieHeaders,
  verifyPassword,
} from "../utils/guide-portal.server";
import { verifyTotp } from "../utils/totp.server.js";

export const loader = async ({ request }) => {
  const guide = await getGuideFromRequest(db, request).catch(() => null);
  if (guide) return redirectTo("/guia");
  const brand = await db.businessSetting
    .findFirst({ select: { logoOnLightUrl: true, logoOnDarkUrl: true, logoUrl: true } })
    .catch(() => null);
  // Senha certa e verificação em duas etapas ligada: falta só o código.
  const pending = await getPendingLogin(db, request).catch(() => null);
  return {
    logoLight: brand?.logoOnLightUrl || brand?.logoUrl || null,
    logoDark: brand?.logoOnDarkUrl || null,
    needsCode: Boolean(pending),
  };
};

export const action = async ({ request }) => {
  const form = await request.formData();
  const ip0 = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Segunda etapa: código do app autenticador.
  if (form.get("intent") === "code") {
    const pending = await getPendingLogin(db, request);
    if (!pending) return { error: "O tempo para digitar o código acabou. Entre de novo com e-mail e senha.", restart: true };
    const codeKey = `code|${pending.guide.id}|${ip0}`;
    if (loginBlocked(codeKey)) return { error: "Muitas tentativas. Espere 15 minutos ou fale com a gestão." };
    if (!verifyTotp(pending.guide.totpSecret, form.get("code"))) {
      recordFailedLogin(codeKey);
      return { error: "Código inválido. Confira o código de 6 dígitos no app autenticador." };
    }
    clearFailedLogins(codeKey);
    await destroyPendingLogin(db, request);
    const token = await createGuideSession(db, pending.guide.id);
    const headers = new Headers({ Location: "/guia" });
    headers.append("Set-Cookie", sessionCookie(token));
    headers.append("Set-Cookie", sessionCookie(null, 0, "/guia"));
    headers.append("Set-Cookie", pendingCookie("", 0));
    return new Response(null, { status: 302, headers });
  }
  if (form.get("intent") === "cancel") {
    await destroyPendingLogin(db, request);
    return redirectTo("/guia/login", { "Set-Cookie": pendingCookie("", 0) });
  }

  const email = normalizeEmail(form.get("email"));
  const password = String(form.get("password") || "");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `${email}|${ip}`;

  if (!email || !password) return { error: "Informe e-mail e senha." };
  if (loginBlocked(key) || loginBlocked(`ip|${ip}`)) {
    return { error: "Muitas tentativas. Espere 15 minutos ou fale com a gestão." };
  }

  const guide = await db.guide.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, portalEnabled: true },
    omit: { passwordHash: false, totpSecret: false },
  });
  const ok = guide?.passwordHash ? verifyPassword(password, guide.passwordHash) : false;
  if (!ok) {
    recordFailedLogin(key);
    recordFailedLogin(`ip|${ip}`);
    return { error: "E-mail ou senha incorretos, ou acesso não liberado pela gestão." };
  }

  clearFailedLogins(key);
  if (guide.totpEnabled && guide.totpSecret) {
    const pendingToken = await createPendingLogin(db, guide.id);
    return redirectTo("/guia/login", { "Set-Cookie": pendingCookie(pendingToken) });
  }
  const token = await createGuideSession(db, guide.id);
  const headers = sessionCookieHeaders(token);
  headers.set("Location", "/guia");
  return new Response(null, { status: 302, headers });
};

// Tela de entrada: faixa de azulejo no topo e cartão com o logo, nas cores da
// PMY (rosado do site, verde #006600, Asul nos títulos, Montserrat no texto).
const PMY_LOGO = "https://portugalmeandyou.com/cdn/shop/files/logo-verde-vetor.svg";

// Azulejo desenhado em SVG, em verde PMY sobre o rosado claro.
const TILE = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
<rect width="96" height="96" fill="#fbeeee"/>
<g fill="none" stroke="#006600" stroke-width="2.2">
<path d="M48 6 C62 22 74 34 90 48 C74 62 62 74 48 90 C34 74 22 62 6 48 C22 34 34 22 48 6Z"/>
<circle cx="48" cy="48" r="11"/>
<path d="M0 0 Q22 10 24 24 Q10 22 0 0Z M96 0 Q74 10 72 24 Q86 22 96 0Z M0 96 Q22 86 24 72 Q10 74 0 96Z M96 96 Q74 86 72 72 Q86 74 96 96Z"/>
</g>
<g fill="#006600"><circle cx="48" cy="48" r="4"/><circle cx="48" cy="20" r="2.6"/><circle cx="48" cy="76" r="2.6"/><circle cx="20" cy="48" r="2.6"/><circle cx="76" cy="48" r="2.6"/></g>
</svg>`);
// O mesmo azulejo para o modo escuro do telemóvel (verde apagado sobre quase preto).
const TILE_DARK = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
<rect width="96" height="96" fill="#151b18"/>
<g fill="none" stroke="#24603a" stroke-width="2.2">
<path d="M48 6 C62 22 74 34 90 48 C74 62 62 74 48 90 C34 74 22 62 6 48 C22 34 34 22 48 6Z"/>
<circle cx="48" cy="48" r="11"/>
<path d="M0 0 Q22 10 24 24 Q10 22 0 0Z M96 0 Q74 10 72 24 Q86 22 96 0Z M0 96 Q22 86 24 72 Q10 74 0 96Z M96 96 Q74 86 72 72 Q86 74 96 96Z"/>
</g>
<g fill="#24603a"><circle cx="48" cy="48" r="4"/><circle cx="48" cy="20" r="2.6"/><circle cx="48" cy="76" r="2.6"/><circle cx="20" cy="48" r="2.6"/><circle cx="76" cy="48" r="2.6"/></g>
</svg>`);

const loginStyles = `
.gl { --pmy-pink:#F4DCDC; --pmy-green:#006600; --pmy-green-dark:#004d00; --pmy-ink:#2B2B2B; --pmy-muted:#6f6363; --pmy-line:#ecd6d6;
  min-height:100dvh; display:grid; grid-template-columns:minmax(0, 1fr); grid-template-rows:minmax(180px, 34vh) 1fr;
  background:var(--pmy-pink); color:var(--pmy-ink); font-family:"Montserrat", system-ui, sans-serif; }
.gl-tiles { background:#fbeeee url(data:image/svg+xml,${TILE}) 0 0 / 96px 96px; border-bottom:6px solid var(--pmy-green); position:relative; }
.gl-tiles::after { content:""; position:absolute; inset:0; background:linear-gradient(180deg, transparent 55%, rgba(244,220,220,.75)); }
.gl-main { min-width:0; display:flex; justify-content:center; align-items:flex-start; padding:0 20px max(32px, env(safe-area-inset-bottom)); }
.gl-card { width:100%; max-width:420px; margin-top:-72px; position:relative; z-index:1; background:#fff; border-radius:22px; padding:26px 24px 24px; box-shadow:0 18px 40px -18px rgba(90,40,40,.35); border:1px solid var(--pmy-line); }
.gl-logo { height:76px; max-width:260px; width:auto; object-fit:contain; display:block; margin:0 auto 18px; }
.gl h1 { font-family:"Asul", Georgia, serif; font-weight:700; font-size:27px; line-height:1.15; margin:0 0 6px; color:var(--pmy-green); text-align:center; }
.gl-sub { color:var(--pmy-muted); font-size:15px; margin:0 0 22px; line-height:1.5; text-align:center; }
.gl-field { display:block; margin-bottom:16px; }
.gl-field span { display:block; font-weight:600; font-size:14px; margin-bottom:6px; }
.gl-input { display:flex; align-items:center; border:1.5px solid var(--pmy-line); border-radius:14px; background:#fff; transition:border-color .15s, box-shadow .15s; }
.gl-input:focus-within { border-color:var(--pmy-green); box-shadow:0 0 0 4px rgba(0,102,0,.12); }
.gl-input input { flex:1; min-width:0; border:0; outline:0; background:transparent; color:var(--pmy-ink); font:500 16px/1.2 "Montserrat", system-ui, sans-serif; padding:14px; }
.gl-eye { border:0; background:none; color:var(--pmy-green); font:600 13px "Montserrat", system-ui, sans-serif; padding:0 14px; min-height:44px; cursor:pointer; }
.gl-eye:focus-visible, .gl-submit:focus-visible { outline:3px solid rgba(0,102,0,.35); outline-offset:2px; }
.gl-submit { width:100%; min-height:52px; border:0; border-radius:14px; background:var(--pmy-green); color:#fff; font:700 16px "Montserrat", system-ui, sans-serif; cursor:pointer; margin-top:6px; display:flex; align-items:center; justify-content:center; gap:10px; transition:background .15s; }
.gl-submit:hover { background:var(--pmy-green-dark); }
.gl-submit[disabled] { cursor:progress; opacity:.85; }
.gl-spin { width:18px; height:18px; border-radius:50%; border:2.5px solid rgba(255,255,255,.4); border-top-color:#fff; animation:gl-spin .8s linear infinite; }
@keyframes gl-spin { to { transform:rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .gl-spin { animation:none; } }
.gl-help { color:var(--pmy-muted); font-size:13px; margin:18px 0 0; line-height:1.5; text-align:center; }
.gl-error { padding:10px 12px; border-radius:12px; font-size:14px; margin-bottom:12px; background:#fdecec; color:#9b1c1c; border:1px solid #f5c2c2; }

/* Modo escuro do telemóvel (13/11/2026): tela própria, para o aparelho não "escurecer" a página sozinho. */
@media (prefers-color-scheme: dark) {
  .gl { --pmy-pink:#111614; --pmy-green:#4ade80; --pmy-green-dark:#86efac; --pmy-ink:#e8eee9; --pmy-muted:#9aa5a0; --pmy-line:#2b3530; }
  .gl-tiles { background:#151b18 url(data:image/svg+xml,${TILE_DARK}) 0 0 / 96px 96px; border-bottom-color:#1f7a3a; }
  .gl-tiles::after { background:linear-gradient(180deg, transparent 45%, rgba(17,22,20,.92)); }
  .gl-card { background:#1a211e; border-color:#2b3530; box-shadow:0 18px 40px -18px rgba(0,0,0,.7); }
  .gl-logo.is-light { filter:brightness(0) invert(1); opacity:.92; }
  .gl h1 { color:#4ade80; }
  .gl-input { background:#111614; border-color:#2f3a35; }
  .gl-input:focus-within { border-color:#4ade80; box-shadow:0 0 0 4px rgba(74,222,128,.15); }
  .gl-input input { color:#e8eee9; }
  .gl-input input::placeholder { color:#6f7a75; }
  .gl-submit { background:#1f7a3a; color:#fff; }
  .gl-submit:hover { background:#25904a; }
  .gl-eye { color:#4ade80; }
  .gl-error { background:#3b1515; color:#fca5a5; border-color:#5b2020; }
}
`;

export default function GuideLogin() {
  const result = useActionData();
  const { logoLight, logoDark, needsCode } = useLoaderData() || {};
  const t = useT();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const [showPassword, setShowPassword] = useState(false);
  return (
    <GuideShell title={t("Entrar")} bare>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Asul:wght@400;700&family=Montserrat:wght@400;500;600;700&display=swap" />
      <style dangerouslySetInnerHTML={{ __html: loginStyles }} />
      <div className="gl">
        <div className="gl-tiles" aria-hidden="true" />
        <main className="gl-main">
          <div className="gl-card">
            <picture>
              {logoDark && <source media="(prefers-color-scheme: dark)" srcSet={logoDark} />}
              <img className={`gl-logo${logoDark ? "" : " is-light"}`} src={logoLight || PMY_LOGO} alt="Portugal, Me & You" />
            </picture>
            <h1>{t("Portal dos guias")}</h1>
            <p className="gl-sub">{needsCode && !result?.restart
              ? t("Digite o código de 6 dígitos do seu app autenticador.")
              : t("Entre com o e-mail e a senha que a gestão te enviou.")}</p>

            {result?.error && <div className="g-error gl-error" role="alert">{t(result.error)}</div>}

            {needsCode && !result?.restart ? (
              <>
                <Form method="post">
                  <input type="hidden" name="intent" value="code" />
                  <label className="gl-field">
                    <span>{t("Código de 6 dígitos")}</span>
                    <div className="gl-input">
                      <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required />
                    </div>
                  </label>
                  <button type="submit" className="gl-submit" disabled={busy}>
                    {busy && <span className="gl-spin" aria-hidden="true" />}
                    {busy ? t("Entrando") : t("Entrar")}
                  </button>
                </Form>
                <Form method="post">
                  <input type="hidden" name="intent" value="cancel" />
                  <button type="submit" className="gl-eye" style={{ display: "block", margin: "12px auto 0" }}>{t("Voltar")}</button>
                </Form>
              </>
            ) : (
            <Form method="post">
              <label className="gl-field">
                <span>{t("E-mail")}</span>
                <div className="gl-input">
                  <input name="email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" required />
                </div>
              </label>
              <label className="gl-field">
                <span>{t("Senha")}</span>
                <div className="gl-input">
                  <input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required />
                  <button type="button" className="gl-eye" onClick={() => setShowPassword((v) => !v)} aria-pressed={showPassword}>
                    {showPassword ? t("Esconder") : t("Mostrar")}
                  </button>
                </div>
              </label>
              <button type="submit" className="gl-submit" disabled={busy}>
                {busy && <span className="gl-spin" aria-hidden="true" />}
                {busy ? t("Entrando") : t("Entrar")}
              </button>
            </Form>
            )}
            <p className="gl-help">{t("Esqueceu a senha? Peça uma nova para a gestão da PMY.")}</p>
          </div>
        </main>
      </div>
    </GuideShell>
  );
}

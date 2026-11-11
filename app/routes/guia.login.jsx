import { useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import db from "../db.server";
import { GuideShell } from "../components/guide/GuideShell";
import {
  clearFailedLogins,
  createGuideSession,
  getGuideFromRequest,
  loginBlocked,
  normalizeEmail,
  recordFailedLogin,
  redirectTo,
  sessionCookie,
  verifyPassword,
} from "../utils/guide-portal.server";

export const loader = async ({ request }) => {
  const guide = await getGuideFromRequest(db, request).catch(() => null);
  if (guide) return redirectTo("/guia");
  const brand = await db.businessSetting
    .findFirst({ select: { logoOnLightUrl: true, logoOnDarkUrl: true, logoUrl: true } })
    .catch(() => null);
  return {
    logoLight: brand?.logoOnLightUrl || brand?.logoUrl || null,
    logoDark: brand?.logoOnDarkUrl || null,
  };
};

export const action = async ({ request }) => {
  const form = await request.formData();
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
    omit: { passwordHash: false },
  });
  const ok = guide?.passwordHash ? verifyPassword(password, guide.passwordHash) : false;
  if (!ok) {
    recordFailedLogin(key);
    recordFailedLogin(`ip|${ip}`);
    return { error: "E-mail ou senha incorretos, ou acesso não liberado pela gestão." };
  }

  clearFailedLogins(key);
  const token = await createGuideSession(db, guide.id);
  return redirectTo("/guia", { "Set-Cookie": sessionCookie(token) });
};

// Azulejo desenhado em SVG (um quarto do padrão, espelhado pela repetição):
// é a identidade da tela de entrada, o resto fica quieto.
const TILE = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
<rect width="96" height="96" fill="#f3f6f1"/>
<g fill="none" stroke="#1d5a34" stroke-width="2.2">
<path d="M48 6 C62 22 74 34 90 48 C74 62 62 74 48 90 C34 74 22 62 6 48 C22 34 34 22 48 6Z"/>
<circle cx="48" cy="48" r="11"/>
<path d="M0 0 Q22 10 24 24 Q10 22 0 0Z M96 0 Q74 10 72 24 Q86 22 96 0Z M0 96 Q22 86 24 72 Q10 74 0 96Z M96 96 Q74 86 72 72 Q86 74 96 96Z"/>
</g>
<g fill="#1d5a34"><circle cx="48" cy="48" r="4"/><circle cx="48" cy="20" r="2.6"/><circle cx="48" cy="76" r="2.6"/><circle cx="20" cy="48" r="2.6"/><circle cx="76" cy="48" r="2.6"/></g>
</svg>`);

const loginStyles = `
.gl { min-height:100dvh; display:grid; grid-template-columns:minmax(0, 1fr); grid-template-rows:minmax(180px, 34vh) 1fr; font-family:"Assistant", system-ui, sans-serif; background:var(--g-bg); }
.gl-tiles { background:#f3f6f1 url("data:image/svg+xml,${TILE}") 0 0 / 96px 96px; border-bottom:6px solid #1d5a34; position:relative; }
.gl-tiles::after { content:""; position:absolute; inset:0; background:linear-gradient(180deg, transparent 55%, color-mix(in srgb, var(--g-bg) 70%, transparent)); }
.gl-main { min-width:0; display:flex; justify-content:center; align-items:flex-start; padding:0 20px max(32px, env(safe-area-inset-bottom)); }
.gl-card { width:100%; max-width:420px; margin-top:-72px; position:relative; z-index:1; background:var(--g-card); border-radius:22px; padding:28px 24px 24px; box-shadow:0 18px 40px -18px rgba(20,60,35,.35); border:1px solid var(--g-line); }
.gl-logo { height:56px; max-width:220px; object-fit:contain; display:block; margin-bottom:18px; }
.gl-logo.dark { display:none; }
@media (prefers-color-scheme: dark) { .gl-logo.light.has-dark { display:none; } .gl-logo.dark { display:block; } .gl-tiles { filter:brightness(.82); } }
.gl-word { font-family:"Asul", Georgia, serif; font-size:15px; color:var(--g-green); margin:0 0 18px; }
.gl h1 { font-family:"Asul", Georgia, serif; font-weight:700; font-size:28px; line-height:1.15; margin:0 0 6px; letter-spacing:-.01em; }
.gl-sub { color:var(--g-muted); font-size:16px; margin:0 0 22px; line-height:1.45; }
.gl-field { display:block; margin-bottom:16px; }
.gl-field span { display:block; font-weight:700; font-size:15px; margin-bottom:6px; }
.gl-input { display:flex; align-items:center; border:1.5px solid var(--g-line); border-radius:14px; background:var(--g-card); transition:border-color .15s, box-shadow .15s; }
.gl-input:focus-within { border-color:var(--g-green); box-shadow:0 0 0 4px color-mix(in srgb, var(--g-green) 14%, transparent); }
.gl-input input { flex:1; min-width:0; border:0; outline:0; background:transparent; color:var(--g-ink); font:600 17px/1.2 "Assistant", system-ui, sans-serif; padding:14px; }
.gl-eye { border:0; background:none; color:var(--g-muted); font:700 14px "Assistant", system-ui, sans-serif; padding:0 14px; min-height:44px; cursor:pointer; }
.gl-eye:focus-visible, .gl-submit:focus-visible { outline:3px solid color-mix(in srgb, var(--g-green) 45%, transparent); outline-offset:2px; }
.gl-submit { width:100%; min-height:52px; border:0; border-radius:14px; background:#1d5a34; color:#fff; font:800 17px "Assistant", system-ui, sans-serif; cursor:pointer; margin-top:6px; display:flex; align-items:center; justify-content:center; gap:10px; }
.gl-submit[disabled] { cursor:progress; background:color-mix(in srgb, #1d5a34 80%, var(--g-card)); }
.gl-spin { width:18px; height:18px; border-radius:50%; border:2.5px solid rgba(255,255,255,.4); border-top-color:#fff; animation:gl-spin .8s linear infinite; }
@keyframes gl-spin { to { transform:rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .gl-spin { animation:none; } }
.gl-help { color:var(--g-muted); font-size:14px; margin:18px 0 0; line-height:1.45; }
`;

export default function GuideLogin() {
  const result = useActionData();
  const { logoLight, logoDark } = useLoaderData() || {};
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const [showPassword, setShowPassword] = useState(false);
  return (
    <GuideShell title="Entrar" bare>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Asul:wght@400;700&family=Assistant:wght@400;600;700;800&display=swap" />
      <style dangerouslySetInnerHTML={{ __html: loginStyles }} />
      <div className="gl">
        <div className="gl-tiles" aria-hidden="true" />
        <main className="gl-main">
          <div className="gl-card">
            {logoLight ? (
              <>
                <img className={`gl-logo light${logoDark ? " has-dark" : ""}`} src={logoLight} alt="Portugal, Me & You" />
                {logoDark && <img className="gl-logo dark" src={logoDark} alt="" aria-hidden="true" />}
              </>
            ) : (
              <p className="gl-word">Portugal, Me &amp; You</p>
            )}
            <h1>Olá, que bom te ver</h1>
            <p className="gl-sub">Entre com o e-mail e a senha que a gestão te enviou.</p>

            {result?.error && <div className="g-error" role="alert">{result.error}</div>}

            <Form method="post">
              <label className="gl-field">
                <span>E-mail</span>
                <div className="gl-input">
                  <input name="email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" required />
                </div>
              </label>
              <label className="gl-field">
                <span>Senha</span>
                <div className="gl-input">
                  <input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required />
                  <button type="button" className="gl-eye" onClick={() => setShowPassword((v) => !v)} aria-pressed={showPassword}>
                    {showPassword ? "Esconder" : "Mostrar"}
                  </button>
                </div>
              </label>
              <button type="submit" className="gl-submit" disabled={busy}>
                {busy && <span className="gl-spin" aria-hidden="true" />}
                {busy ? "Entrando" : "Entrar"}
              </button>
            </Form>
            <p className="gl-help">Esqueceu a senha? Peça uma nova para a gestão da PMY.</p>
          </div>
        </main>
      </div>
    </GuideShell>
  );
}

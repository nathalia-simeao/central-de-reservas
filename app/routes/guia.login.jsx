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
    .findFirst({ select: { logoOnLightUrl: true, logoUrl: true } })
    .catch(() => null);
  return {
    logoLight: brand?.logoOnLightUrl || brand?.logoUrl || null,
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

// Tela de entrada com a identidade do site da PMY: fundo rosado, logo verde,
// Asul nos títulos, Montserrat no texto, foto de viagem com cantos redondos e
// botão verde PMY. A foto é a mesma do topo do site.
const PMY_LOGO = "https://portugalmeandyou.com/cdn/shop/files/logo-verde-vetor.svg";
const PMY_PHOTO = "https://cdn.shopify.com/s/files/1/0757/2075/3419/files/hbsite1.png?width=1400";

const loginStyles = `
.gl { --pmy-pink:#F4DCDC; --pmy-green:#006600; --pmy-green-dark:#004d00; --pmy-ink:#2B2B2B; --pmy-muted:#6f6363; --pmy-line:#ead2d2;
  min-height:100dvh; background:var(--pmy-pink); color:var(--pmy-ink); font-family:"Montserrat", system-ui, sans-serif;
  display:grid; grid-template-columns:minmax(0, 1fr); grid-template-rows:auto auto 1fr; padding:0 16px max(28px, env(safe-area-inset-bottom)); }
.gl-head { display:flex; justify-content:center; padding:max(18px, env(safe-area-inset-top)) 0 14px; }
.gl-head img { height:56px; width:auto; display:block; }
.gl-photo { position:relative; border-radius:26px; overflow:hidden; min-height:200px; height:30vh; background:#c9b7a8 url("${PMY_PHOTO}") center 55% / cover no-repeat; }
.gl-photo::after { content:""; position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,.45)); }
.gl-photo p { position:absolute; z-index:1; left:22px; right:22px; bottom:58px; margin:0; color:#fff; font-family:"Asul", Georgia, serif; font-size:26px; line-height:1.15; text-shadow:0 1px 12px rgba(0,0,0,.35); }
.gl-main { min-width:0; display:flex; justify-content:center; align-items:flex-start; }
.gl-card { width:100%; max-width:440px; margin-top:-44px; position:relative; z-index:2; background:#fff; border-radius:26px; padding:26px 22px 22px; box-shadow:0 20px 44px -24px rgba(90,40,40,.35); }
.gl h1 { font-family:"Asul", Georgia, serif; font-weight:700; font-size:26px; line-height:1.2; margin:0 0 6px; color:var(--pmy-green); }
.gl-sub { color:var(--pmy-muted); font-size:15px; margin:0 0 22px; line-height:1.5; }
.gl-field { display:block; margin-bottom:16px; }
.gl-field span { display:block; font-weight:600; font-size:13px; margin-bottom:6px; color:var(--pmy-ink); }
.gl-input { display:flex; align-items:center; border:1.5px solid var(--pmy-line); border-radius:999px; background:#fff; transition:border-color .15s, box-shadow .15s; }
.gl-input:focus-within { border-color:var(--pmy-green); box-shadow:0 0 0 4px rgba(0,102,0,.12); }
.gl-input input { flex:1; min-width:0; border:0; outline:0; background:transparent; color:var(--pmy-ink); font:500 16px/1.2 "Montserrat", system-ui, sans-serif; padding:14px 18px; }
.gl-eye { border:0; background:none; color:var(--pmy-green); font:600 13px "Montserrat", system-ui, sans-serif; padding:0 18px; min-height:44px; cursor:pointer; }
.gl-eye:focus-visible, .gl-submit:focus-visible { outline:3px solid rgba(0,102,0,.35); outline-offset:2px; }
.gl-submit { width:100%; min-height:52px; border:0; border-radius:999px; background:var(--pmy-green); color:#fff; font:700 16px "Montserrat", system-ui, sans-serif; cursor:pointer; margin-top:8px; display:flex; align-items:center; justify-content:center; gap:10px; transition:background .15s; }
.gl-submit:hover { background:var(--pmy-green-dark); }
.gl-submit[disabled] { cursor:progress; opacity:.85; }
.gl-spin { width:18px; height:18px; border-radius:50%; border:2.5px solid rgba(255,255,255,.4); border-top-color:#fff; animation:gl-spin .8s linear infinite; }
@keyframes gl-spin { to { transform:rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .gl-spin { animation:none; } }
.gl-help { color:var(--pmy-muted); font-size:13px; margin:18px 0 0; line-height:1.5; text-align:center; }
.gl .g-error { border-radius:14px; }
@media (min-width: 900px) {
  .gl { grid-template-columns:minmax(0, 1.1fr) minmax(0, 1fr); grid-template-rows:auto 1fr; column-gap:40px; padding:0 32px 32px; }
  .gl-head { grid-column:1 / -1; justify-content:flex-start; padding-top:22px; }
  .gl-head img { height:72px; }
  .gl-photo { height:auto; min-height:560px; }
  .gl-photo p { bottom:32px; font-size:34px; }
  .gl-main { align-items:center; }
  .gl-card { margin-top:0; padding:36px 32px 30px; }
}
`;

export default function GuideLogin() {
  const result = useActionData();
  const { logoLight } = useLoaderData() || {};
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const [showPassword, setShowPassword] = useState(false);
  return (
    <GuideShell title="Entrar" bare>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Asul:wght@400;700&family=Montserrat:wght@400;500;600;700&display=swap" />
      <style dangerouslySetInnerHTML={{ __html: loginStyles }} />
      <div className="gl">
        <header className="gl-head">
          <img src={logoLight || PMY_LOGO} alt="Portugal, Me & You" />
        </header>
        <div className="gl-photo" role="img" aria-label="Brinde com vinho do Porto no vale do Douro">
          <p>Cada passeio começa com você.</p>
        </div>
        <main className="gl-main">
          <div className="gl-card">
            <h1>Portal dos guias</h1>
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

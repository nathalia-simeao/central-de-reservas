import { Form, useActionData, useNavigation } from "react-router";
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
  return null;
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

export default function GuideLogin() {
  const result = useActionData();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  return (
    <GuideShell title="Entrar">
      <div className="g-top">
        <div>
          <h1>Portal do guia</h1>
          <small>Portugal, Me &amp; You</small>
        </div>
      </div>
      <div className="g-card">
        {result?.error && <div className="g-error" role="alert">{result.error}</div>}
        <Form method="post">
          <label className="g-field">
            E-mail
            <input name="email" type="email" autoComplete="username" inputMode="email" required />
          </label>
          <label className="g-field">
            Senha
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit" className="g-btn primary" style={{ width: "100%" }} disabled={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </Form>
        <p className="g-empty" style={{ marginTop: 12 }}>
          Esqueceu a senha? Peça uma nova para a gestão.
        </p>
      </div>
    </GuideShell>
  );
}

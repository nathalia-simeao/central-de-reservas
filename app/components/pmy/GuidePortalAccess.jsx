import { useState } from "react";
import { Button } from "./PmyUI";

// Perfil do guia → Acesso ao portal do guia (só administradores).
export default function GuidePortalAccess({ guide, onSave, lang = "pt" }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shownPassword, setShownPassword] = useState("");
  const [state, setState] = useState({ portalEnabled: Boolean(guide?.portalEnabled), portalHasPassword: Boolean(guide?.portalHasPassword) });

  if (!guide || !onSave) return null;
  const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/guia` : "https://central.portugalmeandyou.com/guia";

  const run = async (patch) => {
    setBusy(true);
    setError("");
    setShownPassword("");
    try {
      const result = await onSave(guide.id, patch);
      setState({ portalEnabled: Boolean(result.guide?.portalEnabled), portalHasPassword: Boolean(result.guide?.portalHasPassword) });
      if (result.password) setShownPassword(result.password);
      setTyped("");
    } catch (e) {
      setError(e?.message || tr("Não foi possível salvar.", "Could not save."));
    } finally {
      setBusy(false);
    }
  };

  const message = shownPassword
    ? tr(
        `Olá, ${guide.name?.split(" ")[0] || ""}! Seu acesso ao app da Portugal, Me & You:\n${portalUrl}\nE-mail: ${guide.email}\nSenha: ${shownPassword}\nNo celular, abra o link e use "Adicionar à tela inicial" para ter o atalho.`,
        `Hi ${guide.name?.split(" ")[0] || ""}! Your guide portal access:\n${portalUrl}\nEmail: ${guide.email}\nPassword: ${shownPassword}`,
      )
    : "";
  const wa = guide.whatsapp ? `https://wa.me/${String(guide.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(message)}` : null;

  return (
    <div className="pmy-ds-panel-soft pmy-u-mt-3 pmy-guide-portal">
      <h4 className="pmy-u-mb-2">{tr("Acesso pelo app (e-mail e senha)", "App access (email and password)")}</h4>
      <p className="pmy-guide-portal__hint">{tr("Não precisa de Shopify. Quem tem a área Guia vê suas saídas e o Quadro; quem tem Administração vê também a Central completa.", "No Shopify needed. Guides see their departures and the Board; Administration also gets the full Central.")}</p>
      <p className="pmy-guide-portal__status">
        {state.portalEnabled
          ? tr("✅ Liberado — entra em ", "✅ Enabled — signs in at ")
          : tr("⛔ Sem acesso — ", "⛔ No access — ")}
        {state.portalEnabled ? <code>{portalUrl}</code> : tr("libere abaixo depois de definir a senha.", "enable below after setting a password.")}
        <br />
        <small>{tr("Login:", "Login:")} {guide.email || tr("sem e-mail cadastrado — preencha o e-mail e salve antes de liberar", "no email — fill in and save first")}</small>
      </p>

      {error && <p role="alert" className="pmy-booking-list__error">{error}</p>}


      {shownPassword && (
        <div className="pmy-guide-portal__password" role="status">
          <strong>{tr("Senha nova (anote agora, ela não aparece de novo):", "New password (copy it now, it won't be shown again):")}</strong>
          <code>{shownPassword}</code>
          <div className="pmy-guide-portal__actions">
            <Button type="button" size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(message)}>
              {tr("Copiar mensagem para o guia", "Copy message for the guide")}
            </Button>
            {wa && <a className="pmy-btn-link" href={wa} target="_blank" rel="noreferrer">{tr("Enviar por WhatsApp", "Send via WhatsApp")}</a>}
          </div>
        </div>
      )}

      <div className="pmy-guide-portal__actions">
        <Button type="button" size="sm" disabled={busy || !guide.email} onClick={() => run({ enabled: true, generate: true })}>
          {state.portalHasPassword ? tr("Gerar nova senha", "Generate new password") : tr("Gerar senha e liberar", "Generate password and enable")}
        </Button>
        <input
          type="password"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={tr("ou digite uma senha (mín. 8)", "or type a password (min 8)")}
          aria-label={tr("Senha do app", "App password")}
          onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
          autoComplete="new-password"
        />
        <Button type="button" size="sm" variant="secondary" disabled={busy || typed.length < 8 || !guide.email} onClick={() => run({ enabled: true, password: typed })}>
          {tr("Usar esta senha", "Use this password")}
        </Button>
        {state.portalEnabled && (
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => run({ enabled: false })}>
            {tr("Bloquear acesso", "Disable access")}
          </Button>
        )}
      </div>
    </div>
  );
}

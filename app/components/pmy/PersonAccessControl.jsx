import { DropdownSelect } from "./PmyUI";
import { useState } from "react";

// Acesso à Central de uma pessoa da Equipe: liga um usuário Shopify (que já
// abriu a Central) à pessoa e escolhe o perfil. Só administradores veem.
export default function PersonAccessControl({ person, users = [], currentUser = null, onSave, lang = "pt" }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const linked = users.find((u) => u.guideId === person.id) || null;
  const free = users.filter((u) => !u.guideId || u.guideId === person.id);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const run = async (userId, patch) => {
    setBusy(true);
    setMessage("");
    try {
      await onSave(userId, patch);
      setMessage(tr("Salvo.", "Saved."));
    } catch (error) {
      setMessage(error?.message || tr("Não foi possível salvar.", "Could not save."));
    } finally {
      setBusy(false);
    }
  };

  const seen = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pt-PT", { dateStyle: "short", timeStyle: "short" }).format(date);
  };
  const userLabel = (u) => `${u.name ? `${u.name} · ` : ""}${tr("acesso Shopify", "Shopify login")} #${String(u.shopifyUserId).slice(-6)}${u.lastSeenAt ? ` · ${tr("último acesso", "last seen")} ${seen(u.lastSeenAt)}` : ""}${currentUser?.id === u.id ? ` · ${tr("você", "you")}` : ""}`;

  return (
    <div className="pmy-person-access">
      <span className="pmy-person-access__label">{tr("Login pela Shopify (opcional)", "Shopify login (optional)")}</span>
      <DropdownSelect
        value={linked?.id || ""}
        disabled={busy}
        ariaLabel={tr("Login pela Shopify", "Shopify login")}
        placeholder={tr("Não usa a Shopify", "Doesn't use Shopify")}
        options={[{ value: "", label: tr("Não usa a Shopify", "Doesn't use Shopify") }, ...free.map((u) => ({ value: u.id, label: userLabel(u) }))]}
        onChange={async (userId) => {
          if (!userId && linked) await run(linked.id, { guideId: "" });
          else if (userId) await run(userId, { guideId: person.id });
        }}
      />
      {linked && (
        <div className="pmy-person-access__roles" role="group" aria-label={tr("Perfil", "Role")}>
          {[["ADMIN", tr("Administrador", "Admin")], ["STAFF", tr("Equipe", "Team")]].map(([role, label]) => (
            <button key={role} type="button" disabled={busy} className={linked.role === role ? "is-on" : ""} onClick={() => linked.role !== role && run(linked.id, { role })}>
              {label}
            </button>
          ))}
        </div>
      )}
      <small className="pmy-person-access__hint">
        {linked
          ? (linked.role === "ADMIN"
            ? tr("Vê tudo, inclusive Financeiro, Integrações e Configurações.", "Sees everything.")
            : tr("Não vê Financeiro, Desempenho, Saúde das integrações, Integrações e Configurações.", "No Finance, Performance, Integrations or Settings."))
          : tr("Só para quem entra pelo admin da Shopify. Guias e equipe não precisam: liberam o acesso pelo app logo abaixo, com e-mail e senha.", "Only for people who use the Shopify admin. Others get app access below with email and password.")}
      </small>
      {message && <small role="status" className="pmy-person-access__msg">{message}</small>}
    </div>
  );
}

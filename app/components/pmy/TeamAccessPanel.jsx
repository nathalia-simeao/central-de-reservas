import { useState } from "react";
import { Button, Card, SectionHeader } from "./PmyUI";

// Configurações → Equipe: quem abre a Central pelo admin do Shopify e com qual perfil.
export default function TeamAccessPanel({ users = [], currentUser = null, onSave, lang = "pt" }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [rows, setRows] = useState(users);
  const [names, setNames] = useState(() => Object.fromEntries(users.map((u) => [u.id, u.name || ""])));
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const save = async (user, patch) => {
    setBusyId(user.id);
    setMessage("");
    try {
      const saved = await onSave(user.id, patch);
      setRows((current) => current.map((item) => (item.id === user.id ? { ...item, ...saved } : item)));
      setMessage(tr("Salvo.", "Saved."));
    } catch (error) {
      setMessage(error?.message || tr("Não foi possível salvar.", "Could not save."));
    } finally {
      setBusyId("");
    }
  };

  const lastSeen = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "—"
      : new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pt-PT", { dateStyle: "short", timeStyle: "short" }).format(date);
  };

  return (
    <Card>
      <SectionHeader
        eyebrow={tr("Acesso", "Access")}
        title={tr("Equipe da Central", "Central team")}
        subtitle={tr(
          "Cada pessoa aparece aqui depois de abrir a Central pelo admin do Shopify. Administrador vê tudo. Equipe não vê Financeiro, Desempenho, Saúde das integrações, Integrações e Configurações. Para quem nem deve abrir o app, tire a permissão no Shopify (Configurações → Usuários e permissões).",
          "People appear here after opening the Central from Shopify admin. Admin sees everything. Team does not see Finance, Performance, Integration health, Integrations and Settings.",
        )}
      />
      {!rows.length ? (
        <p className="pmy-team__empty">{tr("Ninguém registrado ainda.", "Nobody registered yet.")}</p>
      ) : (
        <ul className="pmy-team">
          {rows.map((user) => {
            const isMe = currentUser?.id && currentUser.id === user.id;
            const admin = user.role === "ADMIN";
            return (
              <li key={user.id} className="pmy-team__row">
                <div className="pmy-team__who">
                  <input
                    value={names[user.id] ?? ""}
                    onChange={(e) => setNames((current) => ({ ...current, [user.id]: e.target.value }))}
                    onBlur={() => (names[user.id] ?? "") !== (user.name || "") && save(user, { name: names[user.id] })}
                    placeholder={tr("Nome (ex.: Renan)", "Name (e.g. Renan)")}
                    aria-label={tr("Nome da pessoa", "Person name")}
                    maxLength={80}
                  />
                  <small>
                    {isMe ? tr("Você · ", "You · ") : ""}
                    {tr("ID Shopify", "Shopify ID")} {user.shopifyUserId} · {tr("último acesso", "last seen")} {lastSeen(user.lastSeenAt)}
                  </small>
                </div>
                <div className="pmy-team__role" role="group" aria-label={tr("Perfil", "Role")}>
                  <Button type="button" size="sm" variant={admin ? "primary" : "secondary"} aria-pressed={admin} disabled={busyId === user.id || admin}
                    onClick={() => save(user, { role: "ADMIN" })}>
                    {tr("Administrador", "Admin")}
                  </Button>
                  <Button type="button" size="sm" variant={!admin ? "primary" : "secondary"} aria-pressed={!admin} disabled={busyId === user.id || !admin}
                    onClick={() => save(user, { role: "STAFF" })}>
                    {tr("Equipe", "Team")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {message && <p role="status" className="pmy-team__msg">{message}</p>}
    </Card>
  );
}

// Sino de menções: comentários do Quadro em que a pessoa logada foi marcada (@).
// A pessoa precisa estar ligada a um cadastro da Equipe (o app de adm já é;
// no Shopify, Configurações → Equipe → acesso à Central).
import { useCallback, useEffect, useState } from "react";

export default function MentionsBell({ requestJson, lang = "pt" }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [state, setState] = useState({ mentions: [], unread: 0, linked: true });
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await requestJson("/api/board-activity?mentions=1");
      if (result?.success) setState(result);
    } catch { /* sem menções */ }
  }, [requestJson]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const openPanel = async () => {
    setOpen(true);
    const unreadIds = state.mentions.filter((m) => !m.read).map((m) => m.id);
    if (!unreadIds.length) return;
    const fd = new FormData();
    fd.append("intent", "read");
    fd.append("ids", unreadIds.join(","));
    await requestJson("/api/board-activity", fd).catch(() => null);
    setState((s) => ({ ...s, unread: 0, mentions: s.mentions.map((m) => ({ ...m, wasUnread: !m.read, read: true })) }));
  };

  return (
    <>
      <button type="button" className="pmy-date-btn pmy-mentions-btn" onClick={openPanel}
        aria-label={tr(`Menções: ${state.unread} novas`, `Mentions: ${state.unread} new`)} title={tr("Menções", "Mentions")}>
        <span aria-hidden="true">@</span>
        {state.unread > 0 && <span className="pmy-mentions-btn__count">{state.unread}</span>}
      </button>
      {open && (
        <div className="pmy-board-modal" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <section className="pmy-board-modal__card pmy-mentions" role="dialog" aria-modal="true" aria-label={tr("Menções", "Mentions")}>
            <div className="pmy-board-modal__head">
              <div><h3>{tr("Menções", "Mentions")}</h3><p>{tr("Comentários do Quadro em que marcaram você.", "Board comments that mention you.")}</p></div>
              <button type="button" className="pmy-board-pop__icon" aria-label={tr("Fechar", "Close")} onClick={() => setOpen(false)}>×</button>
            </div>
            {!state.linked && <p className="pmy-support-empty">{tr("Seu acesso à Central ainda não está ligado a uma pessoa da Equipe. Peça a um administrador: Configurações → Equipe → acesso à Central.", "Your access is not linked to a team member yet.")}</p>}
            {state.linked && !state.mentions.length && <p className="pmy-board-pop__empty">{tr("Ninguém marcou você ainda.", "No mentions yet.")}</p>}
            <ul className="pmy-activity__list">
              {state.mentions.map((m) => (
                <li key={m.id} className={`pmy-activity__item is-comment${m.wasUnread ? " is-new" : ""}`}>
                  <div>
                    <p className="pmy-activity__who"><b>{m.authorName}</b> · <span>{m.where}</span> <small>{new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(m.createdAt))}</small></p>
                    <p className="pmy-activity__bubble">{m.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}

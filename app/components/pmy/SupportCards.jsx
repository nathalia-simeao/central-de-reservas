// Cartões avulsos do Quadro, guardados em SupportCard:
//   - sem dia  → coluna fixa "Documentos de suporte" (passes, vouchers...);
//   - com dia  → "Demanda" na coluna do dia (pedidos externos, sem passeio).
// Toda a equipe cria e edita; apagar pede confirmação.

import { useState } from "react";
import { DatePicker, TimeSelect } from "./PmyUI";
import { ChecklistEditor } from "./ChecklistBlock";
import AuthedImage, { isPreviewableImage } from "./AuthedImage";
import ActivityPanel from "./ActivityPanel";
import { cardChecklists } from "../../utils/board-tasks.js";
import { checklistProgress } from "../../utils/departure-checklists.js";

const initialsOf = (name) => {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0]).toUpperCase();
};

export function taskProgress(card) {
  return checklistProgress({ bookings: [] }, cardChecklists(card?.checklists));
}

export function SupportModal({ card, guides = [], handlers = {}, loadImage = null, requestJson = null, onClose, lang = "pt" }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const isNew = !card.id;
  const isTask = Boolean(card.dateKey);
  const canEdit = Boolean(handlers.save);
  const [editing, setEditing] = useState(isNew);
  const [title, setTitle] = useState(card.title || "");
  const [body, setBody] = useState(card.body || "");
  const [visible, setVisible] = useState(card.visibleToGuides !== false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try { return await fn(); } catch (e) { setError(e?.message || tr("Não foi possível salvar.", "Could not save.")); return null; } finally { setBusy(false); }
  };
  const patch = (fields) => run(() => handlers.save({ id: card.id, ...fields }));
  const saveText = () => run(async () => {
    const saved = await handlers.save({ id: card.id, title, body, ...(isTask ? {} : { visibleToGuides: visible }), ...(isNew ? { dateKey: card.dateKey || "", time: card.time || "" } : {}) });
    if (isNew) onClose(saved?.id || null); else setEditing(false);
  });
  const links = Array.isArray(card.links) ? card.links : [];
  const assignees = (card.assigneeIds || []).map((id) => guides.find((g) => g.id === id)).filter(Boolean);

  return (
    <div className="pmy-board-modal">
      <button type="button" className="pmy-board-modal__backdrop" aria-label={tr("Fechar", "Close")} tabIndex={-1} onClick={() => onClose()} />
      <div className={`pmy-board-modal__card pmy-support-modal${isTask ? " is-task" : ""}`} role="dialog" aria-modal="true" aria-label={card.title || tr("Novo cartão", "New card")}>
        <div className="pmy-board-modal__head">
          <div>
            <small>{isTask ? tr("Demanda (sem passeio)", "Task (no tour)") : tr("Documentos de suporte", "Support documents")}</small>
            {editing
              ? <input className="pmy-ds-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isTask ? tr("O que precisa ser feito? (ex.: Transfer aeroporto família Silva)", "What needs doing?") : tr("Título (ex.: Voucher Pastéis)", "Title")} aria-label={tr("Título", "Title")} />
              : <h3 className={card.done ? "is-done" : ""}>{card.title}</h3>}
          </div>
          <button type="button" className="pmy-board-pop__icon" aria-label={tr("Fechar", "Close")} onClick={() => onClose()}>×</button>
        </div>

        {error && <p className="pmy-support-error" role="alert">{error}</p>}

        {isTask && !isNew && (
          <div className="pmy-board-modal__section pmy-task-meta">
            <label className="pmy-task-meta__field">
              <span>{tr("Dia", "Day")}</span>
              <DatePicker value={card.dateKey} onChange={(e) => { const v = e?.target?.value ?? e; if (v && v !== card.dateKey) patch({ dateKey: v }); }}
                locale={lang === "en" ? "en-GB" : "pt-PT"} todayLabel={tr("Hoje", "Today")} clearLabel={tr("Limpar", "Clear")} />
            </label>
            <label className="pmy-task-meta__field">
              <span>{tr("Horário (opcional)", "Time (optional)")}</span>
              <span className="pmy-task-meta__time">
                <TimeSelect value={card.time || ""} onChange={(v) => patch({ time: v })} lang={lang} placeholder={tr("Sem horário", "No time")} />
                {card.time && <button type="button" className="pmy-board-btn" onClick={() => patch({ time: "" })}>{tr("Tirar", "Clear")}</button>}
              </span>
            </label>
            <label className="pmy-support-check pmy-task-meta__done">
              <input type="checkbox" checked={Boolean(card.done)} disabled={busy} onChange={(e) => patch({ done: e.target.checked })} />
              {tr("Concluída", "Done")}
            </label>
            <div className="pmy-task-meta__field">
              <span>{tr("Responsáveis", "Assignees")}</span>
              <div className="pmy-task-people">
                {assignees.map((g) => (
                  <span key={g.id} className="pmy-board-guide">
                    <i className="pmy-board-avatar" style={{ width: 24, height: 24, background: "#6e5dc6" }}>{initialsOf(g.name)}</i>
                    <span>{g.name}</span>
                    <button type="button" aria-label={tr(`Tirar ${g.name}`, `Remove ${g.name}`)} onClick={() => patch({ assigneeIds: (card.assigneeIds || []).filter((id) => id !== g.id) })}>×</button>
                  </span>
                ))}
                <button type="button" className="pmy-board-btn" onClick={() => setPicking(!picking)}>{tr("+ Pessoa", "+ Person")}</button>
              </div>
              {picking && (
                <div className="pmy-task-people__menu">
                  {guides.filter((g) => !(card.assigneeIds || []).includes(g.id)).map((g) => (
                    <button key={g.id} type="button" className="pmy-board-btn" onClick={() => { setPicking(false); patch({ assigneeIds: [...(card.assigneeIds || []), g.id] }); }}>{g.name}</button>
                  ))}
                  {!guides.length && <p className="pmy-support-empty">{tr("Cadastre pessoas em Equipe.", "Add people in Team.")}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pmy-board-modal__section">
          <h4>{tr("Descrição", "Description")}</h4>
          {editing ? (
            <>
              <textarea className="pmy-ds-input pmy-support-text" rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder={isTask ? tr("Detalhes, contatos, valores...", "Details, contacts...") : tr("Instruções, contatos, regras de uso...", "Instructions, contacts, rules...")} />
              {!isTask && (
                <label className="pmy-support-check">
                  <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
                  {tr("Guias veem este documento no app", "Guides see this document in the app")}
                </label>
              )}
            </>
          ) : (
            card.body ? <p className="pmy-support-body">{card.body}</p> : <p className="pmy-support-empty">{tr("Sem descrição.", "No description.")}</p>
          )}
          {canEdit && (
            <div className="pmy-support-actions">
              {editing ? (
                <>
                  <button type="button" className="pmy-board-btn is-primary" disabled={busy || !title.trim()} onClick={saveText}>{isNew ? tr("Criar", "Create") : tr("Salvar", "Save")}</button>
                  <button type="button" className="pmy-board-btn" onClick={() => (isNew ? onClose() : (setEditing(false), setTitle(card.title), setBody(card.body || "")))}>{tr("Cancelar", "Cancel")}</button>
                </>
              ) : (
                <button type="button" className="pmy-board-btn" onClick={() => setEditing(true)}>{tr("Editar título e descrição", "Edit title and description")}</button>
              )}
            </div>
          )}
        </div>

        {!isNew && handlers.checklistOp && (
          <ChecklistEditor raw={cardChecklists(card.checklists)} onOp={(op) => handlers.checklistOp(card.id, op)} lang={lang} />
        )}

        {!isNew && (
          <div className="pmy-board-modal__section">
            <h4>{tr("Arquivos", "Files")}</h4>
            {!(card.attachments || []).length && <p className="pmy-support-empty">{tr("Nenhum arquivo ainda.", "No files yet.")}</p>}
            {loadImage && (card.attachments || []).some(isPreviewableImage) && (
              <div className="pmy-attach-thumbs">
                {(card.attachments || []).filter(isPreviewableImage).map((file) => (
                  <AuthedImage key={file.id} path={`/suporte/anexo/${file.id}`} loadImage={loadImage} alt={file.fileName} className="pmy-attach-thumb" onClick={() => handlers.openAttachment?.(file.id)} />
                ))}
              </div>
            )}
            <div className="pmy-departure-tags__files">
              {(card.attachments || []).map((file) => (
                <span key={file.id} className="pmy-departure-file">
                  <button type="button" className="pmy-departure-file__open" onClick={() => handlers.openAttachment?.(file.id)}>📎 {file.fileName}</button>
                  {handlers.removeAttachment && <button type="button" aria-label={tr(`Remover ${file.fileName}`, `Remove ${file.fileName}`)} onClick={() => run(() => handlers.removeAttachment(card.id, file.id))}>×</button>}
                </span>
              ))}
              {handlers.upload && (
                <label className="pmy-departure-file is-upload">
                  {busy ? tr("Enviando…", "Uploading…") : tr("+ Anexar PDF, imagem ou Word", "+ Attach file")}
                  <input type="file" accept="application/pdf,image/*,.docx" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) run(() => handlers.upload(card.id, f)); }} />
                </label>
              )}
            </div>
          </div>
        )}

        {links.length > 0 && (
          <div className="pmy-board-modal__section">
            <h4>{tr("Links", "Links")}</h4>
            <ul className="pmy-support-files">
              {links.map((link) => <li key={link.url}><a href={link.url} target="_blank" rel="noreferrer">🔗 {link.name}</a></li>)}
            </ul>
          </div>
        )}

        {!isNew && requestJson && (
          <ActivityPanel targetType="card" targetKey={card.id} requestJson={requestJson} refreshKey={JSON.stringify(card)} lang={lang} />
        )}

        {!isNew && handlers.remove && (
          <div className="pmy-support-actions">
            <button type="button" className="pmy-board-btn is-danger" disabled={busy}
              onClick={() => { if (window.confirm(tr(`Apagar "${card.title}" e os arquivos dele?`, `Delete "${card.title}"?`))) run(async () => { await handlers.remove(card.id); onClose(); }); }}>
              {isTask ? tr("Apagar demanda", "Delete task") : tr("Apagar documento", "Delete document")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Cartão de demanda na coluna do dia. */
export function TaskCard({ card, guides = [], loadImage = null, onOpen, lang = "pt" }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const progress = taskProgress(card);
  const people = (card.assigneeIds || []).map((id) => guides.find((g) => g.id === id)).filter(Boolean);
  return (
    <button type="button" className={`pmy-board-card pmy-task-card${card.done ? " is-done" : ""}`} onClick={onOpen}>
      <CardCover card={card} loadImage={loadImage} />
      <span className="pmy-task-card__badge">{card.done ? tr("✓ Demanda concluída", "✓ Task done") : tr("Demanda", "Task")}</span>
      <span className="pmy-board-card__title">{card.time && <b>{card.time}</b>} {card.title}</span>
      <span className="pmy-board-card__foot">
        <span className="pmy-board-card__badges">
          {card.body && <span title={tr("Tem descrição", "Has description")}>≡</span>}
          {(card.attachments || []).length > 0 && <span title={tr("Arquivos", "Files")}>📎 {card.attachments.length}</span>}
          {progress.total > 0 && <span className={`pmy-board-badge ${progress.done === progress.total ? "is-done" : ""}`}>☑ {progress.done}/{progress.total}</span>}
        </span>
        <span className="pmy-board-card__avatars">
          {people.map((g) => <i key={g.id} className="pmy-board-avatar" title={g.name} style={{ width: 24, height: 24, background: "#6e5dc6" }}>{initialsOf(g.name)}</i>)}
        </span>
      </span>
    </button>
  );
}

function CardCover({ card, loadImage }) {
  const cover = loadImage && (card.attachments || []).find(isPreviewableImage);
  return cover ? <AuthedImage path={`/suporte/anexo/${cover.id}`} loadImage={loadImage} className="pmy-board-card__cover" /> : null;
}

export function SupportColumn({ cards = [], guides = [], handlers = {}, loadImage = null, requestJson = null, lang = "pt" }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [openId, setOpenId] = useState(null); // id | "new"
  const docs = cards.filter((c) => !c.dateKey);
  const open = openId === "new" ? { title: "", body: "", visibleToGuides: true } : docs.find((c) => c.id === openId) || null;
  const canEdit = Boolean(handlers.save);
  if (!docs.length && !canEdit) return null;

  return (
    <div className="pmy-board__col is-support">
      <div className="pmy-board__col-head">
        <strong>{tr("Documentos de suporte", "Support documents")}</strong>
        <span>{docs.length}</span>
      </div>
      <div className="pmy-board__cards">
        {docs.map((card) => {
          const files = (card.attachments || []).length;
          const links = Array.isArray(card.links) ? card.links.length : 0;
          return (
            <button key={card.id} type="button" className="pmy-board-card pmy-support-card" onClick={() => setOpenId(card.id)}>
              <CardCover card={card} loadImage={loadImage} />
              <span className="pmy-board-card__title">{card.title}</span>
              <span className="pmy-board-card__foot">
                <span className="pmy-board-card__badges">
                  {card.body && <span title={tr("Tem descrição", "Has description")}>≡</span>}
                  {files > 0 && <span title={tr("Arquivos", "Files")}>📄 {files}</span>}
                  {links > 0 && <span title={tr("Links", "Links")}>🔗 {links}</span>}
                  {card.visibleToGuides === false && <span className="pmy-board-badge" title={tr("Só a equipe vê", "Team only")}>🔒</span>}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {canEdit && <button type="button" className="pmy-board__add" onClick={() => setOpenId("new")}>+ {tr("Adicionar documento", "Add document")}</button>}
      {open && (
        <SupportModal key={open.id || "new"} card={open} guides={guides} handlers={handlers} loadImage={loadImage} requestJson={requestJson} lang={lang} onClose={(nextId) => setOpenId(nextId || null)} />
      )}
    </div>
  );
}

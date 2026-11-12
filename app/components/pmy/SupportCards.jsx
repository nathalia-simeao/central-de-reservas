// Coluna fixa "Documentos de suporte" do Quadro (veio da lista "Doc Suportc"
// do Trello): passes, vouchers, instruções do cacifo, mensagens-modelo.
// Administradores editam e anexam arquivos; o resto da equipe só consulta.

import { useState } from "react";

function SupportModal({ card, canEdit, onSave, onDelete, onUpload, onRemoveAttachment, onOpenAttachment, onClose, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const isNew = !card.id;
  const [editing, setEditing] = useState(isNew);
  const [title, setTitle] = useState(card.title || "");
  const [body, setBody] = useState(card.body || "");
  const [visible, setVisible] = useState(card.visibleToGuides !== false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try { await fn(); } catch (e) { setError(e?.message || tr("Não foi possível salvar.", "Could not save.")); }
    setBusy(false);
  };
  const save = () => run(async () => {
    const saved = await onSave({ id: card.id, title, body, visibleToGuides: visible });
    if (isNew) onClose(saved?.id || null); else setEditing(false);
  });
  const links = Array.isArray(card.links) ? card.links : [];
  const checklists = Array.isArray(card.checklists) ? card.checklists : [];

  return (
    <div className="pmy-board-modal">
      <button type="button" className="pmy-board-modal__backdrop" aria-label={tr("Fechar", "Close")} tabIndex={-1} onClick={() => onClose()} />
      <div className="pmy-board-modal__card pmy-support-modal" role="dialog" aria-modal="true" aria-label={card.title || tr("Novo documento", "New document")}>
        <div className="pmy-board-modal__head">
          <div>
            <small>{tr("Documentos de suporte", "Support documents")}</small>
            {editing
              ? <input className="pmy-ds-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tr("Título (ex.: Voucher Pastéis)", "Title")} aria-label={tr("Título", "Title")} />
              : <h3>{card.title}</h3>}
          </div>
          <button type="button" className="pmy-board-pop__icon" aria-label={tr("Fechar", "Close")} onClick={() => onClose()}>×</button>
        </div>

        {error && <p className="pmy-support-error" role="alert">{error}</p>}

        <div className="pmy-board-modal__section">
          <h4>{tr("Descrição", "Description")}</h4>
          {editing ? (
            <>
              <textarea className="pmy-ds-input pmy-support-text" rows={7} value={body} onChange={(e) => setBody(e.target.value)} placeholder={tr("Instruções, contatos, regras de uso...", "Instructions, contacts, rules...")} />
              <label className="pmy-support-check">
                <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
                {tr("Guias veem este documento no app", "Guides see this document in the app")}
              </label>
            </>
          ) : (
            card.body ? <p className="pmy-support-body">{card.body}</p> : <p className="pmy-support-empty">{tr("Sem descrição.", "No description.")}</p>
          )}
        </div>

        {!isNew && (
          <div className="pmy-board-modal__section">
            <h4>{tr("Arquivos", "Files")}</h4>
            {!(card.attachments || []).length && <p className="pmy-support-empty">{tr("Nenhum arquivo na Central ainda.", "No files yet.")}</p>}
            <ul className="pmy-support-files">
              {(card.attachments || []).map((file) => (
                <li key={file.id}>
                  <button type="button" className="pmy-support-file" onClick={() => onOpenAttachment(file.id)}>📄 {file.fileName}</button>
                  {canEdit && <button type="button" className="pmy-board-pop__icon" aria-label={tr(`Remover ${file.fileName}`, `Remove ${file.fileName}`)} onClick={() => run(() => onRemoveAttachment(card.id, file.id))}>×</button>}
                </li>
              ))}
            </ul>
            {canEdit && (
              <label className="pmy-board-btn pmy-support-upload">
                {busy ? tr("Enviando…", "Uploading…") : tr("Anexar PDF ou imagem", "Attach PDF or image")}
                <input type="file" accept="application/pdf,image/*" hidden disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) run(() => onUpload(card.id, f)); }} />
              </label>
            )}
          </div>
        )}

        {links.length > 0 && (
          <div className="pmy-board-modal__section">
            <h4>{tr("Anexos que ficaram no Trello", "Files still on Trello")}</h4>
            <p className="pmy-support-empty">{tr("Abrem só para quem tem login no Trello. Para os guias verem, baixe e anexe acima.", "Only open for Trello members. Download and attach above for guides.")}</p>
            <ul className="pmy-support-files">
              {links.map((link) => <li key={link.url}><a href={link.url} target="_blank" rel="noreferrer">🔗 {link.name}</a></li>)}
            </ul>
          </div>
        )}

        {checklists.map((list, i) => (
          <div key={i} className="pmy-board-modal__section">
            <h4>{list.title}</h4>
            <ul className="pmy-support-files">
              {(list.items || []).map((item, j) => <li key={j}>{item.done ? "☑" : "☐"} {item.text}</li>)}
            </ul>
          </div>
        ))}

        {canEdit && (
          <div className="pmy-support-actions">
            {editing ? (
              <>
                <button type="button" className="pmy-board-btn is-primary" disabled={busy || !title.trim()} onClick={save}>{tr("Salvar", "Save")}</button>
                {!isNew && <button type="button" className="pmy-board-btn" onClick={() => { setEditing(false); setTitle(card.title); setBody(card.body || ""); }}>{tr("Cancelar", "Cancel")}</button>}
              </>
            ) : (
              <button type="button" className="pmy-board-btn" onClick={() => setEditing(true)}>{tr("Editar", "Edit")}</button>
            )}
            {!isNew && (
              <button type="button" className="pmy-board-btn is-danger" disabled={busy}
                onClick={() => { if (window.confirm(tr(`Apagar "${card.title}" e os arquivos dele?`, `Delete "${card.title}"?`))) run(async () => { await onDelete(card.id); onClose(); }); }}>
                {tr("Apagar documento", "Delete document")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function SupportColumn({ cards = [], canEdit = false, handlers = {}, lang = "pt" }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [openId, setOpenId] = useState(null); // id | "new"
  const open = openId === "new" ? { title: "", body: "", visibleToGuides: true } : cards.find((c) => c.id === openId) || null;
  if (!cards.length && !canEdit) return null;

  return (
    <div className="pmy-board__col is-support">
      <div className="pmy-board__col-head">
        <strong>{tr("Documentos de suporte", "Support documents")}</strong>
        <span>{cards.length}</span>
      </div>
      <div className="pmy-board__cards">
        {cards.map((card) => {
          const files = (card.attachments || []).length;
          const links = Array.isArray(card.links) ? card.links.length : 0;
          return (
            <button key={card.id} type="button" className="pmy-board-card pmy-support-card" onClick={() => setOpenId(card.id)}>
              <span className="pmy-board-card__title">{card.title}</span>
              <span className="pmy-board-card__foot">
                <span className="pmy-board-card__badges">
                  {card.body && <span title={tr("Tem descrição", "Has description")}>≡</span>}
                  {files > 0 && <span title={tr("Arquivos na Central", "Files")}>📄 {files}</span>}
                  {links > 0 && <span title={tr("Anexos no Trello", "Trello files")}>🔗 {links}</span>}
                  {card.visibleToGuides === false && <span className="pmy-board-badge" title={tr("Só a equipe vê", "Team only")}>🔒</span>}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {canEdit && <button type="button" className="pmy-board__add" onClick={() => setOpenId("new")}>+ {tr("Adicionar documento", "Add document")}</button>}
      {open && (
        <SupportModal
          key={open.id || "new"}
          card={open}
          canEdit={canEdit}
          lang={lang}
          onClose={(nextId) => setOpenId(nextId || null)}
          onSave={handlers.save}
          onDelete={handlers.remove}
          onUpload={handlers.upload}
          onRemoveAttachment={handlers.removeAttachment}
          onOpenAttachment={handlers.openAttachment}
        />
      )}
    </div>
  );
}

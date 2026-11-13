// Checklists do Quadro (formato do Trello): bloco de um checklist e o editor
// com vários. Usado nas saídas (AgendaBoard) e nas demandas (SupportCards).
import { useEffect, useRef, useState } from "react";
import PhoneText from "./PhoneText";
import { isClientItem, listPeopleSummary, normalizeChecklists } from "../../utils/departure-checklists.js";
import { CHECKLIST_PLATFORMS, checklistPlatform } from "../../utils/checklist-platforms.js";

/** Selo da plataforma do cliente (GYG, VT, HD…). */
export function PlatformBadge({ platform, className = "" }) {
  const info = checklistPlatform(platform);
  if (!info) return null;
  return <span className={`pmy-plat ${className}`} style={{ background: info.color }} title={info.name}>{info.label}</span>;
}

/** Escolher a plataforma: lista curta de selos coloridos (sem select nativo). */
export function PlatformPicker({ value, onChange, lang = "pt", disabled = false, compact = false }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const current = checklistPlatform(value);
  return (
    <span className={`pmy-plat-picker${compact ? " is-compact" : ""}`} ref={boxRef} role="presentation" onClick={(e) => e.preventDefault()}>
      <button type="button" className={current ? "pmy-plat-picker__current" : "pmy-plat-picker__empty"} disabled={disabled}
        aria-haspopup="true" aria-expanded={open}
        aria-label={current ? tr(`Plataforma: ${current.name}. Trocar`, `Platform: ${current.name}. Change`) : tr("Escolher plataforma do cliente", "Choose the guest's platform")}
        title={current ? current.name : tr("Plataforma do cliente", "Guest's platform")}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}>
        {current ? <PlatformBadge platform={current.key} /> : tr("+ plataforma", "+ platform")}
      </button>
      {open && (
        <span className="pmy-plat-picker__menu" role="menu">
          {CHECKLIST_PLATFORMS.map((p) => (
            <button key={p.key} type="button" role="menuitemradio" aria-checked={p.key === current?.key} aria-label={p.name} title={p.name}
              className={p.key === current?.key ? "is-on" : ""}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onChange(p.key); }}>
              <PlatformBadge platform={p.key} />
            </button>
          ))}
          {current && (
            <button type="button" role="menuitem" className="pmy-plat-picker__clear"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onChange(""); }}>
              {tr("Sem plataforma", "No platform")}
            </button>
          )}
        </span>
      )}
    </span>
  );
}

export function FocusInput(props) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return <input ref={ref} {...props} />;
}

// Texto que vira campo ao clicar em ✎ (Enter salva, Esc cancela).
export function EditableText({ value, onSave, label, className = "", lang, render = null }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const savedRef = useRef(false);
  if (!editing) {
    return (
      <span className={`pmy-editable ${className}`}>
        <span>{render ? render(value) : value}</span>
        {onSave && (
          <button type="button" className="pmy-editable__btn" aria-label={label || tr("Editar", "Edit")} title={label || tr("Editar", "Edit")}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); savedRef.current = false; setDraft(value); setEditing(true); }}>✎</button>
        )}
      </span>
    );
  }
  const save = async () => {
    if (savedRef.current) return; // Enter e o blur logo depois: salva uma vez só
    savedRef.current = true;
    const text = draft.trim();
    setEditing(false);
    if (text && text !== value) await onSave(text);
  };
  return (
    <span className={`pmy-editable is-editing ${className}`} onClick={(e) => e.preventDefault()} role="presentation">
      <FocusInput value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={label}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } if (e.key === "Escape") { e.preventDefault(); savedRef.current = true; setEditing(false); } }}
        onBlur={save} />
    </span>
  );
}

export function ChecklistBlock({ list, isDone, hidden, onToggle, onToggleHide, onDelete, onAddItem, onDeleteItem, onMoveItem, onEditItem, onSetPlatform, onSetNoShow, onRename, drag, setDrag, busy, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [platform, setPlatform] = useState("");
  const total = list.items.length;
  const done = list.items.filter(isDone).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const items = hidden ? list.items.filter((item) => !isDone(item)) : list.items;
  const submit = async () => { if (!text.trim()) return; await onAddItem(text, platform); setText(""); setPlatform(""); };
  return (
    <div className={`pmy-checklist${onMoveItem && drag?.over === `${list.id}:end` ? " is-drop" : ""}`}
      onDragOver={onMoveItem && drag ? (e) => { e.preventDefault(); if (e.target === e.currentTarget || !e.target.closest(".pmy-checklist__item")) { if (drag.over !== `${list.id}:end`) setDrag({ ...drag, over: `${list.id}:end` }); } } : undefined}
      onDrop={onMoveItem && drag ? (e) => {
        // Soltou fora de um item (título, barra, espaço): vai para o fim deste checklist.
        if (e.defaultPrevented) return;
        e.preventDefault();
        const from = drag;
        setDrag(null);
        const fromIndex = list.items.findIndex((i) => i.id === from.itemId);
        onMoveItem(from, list.id, fromIndex >= 0 ? list.items.length - 1 : list.items.length);
      } : undefined}>
      <div className="pmy-checklist__head">
        <span className="pmy-checklist__icon" aria-hidden="true">☑</span>
        <strong>{onRename ? <EditableText value={list.title} onSave={onRename} label={tr("Editar título do checklist", "Edit checklist title")} lang={lang} /> : list.title}</strong>
        {(() => { const people = listPeopleSummary(list.items); return people.total > 0 && <small className="pmy-checklist__people" title={tr("Pessoas neste checklist (A adulto, S sênior, Y jovem, C criança)", "People in this checklist (A adult, S senior, Y youth, C child)")}>{lang === "en" ? people.label.replace("pessoas", "people").replace("pessoa", "person") : people.label}</small>; })()}
        {list.auto && <small className="pmy-checklist__auto" title={tr("Criado sozinho a partir das reservas confirmadas", "Built from confirmed bookings")}>{tr("automático", "automatic")}</small>}
        <span className="pmy-checklist__actions">
          {done > 0 && <button type="button" className="pmy-board-btn" onClick={onToggleHide}>{hidden ? tr(`Mostrar itens marcados (${done})`, `Show checked items (${done})`) : tr("Ocultar itens marcados", "Hide checked items")}</button>}
          {onDelete && <button type="button" className="pmy-board-btn" disabled={busy} onClick={onDelete}>{tr("Excluir", "Delete")}</button>}
        </span>
      </div>
      <div className="pmy-checklist__progress">
        <small>{pct}%</small>
        <span><i style={{ width: `${pct}%` }} className={pct === 100 ? "is-done" : ""} /></span>
      </div>
      {items.map((item) => {
        const on = isDone(item);
        const index = list.items.indexOf(item);
        const canMove = Boolean(onMoveItem);
        const isOver = drag?.over === `${list.id}:${item.id}`;
        return (
          <label key={item.key || item.id}
            className={`pmy-checklist__item ${on ? "is-done" : ""}${canMove ? " is-movable" : ""}${drag?.itemId === item.id ? " is-dragging" : ""}${isOver ? " is-over" : ""}`}
            title={item.by ? `${item.by}` : undefined}
            draggable={canMove && !busy}
            onDragStart={canMove ? (e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", item.id); setDrag({ listId: list.id, itemId: item.id }); } : undefined}
            onDragEnd={canMove ? () => setDrag(null) : undefined}
            onDragOver={canMove && drag ? (e) => { e.preventDefault(); e.stopPropagation(); if (!isOver) setDrag({ ...drag, over: `${list.id}:${item.id}` }); } : undefined}
            onDrop={canMove && drag ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              // Solta "em cima" de um item: ocupa o lugar dele.
              const from = drag;
              setDrag(null);
              if (from.itemId !== item.id) onMoveItem(from, list.id, index);
            } : undefined}>
            {canMove && <span className="pmy-checklist__grip" aria-hidden="true">⋮⋮</span>}
            <input type="checkbox" checked={on} disabled={busy} onChange={() => onToggle(item)} />
            {onEditItem
              ? <EditableText value={item.text} onSave={(text) => onEditItem(item, text)} label={tr("Editar item", "Edit item")} lang={lang} className="pmy-checklist__text" render={(v) => <PhoneText text={v} lang={lang} />} />
              : <span className="pmy-checklist__text"><PhoneText text={item.text} lang={lang} /></span>}
            {onSetNoShow && isClientItem(item.text)
              ? <button type="button" className={`pmy-checklist__noshow-btn${item.noShow ? " is-on" : ""}`} aria-pressed={Boolean(item.noShow)} disabled={busy}
                  title={item.noShow && item.noShowBy ? `${tr("Marcado por", "Marked by")} ${item.noShowBy}` : tr("Cliente não apareceu", "Customer didn't show up")}
                  onClick={() => onSetNoShow(item, !item.noShow)}>No-show</button>
              : item.noShow && <span className="pmy-checklist__noshow" title={item.noShowBy ? `${tr("Marcado por", "Marked by")} ${item.noShowBy}` : undefined}>No-show</span>}
            {onSetPlatform
              ? <PlatformPicker value={item.platform} onChange={(key) => onSetPlatform(item, key)} disabled={busy} lang={lang} compact />
              : <PlatformBadge platform={item.platform} />}
            {canMove && (
              <span className="pmy-checklist__move">
                <button type="button" aria-label={tr("Subir item", "Move up")} disabled={busy || index === 0}
                  onClick={(e) => { e.preventDefault(); onMoveItem({ listId: list.id, itemId: item.id }, list.id, index - 1); }}>↑</button>
                <button type="button" aria-label={tr("Descer item", "Move down")} disabled={busy || index === list.items.length - 1}
                  onClick={(e) => { e.preventDefault(); onMoveItem({ listId: list.id, itemId: item.id }, list.id, index + 1); }}>↓</button>
              </span>
            )}
            {onDeleteItem && (
              <button type="button" className="pmy-checklist__del" aria-label={tr("Apagar item", "Delete item")} disabled={busy} onClick={(e) => { e.preventDefault(); onDeleteItem(item); }}>×</button>
            )}
          </label>
        );
      })}
      {hidden && done > 0 && !items.length && <p className="pmy-board-pop__empty">{tr("Tudo marcado ✓", "All checked ✓")}</p>}
      {onAddItem && (adding ? (
        <div className="pmy-checklist__add">
          <div className="pmy-checklist__add-row">
            <FocusInput value={text} onChange={(e) => setText(e.target.value)} placeholder={tr("Adicionar um item (ex.: Caroline (1A) +44 7747…)", "Add an item")}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } if (e.key === "Escape") setAdding(false); }} />
            <PlatformPicker value={platform} onChange={setPlatform} lang={lang} />
          </div>
          <div className="pmy-board-pop__actions">
            <button type="button" className="pmy-board-btn is-primary" disabled={busy || !text.trim()} onClick={submit}>{tr("Adicionar", "Add")}</button>
            <button type="button" className="pmy-board-btn" onClick={() => { setAdding(false); setText(""); }}>{tr("Cancelar", "Cancel")}</button>
          </div>
        </div>
      ) : (
        <button type="button" className="pmy-board-btn pmy-checklist__add-btn" onClick={() => setAdding(true)}>{tr("Adicionar um item", "Add an item")}</button>
      ))}
    </div>
  );
}


/** Checklists editáveis (criar, marcar, arrastar, editar) — saídas e demandas do Quadro. */
export function ChecklistEditor({ raw, onOp, lang = "pt", before = null, empty = "" }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const state = normalizeChecklists(raw);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [drag, setDrag] = useState(null); // { listId, itemId, over }
  const run = async (op) => {
    setBusy(true);
    setError("");
    try { await onOp(op); } catch (e) { setError(e?.message || tr("Não foi possível salvar.", "Could not save.")); }
    finally { setBusy(false); }
  };
  const hasBefore = Array.isArray(before) ? before.length > 0 : Boolean(before);
  return (
    <div className="pmy-board-modal__section">
      <div className="pmy-checklist__section-head">
        <span className="pmy-board-pop__sub">{tr("Checklists", "Checklists")}</span>
        <button type="button" className="pmy-board-btn" onClick={() => setCreating(!creating)}>{tr("+ Checklist", "+ Checklist")}</button>
      </div>
      {error && <p role="alert" className="pmy-board-pop__error">{error}</p>}
      {creating && (
        <div className="pmy-checklist__add">
          <FocusInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tr("Título (ex.: Ingressos, 10h ESP (3p) 3A Dee)", "Title")}
            onKeyDown={async (e) => { if (e.key === "Enter" && title.trim()) { e.preventDefault(); await run({ type: "addList", title }); setTitle(""); setCreating(false); } }} />
          <div className="pmy-board-pop__actions">
            <button type="button" className="pmy-board-btn is-primary" disabled={busy || !title.trim()} onClick={async () => { await run({ type: "addList", title }); setTitle(""); setCreating(false); }}>{tr("Adicionar", "Add")}</button>
            <button type="button" className="pmy-board-btn" onClick={() => setCreating(false)}>{tr("Cancelar", "Cancel")}</button>
          </div>
        </div>
      )}
      {!hasBefore && !state.lists.length && !creating && empty && <p className="pmy-board-pop__empty">{empty}</p>}
      {before}
      {state.lists.map((list) => (
        <ChecklistBlock key={list.id} list={list} busy={busy} lang={lang}
          hidden={Boolean(state.hideDone[list.id])}
          isDone={(item) => item.done}
          onToggle={(item) => run({ type: "toggleItem", listId: list.id, itemId: item.id })}
          onToggleHide={() => run({ type: "toggleHideDone", listId: list.id })}
          onDelete={() => { if (typeof window === "undefined" || window.confirm(tr("Excluir este checklist?", "Delete this checklist?"))) run({ type: "deleteList", listId: list.id }); }}
          onAddItem={(text, platform) => run({ type: "addItem", listId: list.id, text, platform })}
          onSetPlatform={(item, platform) => run({ type: "editItem", listId: list.id, itemId: item.id, platform })}
          onSetNoShow={(item, value) => run({ type: "setNoShow", listId: list.id, itemId: item.id, value })}
          onDeleteItem={(item) => run({ type: "deleteItem", listId: list.id, itemId: item.id })}
          drag={drag} setDrag={setDrag}
          onEditItem={(item, text) => run({ type: "editItem", listId: list.id, itemId: item.id, text })}
          onRename={(text) => run({ type: "renameList", listId: list.id, title: text })}
          onMoveItem={(from, toListId, toIndex) => run({ type: "moveItem", listId: from.listId, itemId: from.itemId, toListId, toIndex })} />
      ))}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { AGENDA_PICKER_PALETTE, contrastText, normalizeAgendaLabels, tourColor } from "../../utils/agenda-labels.js";
import { addDays, buildBoardColumns, cardLabelIds, initials } from "../../utils/agenda-board.js";
import { languageLabel } from "../../utils/tour-languages.js";
import DepartureTagsSection from "./DepartureTagsSection";
import { DatePicker } from "./PmyUI";
import { autoChecklists, checklistProgress, normalizeChecklists } from "../../utils/departure-checklists.js";

// Agenda → Quadro: a operação no formato do Trello que a equipe já usa.
// Uma coluna por data, um cartão por saída, etiquetas coloridas, guias no cartão.

const DAYS = 14;
const LANG_KEYS = ["en", "pt", "es", "fr", "it", "de"];

function todayLisbon() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

function columnTitle(dateKey, lang) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const weekday = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pt-PT", { weekday: "long", timeZone: "UTC" }).format(date);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")} (${weekday})`;
}

function guideColor(id) {
  let h = 0;
  for (const ch of String(id || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AGENDA_PICKER_PALETTE[h % AGENDA_PICKER_PALETTE.length];
}

function newId() {
  return `tag_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/* ---------- Etiquetas (popover igual ao do Trello) ---------- */
function LabelPopover({ labels, card, onToggleDeparture, onToggleTour, onSaveLabels, onClose, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const { tags, tours } = normalizeAgendaLabels(labels);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("departure");
  const [editing, setEditing] = useState(null); // { id?, name, color }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const tourKey = labels?.colorAliases?.[card.tourId] || card.tourId;
  const tourIds = tours[tourKey]?.tagIds || [];
  const selected = scope === "tour" ? tourIds : (card.tagIds || []);
  const shown = tags.filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase()));

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try { await fn(); } catch (e) { setError(e?.message || tr("Não foi possível salvar.", "Could not save.")); }
    finally { setBusy(false); }
  };

  const saveEditing = () => run(async () => {
    const current = normalizeAgendaLabels(labels);
    const name = editing.name.trim();
    if (editing.id) {
      await onSaveLabels({ ...current, tags: current.tags.map((t) => (t.id === editing.id ? { ...t, name, color: editing.color } : t)) });
    } else {
      const tag = { id: newId(), name, color: editing.color };
      await onSaveLabels({ ...current, tags: [...current.tags, tag] });
    }
    setEditing(null);
  });

  const removeEditing = () => run(async () => {
    if (typeof window !== "undefined" && !window.confirm(tr("Excluir esta etiqueta de todos os cartões?", "Delete this label from every card?"))) return;
    const current = normalizeAgendaLabels(labels);
    await onSaveLabels({ ...current, tags: current.tags.filter((t) => t.id !== editing.id) });
    setEditing(null);
  });

  return (
    <div className="pmy-board-pop" role="dialog" aria-label={tr("Etiquetas", "Labels")}>
      <div className="pmy-board-pop__head">
        {editing ? <button type="button" className="pmy-board-pop__icon" aria-label={tr("Voltar", "Back")} onClick={() => setEditing(null)}>‹</button> : <span />}
        <strong>{editing ? (editing.id ? tr("Editar etiqueta", "Edit label") : tr("Criar etiqueta", "Create label")) : tr("Etiquetas", "Labels")}</strong>
        <button type="button" className="pmy-board-pop__icon" aria-label={tr("Fechar", "Close")} onClick={onClose}>×</button>
      </div>
      {error && <p role="alert" className="pmy-board-pop__error">{error}</p>}

      {editing ? (
        <div className="pmy-board-pop__body">
          <div className="pmy-board-label is-preview" style={{ background: editing.color, color: contrastText(editing.color) }}>{editing.name || " "}</div>
          <label className="pmy-board-pop__field">
            {tr("Título", "Title")}
            <input autoFocus value={editing.name} maxLength={30} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder={tr("ex.: Pena, Regaleira, Transfer", "e.g. Pena, Regaleira, Transfer")} />
          </label>
          <span className="pmy-board-pop__sub">{tr("Selecionar uma cor", "Select a colour")}</span>
          <div className="pmy-board-pop__palette">
            {AGENDA_PICKER_PALETTE.map((c) => (
              <button key={c} type="button" className={c === editing.color ? "is-on" : ""} style={{ background: c }} aria-label={c} onClick={() => setEditing({ ...editing, color: c })} />
            ))}
          </div>
          <div className="pmy-board-pop__actions">
            <button type="button" className="pmy-board-btn is-primary" disabled={busy} onClick={saveEditing}>{editing.id ? tr("Salvar", "Save") : tr("Criar", "Create")}</button>
            {editing.id && <button type="button" className="pmy-board-btn is-danger" disabled={busy} onClick={removeEditing}>{tr("Excluir", "Delete")}</button>}
          </div>
        </div>
      ) : (
        <div className="pmy-board-pop__body">
          <input className="pmy-board-pop__search" placeholder={tr("Buscar etiquetas…", "Search labels…")} value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="pmy-board-pop__scope" role="group" aria-label={tr("Aplicar em", "Apply to")}>
            <button type="button" className={scope === "departure" ? "is-on" : ""} onClick={() => setScope("departure")}>{tr("Só esta saída", "This departure")}</button>
            <button type="button" className={scope === "tour" ? "is-on" : ""} onClick={() => setScope("tour")}>{tr("Todas as saídas do passeio", "Every departure of this tour")}</button>
          </div>
          <span className="pmy-board-pop__sub">{tr("Etiquetas", "Labels")}</span>
          {!tags.length && <p className="pmy-board-pop__empty">{tr("Nenhuma etiqueta ainda.", "No labels yet.")}</p>}
          {shown.map((tag) => {
            const fromTour = scope === "departure" && tourIds.includes(tag.id);
            const on = fromTour || selected.includes(tag.id);
            return (
              <div key={tag.id} className="pmy-board-pop__row" title={fromTour ? tr("Etiqueta do passeio (mude em \"Todas as saídas do passeio\")", "Tour label") : undefined}>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={busy || fromTour}
                  aria-label={tag.name || tag.color}
                  onChange={() => run(() => (scope === "tour" ? onToggleTour(tag.id) : onToggleDeparture(tag.id)))}
                />
                <button type="button" className="pmy-board-label" style={{ background: tag.color, color: contrastText(tag.color) }} disabled={busy || fromTour}
                  onClick={() => run(() => (scope === "tour" ? onToggleTour(tag.id) : onToggleDeparture(tag.id)))}>
                  {tag.name}
                </button>
                <button type="button" className="pmy-board-pop__icon" aria-label={tr("Editar", "Edit")} onClick={() => setEditing({ id: tag.id, name: tag.name, color: tag.color })}>✎</button>
              </div>
            );
          })}
          <button type="button" className="pmy-board-btn is-wide" onClick={() => setEditing({ name: "", color: AGENDA_PICKER_PALETTE[(tags.length * 7) % AGENDA_PICKER_PALETTE.length] })}>
            {tr("Criar uma nova etiqueta", "Create a new label")}
          </button>
          {scope === "tour" && (
            <p className="pmy-board-pop__hint">{tr("Etiquetas do passeio aparecem em todas as saídas dele — use para os destinos (ex.: Sintra = Pena + Regaleira + Transfer).", "Tour labels show on every departure — use them for destinations.")}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Guias no cartão ---------- */
function GuideAvatar({ guide, size = 28 }) {
  const photo = guide?.photo && !/placeholder/.test(guide.photo) ? guide.photo : null;
  return photo
    ? <img className="pmy-board-avatar" src={photo} alt="" style={{ width: size, height: size }} />
    : <i className="pmy-board-avatar" style={{ width: size, height: size, background: guideColor(guide?.id || guide?.guideId) }}>{initials(guide?.name)}</i>;
}

// Lista de guias no estilo "Membros" do Trello: busca, foto/iniciais, ✓ em quem já está.
function GuideMenu({ guides, assignedIds = [], withLanguages = true, onPick, onUnpick, onClose, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(null);
  const [languages, setLanguages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const q = query.trim().toLowerCase();
  const list = guides.filter((g) => String(g.name || "").toLowerCase().includes(q));
  const assigned = list.filter((g) => assignedIds.includes(g.id));
  const others = list.filter((g) => !assignedIds.includes(g.id));
  const run = async (fn) => {
    setBusy(true);
    setError("");
    try { await fn(); } catch (e) { setError(e?.message || tr("Não foi possível salvar.", "Could not save.")); }
    finally { setBusy(false); }
  };
  const pick = (guide) => {
    if (!withLanguages) { onPick(guide, []); onClose?.(); return; }
    setPending(pending?.id === guide.id ? null : guide);
    setLanguages([]);
  };
  const row = (guide, on) => (
    <div key={guide.id} className={`pmy-board-member ${pending?.id === guide.id ? "is-open" : ""}`}>
      <button type="button" className="pmy-board-member__main" disabled={busy}
        onClick={() => (on ? run(() => onUnpick(guide)) : pick(guide))}>
        <GuideAvatar guide={guide} />
        <span>{guide.name}</span>
        <b aria-hidden="true">{on ? "✓" : ""}</b>
      </button>
      {pending?.id === guide.id && (
        <div className="pmy-board-member__langs">
          <span>{tr("Idioma do grupo (opcional):", "Group language (optional):")}</span>
          <span className="pmy-board-guides__langs" role="group">
            {LANG_KEYS.map((k) => (
              <button key={k} type="button" className={languages.includes(k) ? "is-on" : ""} onClick={() => setLanguages((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))}>
                {languageLabel(k, lang)}
              </button>
            ))}
          </span>
          <button type="button" className="pmy-board-btn is-primary" disabled={busy}
            onClick={() => run(async () => { await onPick(guide, languages); setPending(null); setLanguages([]); })}>
            {busy ? "…" : tr(`Escalar ${String(guide.name).split(" ")[0]}`, `Assign ${String(guide.name).split(" ")[0]}`)}
          </button>
        </div>
      )}
    </div>
  );
  return (
    <div className="pmy-board-pop is-members" role="dialog" aria-label={tr("Guias", "Guides")}>
      <div className="pmy-board-pop__head">
        <span />
        <strong>{tr("Guias", "Guides")}</strong>
        <button type="button" className="pmy-board-pop__icon" aria-label={tr("Fechar", "Close")} onClick={onClose}>×</button>
      </div>
      <div className="pmy-board-pop__body">
        <input autoFocus className="pmy-board-pop__search" placeholder={tr("Buscar guia…", "Search guide…")} value={query} onChange={(e) => setQuery(e.target.value)} />
        {error && <p role="alert" className="pmy-board-pop__error">{error}</p>}
        {assigned.length > 0 && <span className="pmy-board-pop__sub">{tr("Neste cartão", "On this card")}</span>}
        {assigned.map((g) => row(g, true))}
        {others.length > 0 && <span className="pmy-board-pop__sub">{tr("Guias da equipe", "Team guides")}</span>}
        <div className="pmy-board-member__list">{others.map((g) => row(g, false))}</div>
        {!list.length && <p className="pmy-board-pop__empty">{tr("Nenhum guia encontrado.", "No guide found.")}</p>}
      </div>
    </div>
  );
}

function GuidePicker({ card, guides, onAssign, onRemove, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const byId = new Map(guides.map((g) => [g.id, g]));
  const assignedIds = card.guides.map((g) => g.guideId);
  const assignmentFor = (guideId) => card.guides.find((g) => g.guideId === guideId);
  return (
    <div className="pmy-board-guides">
      {error && <p role="alert" className="pmy-board-pop__error">{error}</p>}
      <div className="pmy-board-guides__row">
        {card.guides.map((g) => (
          <span key={g.assignmentId} className="pmy-board-guide">
            <GuideAvatar guide={{ ...(byId.get(g.guideId) || {}), id: g.guideId, name: g.name }} size={26} />
            {g.name}{g.languages.length ? ` · ${g.languages.map((k) => languageLabel(k, lang)).join(", ")}` : ""}
            <button type="button" aria-label={tr(`Tirar ${g.name}`, `Remove ${g.name}`)}
              onClick={async () => { setError(""); try { await onRemove(g.assignmentId); } catch (e) { setError(e?.message || ""); } }}>×</button>
          </span>
        ))}
        <button type="button" className="pmy-board-btn" onClick={() => setOpen(!open)}>{tr("+ Guia", "+ Guide")}</button>
      </div>
      {open && (
        <GuideMenu
          guides={guides}
          assignedIds={assignedIds}
          onPick={(guide, languages) => onAssign(card, guide.id, languages)}
          onUnpick={(guide) => onRemove(assignmentFor(guide.id)?.assignmentId)}
          onClose={() => setOpen(false)}
          lang={lang}
        />
      )}
      <small className="pmy-board-hint">{tr("Sem idioma marcado = o guia atende todos os idiomas da saída.", "No language = the guide covers every language.")}</small>
    </div>
  );
}

/* ---------- Novo cartão ---------- */
function AddCardForm({ dateKey, tours, guides, onAssign, onTag, onClose, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [tourId, setTourId] = useState("");
  const [time, setTime] = useState("10:00");
  const [guideId, setGuideId] = useState("");
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (!tourId || !time) { setError(tr("Escolha o passeio e o horário.", "Choose tour and time.")); return; }
    if (!guideId) { setError(tr("Escolha o guia para criar o cartão.", "Choose a guide to create the card.")); return; }
    setBusy(true);
    setError("");
    try {
      await onAssign({ tourId, dateKey, time, guideId, languages: [] });
      onClose();
    } catch (e) {
      setError(e?.message || tr("Não foi possível criar.", "Could not create."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="pmy-board-add">
      <select value={tourId} onChange={(e) => setTourId(e.target.value)} aria-label={tr("Passeio", "Tour")}>
        <option value="">{tr("Passeio…", "Tour…")}</option>
        {tours.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
      </select>
      <div className="pmy-board-add__row">
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label={tr("Horário", "Time")} />
        <button type="button" className="pmy-board-pick" onClick={() => setPicking(!picking)}>
          {guideId ? <><GuideAvatar guide={guides.find((g) => g.id === guideId)} size={22} /> {guides.find((g) => g.id === guideId)?.name}</> : tr("Escolher guia…", "Choose guide…")}
        </button>
      </div>
      {picking && (
        <GuideMenu guides={guides} assignedIds={guideId ? [guideId] : []} withLanguages={false}
          onPick={(g) => setGuideId(g.id)} onUnpick={() => setGuideId("")} onClose={() => setPicking(false)} lang={lang} />
      )}
      {error && <p role="alert" className="pmy-board-pop__error">{error}</p>}
      <div className="pmy-board-pop__actions">
        <button type="button" className="pmy-board-btn is-primary" disabled={busy} onClick={submit}>{busy ? "…" : tr("Adicionar cartão", "Add card")}</button>
        <button type="button" className="pmy-board-pop__icon" aria-label={tr("Cancelar", "Cancel")} onClick={onClose}>×</button>
      </div>
    </div>
  );
}

/* ---------- Checklists (igual ao Trello) ---------- */
function ChecklistBlock({ list, isDone, hidden, onToggle, onToggleHide, onDelete, onAddItem, onDeleteItem, busy, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const total = list.items.length;
  const done = list.items.filter(isDone).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const items = hidden ? list.items.filter((item) => !isDone(item)) : list.items;
  const submit = async () => { if (!text.trim()) return; await onAddItem(text); setText(""); };
  return (
    <div className="pmy-checklist">
      <div className="pmy-checklist__head">
        <span className="pmy-checklist__icon" aria-hidden="true">☑</span>
        <strong>{list.title}</strong>
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
        return (
          <label key={item.key || item.id} className={`pmy-checklist__item ${on ? "is-done" : ""}`} title={item.by ? `${item.by}` : undefined}>
            <input type="checkbox" checked={on} disabled={busy} onChange={() => onToggle(item)} />
            <span>{item.text}</span>
            {onDeleteItem && (
              <button type="button" className="pmy-checklist__del" aria-label={tr("Apagar item", "Delete item")} disabled={busy} onClick={(e) => { e.preventDefault(); onDeleteItem(item); }}>×</button>
            )}
          </label>
        );
      })}
      {hidden && done > 0 && !items.length && <p className="pmy-board-pop__empty">{tr("Tudo marcado ✓", "All checked ✓")}</p>}
      {onAddItem && (adding ? (
        <div className="pmy-checklist__add">
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={tr("Adicionar um item", "Add an item")}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } if (e.key === "Escape") setAdding(false); }} />
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

function ChecklistSection({ card, raw, onOp, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const state = normalizeChecklists(raw);
  const autos = autoChecklists(card);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const run = async (op) => {
    setBusy(true);
    setError("");
    try { await onOp(op); } catch (e) { setError(e?.message || tr("Não foi possível salvar.", "Could not save.")); }
    finally { setBusy(false); }
  };
  return (
    <div className="pmy-board-modal__section">
      <div className="pmy-checklist__section-head">
        <span className="pmy-board-pop__sub">{tr("Checklists", "Checklists")}</span>
        <button type="button" className="pmy-board-btn" onClick={() => setCreating(!creating)}>{tr("+ Checklist", "+ Checklist")}</button>
      </div>
      {error && <p role="alert" className="pmy-board-pop__error">{error}</p>}
      {creating && (
        <div className="pmy-checklist__add">
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tr("Título (ex.: Ingressos, 10h ESP (3p) 3A Dee)", "Title")}
            onKeyDown={async (e) => { if (e.key === "Enter" && title.trim()) { e.preventDefault(); await run({ type: "addList", title }); setTitle(""); setCreating(false); } }} />
          <div className="pmy-board-pop__actions">
            <button type="button" className="pmy-board-btn is-primary" disabled={busy || !title.trim()} onClick={async () => { await run({ type: "addList", title }); setTitle(""); setCreating(false); }}>{tr("Adicionar", "Add")}</button>
            <button type="button" className="pmy-board-btn" onClick={() => setCreating(false)}>{tr("Cancelar", "Cancel")}</button>
          </div>
        </div>
      )}
      {!autos.length && !state.lists.length && !creating && (
        <p className="pmy-board-pop__empty">{tr("Quando entrar reserva confirmada, o checklist do grupo aparece aqui sozinho (Pronto · clientes · Fim de tour). Também dá para criar um manual.", "A checklist per group appears here automatically once a booking is confirmed.")}</p>
      )}
      {autos.map((list) => (
        <ChecklistBlock key={list.id} list={list} busy={busy} lang={lang}
          hidden={Boolean(state.hideDone[list.id])}
          isDone={(item) => Boolean(state.auto[item.key]?.done)}
          onToggle={(item) => run({ type: "toggleAuto", key: item.key })}
          onToggleHide={() => run({ type: "toggleHideDone", listId: list.id })} />
      ))}
      {state.lists.map((list) => (
        <ChecklistBlock key={list.id} list={list} busy={busy} lang={lang}
          hidden={Boolean(state.hideDone[list.id])}
          isDone={(item) => item.done}
          onToggle={(item) => run({ type: "toggleItem", listId: list.id, itemId: item.id })}
          onToggleHide={() => run({ type: "toggleHideDone", listId: list.id })}
          onDelete={() => { if (typeof window === "undefined" || window.confirm(tr("Excluir este checklist?", "Delete this checklist?"))) run({ type: "deleteList", listId: list.id }); }}
          onAddItem={(text) => run({ type: "addItem", listId: list.id, text })}
          onDeleteItem={(item) => run({ type: "deleteItem", listId: list.id, itemId: item.id })} />
      ))}
    </div>
  );
}

/* ---------- Mover saída (só administradores) ---------- */
const CENTRAL_CHANNELS = new Set(["MANUAL", "CENTRAL", "SHOPIFY", "GUIDE"]);

function MoveDialog({ move, columns, onConfirm, onCancel, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [dateKey, setDateKey] = useState(move.dateKey);
  const [timeKey, setTimeKey] = useState(move.timeKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { card } = move;
  const external = card.bookings.filter((b) => !CENTRAL_CHANNELS.has(String(b.platform || "").toUpperCase()));
  const channels = [...new Set(external.map((b) => b.platform))];
  const target = columns.find((c) => c.dateKey === dateKey)?.cards.find((c) => c.tourId === card.tourId && c.timeKey === timeKey && c.key !== card.key);
  const unchanged = dateKey === card.dateKey && timeKey === card.timeKey;
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(timeKey);

  const confirm = async () => {
    setBusy(true);
    setError("");
    try { await onConfirm({ card, dateKey, timeKey }); }
    catch (e) { setError(e?.message || tr("Não foi possível mover a saída.", "Unable to move the departure.")); setBusy(false); }
  };

  return (
    <div className="pmy-board-modal" role="dialog" aria-modal="true" aria-label={tr("Mover saída", "Move departure")}>
      <div className="pmy-board-modal__card pmy-board-move">
        <div className="pmy-board-modal__head">
          <div>
            <h3>{tr("Mover saída", "Move departure")}</h3>
            <p>{card.title} · {columnTitle(card.dateKey, lang)} · {card.timeKey}</p>
          </div>
          <button type="button" className="pmy-board-pop__icon" aria-label={tr("Fechar", "Close")} disabled={busy} onClick={onCancel}>×</button>
        </div>
        <div className="pmy-board-move__fields">
          <label className="pmy-board-pop__field">
            {tr("Nova data", "New date")}
            <DatePicker
              value={dateKey}
              onChange={(e) => { const v = e?.target?.value ?? e; if (v) setDateKey(v); }}
              locale={lang === "en" ? "en-GB" : "pt-PT"}
              placeholder={lang === "en" ? "dd/mm/yyyy" : "dd/mm/aaaa"}
              todayLabel={tr("Hoje", "Today")}
              clearLabel={tr("Limpar", "Clear")}
            />
          </label>
          <label className="pmy-board-pop__field">
            {tr("Horário", "Time")}
            <input type="time" value={timeKey} onChange={(e) => setTimeKey(e.target.value)} />
          </label>
        </div>
        <ul className="pmy-board-move__summary">
          <li>{tr("Vão junto", "Moving along")}: {card.bookings.length} {tr("reserva(s)", "booking(s)")} ({card.pax + card.pending} {tr("pessoas", "people")}), {card.guides.length} {tr("guia(s)", "guide(s)")}, {tr("etiquetas, checklists, observações e anexos", "labels, checklists, notes and attachments")}.</li>
          {target && <li>{tr(`Já existe essa saída na data escolhida (${target.pax} pessoas). As duas vão virar uma só.`, `This departure already exists on that date (${target.pax} people). Both will be merged.`)}</li>}
        </ul>
        {channels.length > 0 && (
          <p className="pmy-board-move__warn" role="note">
            {tr(
              `Atenção: ${external.length} reserva(s) vieram de ${channels.join(", ")}. A Central muda a data aqui, mas a remarcação também precisa ser feita na plataforma, senão o cliente continua com a data antiga no voucher.`,
              `Heads up: ${external.length} booking(s) came from ${channels.join(", ")}. The Central changes the date here, but you must also reschedule on that platform.`,
            )}
          </p>
        )}
        {error && <p role="alert" className="pmy-board-pop__error">{error}</p>}
        <div className="pmy-board-pop__actions">
          <button type="button" className="pmy-board-btn is-primary" disabled={busy || unchanged || !validTime} onClick={confirm}>
            {busy ? tr("Movendo…", "Moving…") : tr("Mover saída", "Move departure")}
          </button>
          <button type="button" className="pmy-board-btn" disabled={busy} onClick={onCancel}>{tr("Cancelar", "Cancel")}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Quadro ---------- */
export default function AgendaBoard({
  bookings = [],
  assignments = [],
  tours = [],
  guides = [],
  agendaLabels,
  departureTags = {},
  departureInfo = {},
  onSaveDepartureTags,
  onSaveAgendaLabels,
  onAssignGuide,
  onRemoveAssignment,
  onUpload,
  onRemoveAttachment,
  onResetCheck,
  onChecklistOp,
  onMoveDeparture = null,
  lang = "pt",
}) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [start, setStart] = useState(todayLisbon);
  const [openKey, setOpenKey] = useState("");
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [addingDate, setAddingDate] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [dragKey, setDragKey] = useState("");
  const [dropDate, setDropDate] = useState("");
  const [pendingMove, setPendingMove] = useState(null); // { card, dateKey, timeKey }
  const [moveNotice, setMoveNotice] = useState("");
  const scrollRef = useRef(null);
  const canMove = typeof onMoveDeparture === "function";
  const { tags } = normalizeAgendaLabels(agendaLabels);
  const tagById = new Map(tags.map((t) => [t.id, t]));

  const columns = useMemo(
    () => buildBoardColumns({ startDateKey: start, days: DAYS, bookings, assignments, departureTags, departureInfo, tours }),
    [start, bookings, assignments, departureTags, departureInfo, tours],
  );
  const openCard = columns.flatMap((c) => c.cards).find((c) => c.key === openKey) || null;
  const tourList = useMemo(() => [...tours].sort((a, b) => String(a.title).localeCompare(String(b.title))), [tours]);

  useEffect(() => {
    if (!openKey) return undefined;
    const onKey = (e) => { if (e.key === "Escape") { setOpenKey(""); setLabelsOpen(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openKey]);

  const toggleDeparture = async (tagId) => {
    const current = openCard.tagIds || [];
    const next = current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId];
    await onSaveDepartureTags(openCard.tourId, openCard.startTime, next);
  };
  const toggleTour = async (tagId) => {
    const current = normalizeAgendaLabels(agendaLabels);
    const key = agendaLabels?.colorAliases?.[openCard.tourId] || openCard.tourId;
    const previous = current.tours[key] || { color: null, tagIds: [] };
    const ids = previous.tagIds.includes(tagId) ? previous.tagIds.filter((id) => id !== tagId) : [...previous.tagIds, tagId];
    await onSaveAgendaLabels({ ...current, tours: { ...current.tours, [key]: { ...previous, tagIds: ids } } });
  };

  const assignOnCard = (card, guideId, languages) =>
    onAssignGuide({ tourId: card.tourId, dateKey: card.dateKey, time: card.timeKey, guideId, languages });

  const allCards = columns.flatMap((c) => c.cards);
  const endDrag = () => { setDragKey(""); setDropDate(""); };
  const dropOn = (dateKey) => {
    const card = allCards.find((c) => c.key === dragKey);
    endDrag();
    if (card && dateKey !== card.dateKey) setPendingMove({ card, dateKey, timeKey: card.timeKey });
  };
  const confirmMove = async ({ card, dateKey, timeKey }) => {
    const result = await onMoveDeparture({ tourId: card.tourId, fromStartTime: card.startTime, dateKey, timeKey });
    setPendingMove(null);
    setOpenKey("");
    const external = result?.external?.length || 0;
    setMoveNotice(
      `${card.title}: ${tr("movida para", "moved to")} ${columnTitle(dateKey, lang)} ${timeKey}.` +
      (external ? ` ${tr(`Lembre de remarcar ${external} reserva(s) na plataforma de origem.`, `Remember to reschedule ${external} booking(s) on the source platform.`)}` : ""),
    );
  };

  return (
    <section className="pmy-board" aria-label={tr("Quadro da Agenda", "Agenda board")}>
      <div className="pmy-board__toolbar">
        <button type="button" className="pmy-board-btn" onClick={() => setStart(addDays(start, -7))} aria-label={tr("Semana anterior", "Previous week")}>‹</button>
        <button type="button" className="pmy-board-btn" onClick={() => { setStart(todayLisbon()); scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" }); }}>{tr("Hoje", "Today")}</button>
        <button type="button" className="pmy-board-btn" onClick={() => setStart(addDays(start, 7))} aria-label={tr("Próxima semana", "Next week")}>›</button>
        <label className="pmy-board__date">
          {tr("A partir de", "From")}
          <DatePicker
            value={start}
            onChange={(e) => { const v = e?.target?.value ?? e; if (v) setStart(v); }}
            locale={lang === "en" ? "en-GB" : "pt-PT"}
            placeholder={lang === "en" ? "dd/mm/yyyy" : "dd/mm/aaaa"}
            todayLabel={tr("Hoje", "Today")}
            clearLabel={tr("Limpar", "Clear")}
          />
        </label>
        <button type="button" className="pmy-board-btn" onClick={() => setExpanded(!expanded)} aria-pressed={expanded}>
          {expanded ? tr("Esconder nomes das etiquetas", "Hide label names") : tr("Mostrar nomes das etiquetas", "Show label names")}
        </button>
      </div>

      {canMove && <p className="pmy-board__hint">{tr("Administradores: arraste um cartão para outra coluna para mudar a data da saída.", "Admins: drag a card to another column to change the departure date.")}</p>}
      {moveNotice && (
        <p className="pmy-board__notice" role="status">
          {moveNotice}
          <button type="button" className="pmy-board-pop__icon" aria-label={tr("Fechar aviso", "Dismiss")} onClick={() => setMoveNotice("")}>×</button>
        </p>
      )}

      <div className="pmy-board__scroll" ref={scrollRef}>
        {columns.map((col) => (
          <div
            key={col.dateKey}
            className={`pmy-board__col${dragKey && dropDate === col.dateKey ? " is-drop" : ""}`}
            onDragOver={canMove ? (e) => { if (!dragKey) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (dropDate !== col.dateKey) setDropDate(col.dateKey); } : undefined}
            onDragLeave={canMove ? (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropDate(""); } : undefined}
            onDrop={canMove ? (e) => { e.preventDefault(); dropOn(col.dateKey); } : undefined}
          >
            <div className="pmy-board__col-head">
              <strong>{columnTitle(col.dateKey, lang)}</strong>
              <span>{col.cards.length}</span>
            </div>
            <div className="pmy-board__cards">
              {col.cards.map((card) => {
                const labelIds = cardLabelIds(agendaLabels, card).filter((id) => tagById.has(id));
                const color = tourColor(agendaLabels, card.tourId);
                const progress = checklistProgress(card, departureInfo[card.key]?.checklists);
                return (
                  <button
                    key={card.key}
                    type="button"
                    className={`pmy-board-card${dragKey === card.key ? " is-dragging" : ""}`}
                    style={{ "--tour-color": color }}
                    draggable={canMove}
                    onDragStart={canMove ? (e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", card.key); setDragKey(card.key); } : undefined}
                    onDragEnd={canMove ? endDrag : undefined}
                    onClick={() => { setOpenKey(card.key); setLabelsOpen(false); }}
                  >
                    <span className="pmy-board-card__labels">
                      {labelIds.length
                        ? labelIds.map((id) => {
                            const tag = tagById.get(id);
                            return <span key={id} className={`pmy-board-chip ${expanded ? "is-expanded" : ""}`} style={{ background: tag.color, color: contrastText(tag.color) }} title={tag.name}>{expanded ? tag.name : ""}</span>;
                          })
                        : <span className="pmy-board-chip" style={{ background: color }} title={card.title} />}
                    </span>
                    <span className="pmy-board-card__title"><b>{card.timeKey}</b> {card.title}</span>
                    <span className="pmy-board-card__foot">
                      <span className="pmy-board-card__badges">
                        {card.notes > 0 && <span title={tr("Observações", "Notes")}>💬 {card.notes}</span>}
                        {card.attachments > 0 && <span title={tr("Anexos", "Attachments")}>📎 {card.attachments}</span>}
                        {progress.total > 0 && (
                          <span className={`pmy-board-badge ${progress.done === progress.total ? "is-done" : ""}`} title={tr("Itens marcados nos checklists", "Checked checklist items")}>
                            ☑ {progress.done}/{progress.total}
                          </span>
                        )}
                        {card.pax > 0 && <span title={tr("Pessoas confirmadas", "Confirmed people")}>👥 {card.pax}{card.pending ? ` +${card.pending}` : ""}</span>}
                        {card.checks > 0 && <span title={tr("Checks do guia (Início/Meio/Fim)", "Guide checks")}>✓ {card.checks}/3</span>}
                      </span>
                      <span className="pmy-board-card__avatars">
                        {card.guides.map((g) => (
                          <span key={g.assignmentId} title={g.name}><GuideAvatar guide={{ ...(guides.find((x) => x.id === g.guideId) || {}), id: g.guideId, name: g.name }} size={26} /></span>
                        ))}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {addingDate === col.dateKey ? (
              <AddCardForm dateKey={col.dateKey} tours={tourList} guides={guides} onAssign={onAssignGuide} onClose={() => setAddingDate("")} lang={lang} />
            ) : (
              <button type="button" className="pmy-board__add" onClick={() => setAddingDate(col.dateKey)}>+ {tr("Adicionar um cartão", "Add a card")}</button>
            )}
          </div>
        ))}
      </div>

      {openCard && (
        <div className="pmy-board-modal" role="dialog" aria-modal="true" aria-label={openCard.title} onMouseDown={(e) => { if (e.target === e.currentTarget) { setOpenKey(""); setLabelsOpen(false); } }}>
          <div className="pmy-board-modal__card" style={{ "--tour-color": tourColor(agendaLabels, openCard.tourId) }}>
            <div className="pmy-board-modal__head">
              <div>
                <h3>{openCard.title}</h3>
                <p>{columnTitle(openCard.dateKey, lang)} · {openCard.timeKey} · {openCard.pax} {tr("pessoas confirmadas", "confirmed people")}{openCard.pending ? ` · ${openCard.pending} ${tr("aguardando pagamento", "awaiting payment")}` : ""}</p>
              </div>
              <button type="button" className="pmy-board-pop__icon" aria-label={tr("Fechar", "Close")} onClick={() => { setOpenKey(""); setLabelsOpen(false); }}>×</button>
            </div>

            <div className="pmy-board-modal__section">
              <span className="pmy-board-pop__sub">{tr("Etiquetas", "Labels")}</span>
              <div className="pmy-board-modal__labels">
                {cardLabelIds(agendaLabels, openCard).filter((id) => tagById.has(id)).map((id) => {
                  const tag = tagById.get(id);
                  return <span key={id} className="pmy-board-label is-static" style={{ background: tag.color, color: contrastText(tag.color) }}>{tag.name || " "}</span>;
                })}
                <button type="button" className="pmy-board-btn" onClick={() => setLabelsOpen(!labelsOpen)}>+</button>
              </div>
              {labelsOpen && (
                <LabelPopover labels={agendaLabels} card={openCard} onToggleDeparture={toggleDeparture} onToggleTour={toggleTour} onSaveLabels={onSaveAgendaLabels} onClose={() => setLabelsOpen(false)} lang={lang} />
              )}
            </div>

            <div className="pmy-board-modal__section">
              <span className="pmy-board-pop__sub">{tr("Guias", "Guides")}</span>
              <GuidePicker card={openCard} guides={guides} onAssign={assignOnCard} onRemove={onRemoveAssignment} lang={lang} />
            </div>

            {canMove && (
              <div className="pmy-board-modal__section">
                <span className="pmy-board-pop__sub">{tr("Data da saída", "Departure date")}</span>
                <button type="button" className="pmy-board-btn" onClick={() => setPendingMove({ card: openCard, dateKey: openCard.dateKey, timeKey: openCard.timeKey })}>
                  {tr("Mover para outra data ou horário", "Move to another date or time")}
                </button>
              </div>
            )}

            {openCard.bookings.length > 0 && (
              <div className="pmy-board-modal__section">
                <span className="pmy-board-pop__sub">{tr("Clientes", "Guests")}</span>
                <ul className="pmy-board-guests">
                  {openCard.bookings.map((b) => (
                    <li key={b.id}>
                      <span>{b.customerName || b.leadTravelerName || tr("Cliente", "Guest")}</span>
                      <small>{[b.platform, b.language, `${Number(b.totalParticipants) || [b.adults, b.children, b.youths, b.seniors].reduce((s, n) => s + Number(n || 0), 0)} pax`, b.status === "PENDING" ? tr("aguardando pagamento", "awaiting payment") : b.attendanceStatus === "COMPLETED" ? tr("presente", "present") : b.attendanceStatus === "NO_SHOW" ? "no-show" : ""].filter(Boolean).join(" · ")}</small>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {onChecklistOp && (
              <ChecklistSection card={openCard} raw={departureInfo[openCard.key]?.checklists}
                onOp={(op) => onChecklistOp(openCard.tourId, openCard.startTime, op)} lang={lang} />
            )}

            <DepartureTagsSection
              departures={[{ tourId: openCard.tourId, startTime: openCard.startTime, title: openCard.title, timeKey: openCard.timeKey, pax: openCard.pax }]}
              agendaLabels={agendaLabels}
              departureTags={departureTags}
              departureInfo={departureInfo}
              assignments={assignments}
              onUpload={onUpload}
              onRemoveAttachment={onRemoveAttachment}
              onResetCheck={onResetCheck}
              hideTags
              lang={lang}
            />
          </div>
        </div>
      )}

      {pendingMove && (
        <MoveDialog
          key={pendingMove.card.key + pendingMove.dateKey}
          move={pendingMove}
          columns={columns}
          onConfirm={confirmMove}
          onCancel={() => setPendingMove(null)}
          lang={lang}
        />
      )}
    </section>
  );
}

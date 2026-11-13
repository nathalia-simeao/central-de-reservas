import { useEffect, useMemo, useRef, useState } from "react";
import { AGENDA_PICKER_PALETTE, contrastText, normalizeAgendaLabels, tourColor } from "../../utils/agenda-labels.js";
import { addDays, attachmentsForCard, buildBoardColumns, cardLabelIds, initials, listsForCard, notesForCard } from "../../utils/agenda-board.js";
import { languageLabel } from "../../utils/tour-languages.js";
import { langColor } from "../../utils/language-colors.js";
import DepartureTagsSection from "./DepartureTagsSection";

// Campo que recebe o foco ao aparecer (no lugar de autoFocus, que o lint proíbe).
import { DatePicker, DropdownSelect, TimeSelect } from "./PmyUI";
import { autoChecklists, cardLanguages, checklistProgress, normalizeChecklists } from "../../utils/departure-checklists.js";
import { isOutdoorTour, placeForTour, weatherAlert, weatherIcon } from "../../utils/weather.js";
import { freeSeats, waitlistMatches } from "../../utils/waitlist.js";
import { GuestMessages, WaitlistSection, WeatherNote } from "./DepartureExtras";
import { SupportColumn, SupportModal, TaskCard } from "./SupportCards";
import AuthedImage, { isPreviewableImage } from "./AuthedImage";
import ActivityPanel from "./ActivityPanel";
import TrelloImportDialog from "./TrelloImportDialog";
import { TrelloGuideCheck, trelloGuideGaps } from "./CalendarMirror";
import { ChecklistBlock, ChecklistEditor, FocusInput } from "./ChecklistBlock";

// Agenda → Quadro: a operação no formato do Trello que a equipe já usa.
// Uma coluna por data, um cartão por saída, etiquetas coloridas, guias no cartão.

const DAYS = 14;
// Linha do tempo sem fim prático: vai carregando de 14 em 14 dias ao rolar,
// até ~14 meses (o Trello tinha saídas até o fim de 2027).
const MAX_DAYS = 430;

// Coleções do site (Shopify) de um passeio: "Walking Tours", "Day Trips"...
export function tourCollections(tour) {
  const list = tour?.shopifySnapshot?.collections || tour?.collections || [];
  return (Array.isArray(list) ? list : []).map((c) => (typeof c === "string" ? c : c?.title)).filter(Boolean);
}
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
            <FocusInput value={editing.name} maxLength={30} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder={tr("ex.: Pena, Regaleira, Transfer", "e.g. Pena, Regaleira, Transfer")} />
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
        <FocusInput className="pmy-board-pop__search" placeholder={tr("Buscar guia…", "Search guide…")} value={query} onChange={(e) => setQuery(e.target.value)} />
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
  const [editing, setEditing] = useState(""); // assignmentId com o idioma aberto
  const [draft, setDraft] = useState([]);
  const [saving, setSaving] = useState(false);
  const editingGuide = card.guides.find((g) => g.assignmentId === editing) || null;
  return (
    <div className="pmy-board-guides">
      {error && <p role="alert" className="pmy-board-pop__error">{error}</p>}
      <div className="pmy-board-guides__row">
        {card.guides.map((g) => (
          <span key={g.assignmentId} className="pmy-board-guide">
            <GuideAvatar guide={{ ...(byId.get(g.guideId) || {}), id: g.guideId, name: g.name }} size={26} />
            <span>{g.name}</span>
            <button type="button" className={`pmy-board-guide__lang${editing === g.assignmentId ? " is-open" : ""}`}
              title={tr("Trocar idioma do grupo", "Change group language")}
              onClick={() => { setError(""); setEditing(editing === g.assignmentId ? "" : g.assignmentId); setDraft(g.languages || []); }}>
              {g.languages.length
                ? g.languages.map((k) => <span key={k} className="pmy-guide-lang" style={{ background: langColor(k) }}>{languageLabel(k, lang)}</span>)
                : tr("Todos os idiomas", "All languages")} ▾
            </button>
            <button type="button" aria-label={tr(`Tirar ${g.name}`, `Remove ${g.name}`)}
              onClick={async () => { setError(""); try { await onRemove(g.assignmentId); } catch (e) { setError(e?.message || ""); } }}>×</button>
          </span>
        ))}
        <button type="button" className="pmy-board-btn" onClick={() => setOpen(!open)}>{tr("+ Guia", "+ Guide")}</button>
      </div>
      {editingGuide && (
        <div className="pmy-board-member__langs pmy-board-guides__edit">
          <span>{tr(`Idioma do grupo de ${String(editingGuide.name).split(" ")[0]}:`, `${String(editingGuide.name).split(" ")[0]}'s group language:`)}</span>
          <span className="pmy-board-guides__langs" role="group">
            {LANG_KEYS.map((k) => (
              <button key={k} type="button" className={draft.includes(k) ? "is-on" : ""} aria-pressed={draft.includes(k)}
                style={draft.includes(k) ? { background: langColor(k), borderColor: langColor(k), color: "#fff" } : undefined}
                onClick={() => setDraft((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))}>
                {languageLabel(k, lang)}
              </button>
            ))}
          </span>
          <span className="pmy-board-guides__actions">
            <button type="button" className="pmy-board-btn is-primary" disabled={saving}
              onClick={async () => {
                setSaving(true); setError("");
                try { await onAssign(card, editingGuide.guideId, draft); setEditing(""); } catch (e) { setError(e?.message || tr("Não foi possível salvar.", "Could not save.")); }
                setSaving(false);
              }}>
              {saving ? "…" : tr("Salvar idioma", "Save language")}
            </button>
            <button type="button" className="pmy-board-btn" onClick={() => setEditing("")}>{tr("Cancelar", "Cancel")}</button>
          </span>
        </div>
      )}
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
function AddCardForm({ dateKey, tours, guides, onAssign, onCreateTask, onClose, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  // "Passeio" = saída de um passeio do site; "Demanda" = pedido externo, sem passeio.
  const [mode, setMode] = useState("tour");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [tourId, setTourId] = useState("");
  const [time, setTime] = useState("10:00");
  const [guideId, setGuideId] = useState("");
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitTask = async () => {
    if (!taskTitle.trim()) { setError(tr("Escreva o que é a demanda.", "Describe the task.")); return; }
    setBusy(true);
    setError("");
    try {
      await onCreateTask({ title: taskTitle.trim(), dateKey, time: taskTime });
      onClose();
    } catch (e) {
      setError(e?.message || tr("Não foi possível criar.", "Could not create."));
    } finally {
      setBusy(false);
    }
  };
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
  const modeSwitch = onCreateTask && (
    <div className="pmy-board-add__mode" role="group" aria-label={tr("Tipo de cartão", "Card type")}>
      <button type="button" className={mode === "tour" ? "is-on" : ""} aria-pressed={mode === "tour"} onClick={() => { setMode("tour"); setError(""); }}>{tr("Passeio", "Tour")}</button>
      <button type="button" className={mode === "task" ? "is-on" : ""} aria-pressed={mode === "task"} onClick={() => { setMode("task"); setError(""); }}>{tr("Demanda", "Task")}</button>
    </div>
  );
  if (mode === "task") {
    return (
      <div className="pmy-board-add">
        {modeSwitch}
        <FocusInput className="pmy-ds-input" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder={tr("Ex.: Transfer aeroporto família Silva", "E.g. airport transfer")}
          aria-label={tr("Título da demanda", "Task title")} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitTask(); } if (e.key === "Escape") onClose(); }} />
        <TimeSelect value={taskTime} onChange={setTaskTime} lang={lang} placeholder={tr("Horário (opcional)", "Time (optional)")} />
        {error && <p role="alert" className="pmy-board-pop__error">{error}</p>}
        <div className="pmy-board-pop__actions">
          <button type="button" className="pmy-board-btn is-primary" disabled={busy} onClick={submitTask}>{busy ? "…" : tr("Adicionar demanda", "Add task")}</button>
          <button type="button" className="pmy-board-pop__icon" aria-label={tr("Cancelar", "Cancel")} onClick={onClose}>×</button>
        </div>
      </div>
    );
  }
  return (
    <div className="pmy-board-add">
      {modeSwitch}
      <DropdownSelect value={tourId} onChange={setTourId} placeholder={tr("Passeio…", "Tour…")} ariaLabel={tr("Passeio", "Tour")}
        searchPlaceholder={tr("Buscar passeio…", "Search tour…")} options={tours.map((t) => ({ value: t.id, label: t.title }))} />
      <div className="pmy-board-add__row">
        <TimeSelect value={time} onChange={setTime} lang={lang} />
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
/** Checklists da saída vistos por um cartão (saída dividida: só as listas daquele guia). */
function cardChecklistRaw(card, raw) {
  if (!card?.split) return raw;
  const state = normalizeChecklists(raw);
  return { ...state, lists: listsForCard(state.lists, card) };
}

function ChecklistSection({ card, raw: fullRaw, onOp: sendOp, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const raw = cardChecklistRaw(card, fullRaw);
  const ownerId = card.split ? card.guides?.[0]?.guideId || "" : "";
  // Lista nova num cartão de guia fica marcada com aquele guia.
  const onOp = (op) => sendOp(op?.type === "addList" && ownerId ? { ...op, guideId: ownerId } : op);
  const state = normalizeChecklists(raw);
  const autos = autoChecklists(card);
  const [busy, setBusy] = useState(false);
  const run = async (op) => { setBusy(true); try { await onOp(op); } finally { setBusy(false); } };
  return (
    <ChecklistEditor raw={raw} onOp={onOp} lang={lang}
      empty={!autos.length && tr("Quando entrar reserva confirmada, o checklist do grupo aparece aqui sozinho (Pronto · clientes · Fim de tour). Também dá para criar um manual.", "A checklist per group appears here automatically once a booking is confirmed.")}
      before={autos.map((list) => (
        <ChecklistBlock key={list.id} list={list} busy={busy} lang={lang}
          hidden={Boolean(state.hideDone[list.id])}
          isDone={(item) => Boolean(state.auto[item.key]?.done)}
          onToggle={(item) => run({ type: "toggleAuto", key: item.key, label: item.text })}
          onToggleHide={() => run({ type: "toggleHideDone", listId: list.id })} />
      ))} />
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
            <TimeSelect value={timeKey} onChange={setTimeKey} lang={lang} />
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
  onSetAttachmentGuide,
  onOpenAttachment = null,
  onResetCheck,
  onChecklistOp,
  onMoveDeparture = null,
  focus = null,
  onFocusHandled = null,
  trelloAliases = {},
  onArchiveDeparture = null,
  onDeleteDepartureCard = null,
  waitlist = [],
  onAddWaitlist,
  onWaitlistStatus,
  loadWeather,
  showGuestMessages = false,
  supportCards = [],
  supportHandlers = null,
  onImportTrello = null,
  loadBookings = null,
  loadTrelloBoard = null,
  loadImage = null,
  requestJson = null,
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
  const [weather, setWeather] = useState(null); // { [placeKey]: { [dateKey]: day } }
  const [guestMsg, setGuestMsg] = useState(""); // modelo aberto em "Avisar clientes"
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [trelloOpen, setTrelloOpen] = useState(false);
  const [openTaskId, setOpenTaskId] = useState("");
  const [days, setDays] = useState(DAYS);
  const [onlyBusy, setOnlyBusy] = useState(() => {
    try { return window.localStorage.getItem("pmy.board.onlyBusy") === "1"; } catch { return false; }
  });
  const [collection, setCollection] = useState("");
  // Reservas de saídas além da janela que a Central carrega ao abrir (±30 dias).
  const [extraBookings, setExtraBookings] = useState([]);
  const fetchedRef = useRef(new Set());
  const [trelloDone, setTrelloDone] = useState(false);
  // Arquivados ficam fora do Quadro; "Arquivados" mostra de novo para desarquivar.
  const [showArchived, setShowArchived] = useState(false);
  const [cardAction, setCardAction] = useState({ busy: "", error: "", confirmDelete: false });
  // Vindo do Calendário ("Editar no Quadro"): começa no dia e abre o cartão.
  useEffect(() => {
    if (!focus?.nonce) return;
    if (focus.dateKey) setStart(focus.dateKey);
    if (focus.key) setOpenKey(focus.key);
    if (focus.taskId) setOpenTaskId(focus.taskId);
    onFocusHandled?.(); // não reabrir o mesmo cartão na próxima visita ao Quadro
  }, [focus?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof loadWeather !== "function") return undefined;
    let alive = true;
    loadWeather().then((r) => { if (alive && r?.success) setWeather(r.places || null); }).catch(() => {});
    return () => { alive = false; };
  }, [loadWeather]);

  const tourById = useMemo(() => new Map(tours.map((t) => [t.id, t])), [tours]);
  const dayFor = (card) => weather?.[placeForTour(card.title)]?.[card.dateKey] || null;
  const cardAlert = (card) => (isOutdoorTour(card.title) ? weatherAlert(dayFor(card)) : null);
  const waitlistFor = (card) => {
    const iso = new Date(card.startTime).toISOString();
    return waitlist.filter((w) => w.tourId === card.tourId && new Date(w.startTime).toISOString() === iso && w.status !== "REMOVED");
  };
  const { tags } = normalizeAgendaLabels(agendaLabels);
  const tagById = new Map(tags.map((t) => [t.id, t]));

  const visibleDays = onlyBusy ? MAX_DAYS : days;
  useEffect(() => { setDays(DAYS); }, [start]);
  useEffect(() => {
    try { window.localStorage.setItem("pmy.board.onlyBusy", onlyBusy ? "1" : "0"); } catch { /* ok */ }
  }, [onlyBusy]);

  // Busca as reservas por data de saída, em blocos de 60 dias, conforme a linha do tempo anda.
  useEffect(() => {
    if (typeof loadBookings !== "function") return undefined;
    let alive = true;
    const wanted = [];
    for (let offset = 0; offset < visibleDays; offset += 60) {
      const from = addDays(start, offset);
      if (fetchedRef.current.has(from)) continue;
      fetchedRef.current.add(from);
      wanted.push([from, addDays(from, 61)]);
    }
    if (!wanted.length) return undefined;
    Promise.all(wanted.map(([from, to]) => loadBookings(from, to).catch(() => [])))
      .then((lists) => {
        if (!alive) return;
        setExtraBookings((current) => {
          const byId = new Map(current.map((b) => [b.id, b]));
          for (const list of lists) for (const b of list || []) if (b?.id) byId.set(b.id, b);
          return [...byId.values()];
        });
      });
    return () => { alive = false; };
  }, [loadBookings, start, visibleDays]);

  const allBookings = useMemo(() => {
    if (!extraBookings.length) return bookings;
    const byId = new Map(extraBookings.map((b) => [b.id, b]));
    for (const b of bookings) byId.set(b.id, b);
    return [...byId.values()];
  }, [bookings, extraBookings]);

  const collectionsByTour = useMemo(() => new Map(tours.map((t) => [t.id, tourCollections(t)])), [tours]);
  const collectionOptions = useMemo(() => {
    const names = [...new Set(tours.flatMap((t) => tourCollections(t)))].sort((a, b) => a.localeCompare(b));
    return [{ value: "", label: tr("Todas as coleções", "All collections") }, ...names.map((n) => ({ value: n, label: n }))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tours, lang]);

  const columns = useMemo(() => {
    const built = buildBoardColumns({ startDateKey: start, days: visibleDays, bookings: allBookings, assignments, departureTags, departureInfo, tours });
    const keep = (c) => (showArchived ? Boolean(departureInfo[c.key]?.archivedAt) : !departureInfo[c.key]?.archivedAt)
      && (!collection || (collectionsByTour.get(c.tourId) || []).includes(collection));
    const filtered = built.map((col) => ({ ...col, cards: col.cards.filter(keep) }));
    const tasksByDate = new Map();
    if (!collection) {
      for (const task of supportCards) {
        if (!task.dateKey || Boolean(task.archivedAt) !== showArchived) continue;
        if (!tasksByDate.has(task.dateKey)) tasksByDate.set(task.dateKey, []);
        tasksByDate.get(task.dateKey).push(task);
      }
      for (const list of tasksByDate.values()) list.sort((a, b) => String(a.time || "99").localeCompare(String(b.time || "99")) || String(a.title).localeCompare(String(b.title)));
    }
    const withTasks = filtered.map((col) => ({ ...col, tasks: tasksByDate.get(col.dateKey) || [] }));
    return onlyBusy || showArchived ? withTasks.filter((col) => col.cards.length || col.tasks.length) : withTasks;
  }, [start, visibleDays, allBookings, assignments, departureTags, departureInfo, tours, collection, collectionsByTour, onlyBusy, supportCards, showArchived]);
  const archivedCount = Object.values(departureInfo).filter((info) => info?.archivedAt).length
    + supportCards.filter((c) => c.archivedAt).length;
  const openTask = openTaskId ? supportCards.find((c) => c.id === openTaskId) || null : null;

  const onBoardScroll = (e) => {
    const el = e.currentTarget;
    if (onlyBusy || days >= MAX_DAYS) return;
    if (el.scrollLeft + el.clientWidth > el.scrollWidth - 700) setDays((d) => Math.min(d + 14, MAX_DAYS));
  };
  // openKey = uid do cartão; vindo de um link (passeio|horário) abre o primeiro cartão daquela saída.
  const openCard = (() => {
    const all = columns.flatMap((c) => c.cards);
    return all.find((c) => c.uid === openKey) || all.find((c) => c.key === openKey) || null;
  })();
  useEffect(() => { setCardAction({ busy: "", error: "", confirmDelete: false }); }, [openKey]);
  const archiveOpenCard = async (archived) => {
    setCardAction({ busy: "archive", error: "", confirmDelete: false });
    try {
      await onArchiveDeparture(openCard.tourId, openCard.startTime, archived);
      setOpenKey("");
      setMoveNotice(`${openCard.title} (${columnTitle(openCard.dateKey, lang)} ${openCard.timeKey}): ${archived ? tr("cartão arquivado. Ele fica em \"Arquivados\".", "card archived. Find it under \"Archived\".") : tr("cartão de volta ao Quadro.", "card back on the board.")}`);
    } catch (e) {
      setCardAction({ busy: "", error: e?.message || tr("Não foi possível arquivar.", "Could not archive."), confirmDelete: false });
    }
  };
  const deleteOpenCard = async () => {
    setCardAction({ busy: "delete", error: "", confirmDelete: true });
    try {
      await onDeleteDepartureCard(openCard.tourId, openCard.startTime);
      setOpenKey("");
      setMoveNotice(`${openCard.title} (${columnTitle(openCard.dateKey, lang)} ${openCard.timeKey}): ${tr("cartão excluído.", "card deleted.")}`);
    } catch (e) {
      setCardAction({ busy: "", error: e?.message || tr("Não foi possível excluir.", "Could not delete."), confirmDelete: false });
    }
  };
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
    const card = allCards.find((c) => c.uid === dragKey);
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
        <DropdownSelect
          value={collection}
          options={collectionOptions}
          onChange={setCollection}
          placeholder={tr("Todas as coleções", "All collections")}
          ariaLabel={tr("Filtrar por coleção", "Filter by collection")}
          className="pmy-board__filter"
        />
        <button type="button" className="pmy-board-btn" aria-pressed={onlyBusy} onClick={() => setOnlyBusy(!onlyBusy)}>
          {onlyBusy ? tr("Mostrar todos os dias", "Show every day") : tr("Só dias com passeio", "Only days with tours")}
        </button>
        {(archivedCount > 0 || showArchived) && (
          <button type="button" className="pmy-board-btn" aria-pressed={showArchived} onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? tr("Voltar ao Quadro", "Back to board") : `${tr("Arquivados", "Archived")} (${archivedCount})`}
          </button>
        )}
        {onImportTrello && (
          <button type="button" className="pmy-board-btn" onClick={() => { setTrelloDone(false); setTrelloOpen(true); }}>
            {tr("Importar do Trello", "Import from Trello")}
          </button>
        )}
      </div>

      {canMove && <p className="pmy-board__hint">{tr("Administradores: arraste um cartão para outra coluna para mudar a data da saída.", "Admins: drag a card to another column to change the departure date.")}</p>}
      {moveNotice && (
        <p className="pmy-board__notice" role="status">
          {moveNotice}
          <button type="button" className="pmy-board-pop__icon" aria-label={tr("Fechar aviso", "Dismiss")} onClick={() => setMoveNotice("")}>×</button>
        </p>
      )}

      {showArchived && (
        <p className="pmy-board__notice is-archive" role="status">
          {tr("Você está vendo só os cartões arquivados. Abra um cartão para desarquivar.", "Showing archived cards only. Open a card to unarchive it.")}
        </p>
      )}
      {showArchived && !columns.length && <p className="pmy-board__hint">{tr("Nenhum cartão arquivado a partir desta data.", "No archived cards from this date.")}</p>}
      {!showArchived && onlyBusy && !columns.length && <p className="pmy-board__hint">{tr("Nenhuma saída a partir desta data.", "No departures from this date.")}</p>}
      <div className="pmy-board__scroll" ref={scrollRef} onScroll={onBoardScroll}>
        {supportHandlers && (
          <SupportColumn cards={supportCards.filter((c) => Boolean(c.archivedAt) === showArchived)} guides={guides} handlers={supportHandlers} loadImage={loadImage} requestJson={requestJson} archivedView={showArchived} lang={lang} />
        )}
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
              <span>
                {weather?.lisboa?.[col.dateKey] && <span title={tr("Previsão para Lisboa", "Lisbon forecast")}>{weatherIcon(weather.lisboa[col.dateKey])} {Math.round(weather.lisboa[col.dateKey].tempMax)}° · </span>}
                {col.cards.length + (col.tasks?.length || 0)}
              </span>
            </div>
            <div className="pmy-board__cards">
              {col.cards.map((card) => {
                const labelIds = cardLabelIds(agendaLabels, card).filter((id) => tagById.has(id));
                const color = tourColor(agendaLabels, card.tourId);
                const progress = checklistProgress(card, cardChecklistRaw(card, departureInfo[card.key]?.checklists));
                return (
                  <button
                    key={card.uid}
                    type="button"
                    className={`pmy-board-card${dragKey === card.uid ? " is-dragging" : ""}${showArchived ? " is-archived" : ""}`}
                    style={{ "--tour-color": color }}
                    draggable={canMove}
                    onDragStart={canMove ? (e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", card.uid); setDragKey(card.uid); } : undefined}
                    onDragEnd={canMove ? endDrag : undefined}
                    onClick={() => { setOpenKey(card.uid); setLabelsOpen(false); setGuestMsg(""); setWaitlistOpen(false); }}
                  >
                    {(() => {
                      const cover = loadImage && attachmentsForCard(departureInfo[card.key], card).find(isPreviewableImage);
                      return cover ? <AuthedImage path={`/saida/anexo/${cover.id}`} loadImage={loadImage} className="pmy-board-card__cover" /> : null;
                    })()}
                    <span className="pmy-board-card__labels">
                      {labelIds.length
                        ? labelIds.map((id) => {
                            const tag = tagById.get(id);
                            return <span key={id} className={`pmy-board-chip ${expanded ? "is-expanded" : ""}`} style={{ background: tag.color, color: contrastText(tag.color) }} title={tag.name}>{expanded ? tag.name : ""}</span>;
                          })
                        : <span className="pmy-board-chip" style={{ background: color }} title={card.title} />}
                    </span>
                    <span className="pmy-board-card__title"><b>{card.timeKey}</b> {card.title}</span>
                    {(() => {
                      const langs = cardLanguages(card, cardChecklistRaw(card, departureInfo[card.key]?.checklists));
                      return langs.length > 0 && (
                        <span className="pmy-board-card__langs" title={langs.map((k) => languageLabel(k, lang)).join(", ")}>
                          {langs.map((k) => <span key={k} className="pmy-board-lang" style={{ background: langColor(k), borderColor: langColor(k) }}>{k.toUpperCase()}</span>)}
                        </span>
                      );
                    })()}
                    {(collectionsByTour.get(card.tourId) || []).length > 0 && (
                      <span className="pmy-board-card__collection">{collectionsByTour.get(card.tourId).join(" · ")}</span>
                    )}
                    <span className="pmy-board-card__foot">
                      <span className="pmy-board-card__badges">
                        {cardAlert(card) && <span className={`pmy-board-badge is-weather-${cardAlert(card)}`} title={tr("Alerta de clima", "Weather alert")}>{weatherIcon(dayFor(card))} {cardAlert(card) === "bad" ? tr("mau tempo", "bad weather") : tr("atenção", "watch")}</span>}
                        {onAddWaitlist && waitlistFor(card).length > 0 && (
                          <span className={`pmy-board-badge${waitlistMatches(waitlistFor(card), freeSeats(card, tourById.get(card.tourId))).length ? " is-open" : ""}`} title={tr("Lista de espera", "Waiting list")}>⏳ {waitlistFor(card).length}</span>
                        )}
                        {card.notes > 0 && <span title={tr("Observações", "Notes")}>💬 {card.notes}</span>}
                        {card.attachments > 0 && <span title={tr("Anexos", "Attachments")}>📎 {card.attachments}</span>}
                        {progress.total > 0 && (
                          <span className={`pmy-board-badge ${progress.done === progress.total ? "is-done" : ""}`} title={tr("Itens marcados nos checklists", "Checked checklist items")}>
                            ☑ {progress.done}/{progress.total}
                          </span>
                        )}
                        {card.pax > 0 && <span title={tr("Pessoas confirmadas", "Confirmed people")}>👥 {card.pax}{card.pending ? ` +${card.pending}` : ""}</span>}
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
              {(col.tasks || []).map((task) => (
                <TaskCard key={task.id} card={task} guides={guides} loadImage={loadImage} lang={lang} onOpen={() => setOpenTaskId(task.id)} />
              ))}
            </div>
            {showArchived ? null : addingDate === col.dateKey ? (
              <AddCardForm dateKey={col.dateKey} tours={tourList} guides={guides} onAssign={onAssignGuide} onClose={() => setAddingDate("")} lang={lang}
                onCreateTask={supportHandlers?.save ? async (fields) => { const card = await supportHandlers.save(fields); if (card?.id) setOpenTaskId(card.id); } : null} />
            ) : (
              <button type="button" className="pmy-board__add" onClick={() => setAddingDate(col.dateKey)}>+ {tr("Adicionar um cartão", "Add a card")}</button>
            )}
          </div>
        ))}
      </div>

      {openCard && (
        <div className="pmy-board-modal">
          <button type="button" className="pmy-board-modal__backdrop" aria-label={tr("Fechar", "Close")} tabIndex={-1} onClick={() => { setOpenKey(""); setLabelsOpen(false); }} />
          <div className="pmy-board-modal__card" role="dialog" aria-modal="true" aria-label={openCard.title} style={{ "--tour-color": tourColor(agendaLabels, openCard.tourId) }}>
            <div className="pmy-board-modal__head">
              <div>
                {(collectionsByTour.get(openCard.tourId) || []).length > 0 && (
                  <small className="pmy-board-modal__collection">{collectionsByTour.get(openCard.tourId).join(" · ")}</small>
                )}
                <h3>{openCard.title}{departureInfo[openCard.key]?.archivedAt && <span className="pmy-board-archived-tag">{tr("Arquivado", "Archived")}</span>}</h3>
                <p>{columnTitle(openCard.dateKey, lang)} · {openCard.timeKey} · {openCard.pax} {tr("pessoas confirmadas", "confirmed people")}{openCard.pending ? ` · ${openCard.pending} ${tr("aguardando pagamento", "awaiting payment")}` : ""}</p>
              </div>
              <button type="button" className="pmy-board-pop__icon" aria-label={tr("Fechar", "Close")} onClick={() => { setOpenKey(""); setLabelsOpen(false); }}>×</button>
            </div>

            <WeatherNote
              card={openCard}
              day={dayFor(openCard)}
              onNotify={showGuestMessages ? () => setGuestMsg("weather") : null}
              onMove={canMove ? () => setPendingMove({ card: openCard, dateKey: openCard.dateKey, timeKey: openCard.timeKey }) : null}
              lang={lang}
            />

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
              <TrelloGuideCheck gaps={trelloGuideGaps(departureInfo[openCard.key], openCard, guides, trelloAliases)} lang={lang} />
            </div>

            {showGuestMessages && <div className="pmy-board-modal__section">
              <span className="pmy-board-pop__sub">{tr("Avisar clientes", "Notify guests")}</span>
              {guestMsg ? (
                <GuestMessages key={guestMsg} card={openCard} initialTemplate={guestMsg} lang={lang} />
              ) : (
                <button type="button" className="pmy-board-btn" onClick={() => setGuestMsg("delay")}>{tr("Mandar mensagem para os clientes desta saída", "Message this departure's guests")}</button>
              )}
            </div>}

            {onAddWaitlist && (
              <div className="pmy-board-modal__section">
                <span className="pmy-board-pop__sub">{tr("Lista de espera", "Waiting list")} ({waitlistFor(openCard).length})</span>
                {waitlistOpen || waitlistFor(openCard).length ? (
                  <WaitlistSection card={openCard} tour={tourById.get(openCard.tourId)} entries={waitlistFor(openCard)} onAdd={onAddWaitlist} onStatus={onWaitlistStatus} lang={lang} />
                ) : (
                  <button type="button" className="pmy-board-btn" onClick={() => setWaitlistOpen(true)}>{tr("Abrir lista de espera", "Open waiting list")}</button>
                )}
              </div>
            )}

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
              departureInfo={openCard.split ? {
                ...departureInfo,
                // Cartão de um guia: só os ingressos e observações dele (e os da saída toda).
                [openCard.key]: {
                  ...(departureInfo[openCard.key] || {}),
                  attachments: attachmentsForCard(departureInfo[openCard.key], openCard),
                  guideNotes: notesForCard(departureInfo[openCard.key], openCard),
                },
              } : departureInfo}
              assignments={assignments}
              onUpload={onUpload ? (tourId, startTime, file) => onUpload(tourId, startTime, file, openCard.split ? openCard.guides[0]?.guideId || null : null) : undefined}
              ownerGuide={openCard.split ? openCard.guides[0] || null : null}
              onSetAttachmentGuide={onSetAttachmentGuide}
              onRemoveAttachment={onRemoveAttachment}
              onOpenAttachment={onOpenAttachment}
              loadImage={loadImage}
              onResetCheck={onResetCheck}
              hideTags
              lang={lang}
            />

            {(onArchiveDeparture || onDeleteDepartureCard) && (
              <div className="pmy-board-modal__section pmy-board-card-actions">
                <span className="pmy-board-pop__sub">{tr("Cartão", "Card")}</span>
                <div className="pmy-support-actions" style={{ marginTop: 0 }}>
                  {onArchiveDeparture && (
                    <button type="button" className="pmy-board-btn" disabled={Boolean(cardAction.busy)}
                      onClick={() => archiveOpenCard(!departureInfo[openCard.key]?.archivedAt)}>
                      {cardAction.busy === "archive" ? "…" : departureInfo[openCard.key]?.archivedAt ? tr("Desarquivar", "Unarchive") : tr("Arquivar", "Archive")}
                    </button>
                  )}
                  {onDeleteDepartureCard && !cardAction.confirmDelete && (
                    <button type="button" className="pmy-board-btn is-danger-text" disabled={Boolean(cardAction.busy)}
                      onClick={() => setCardAction({ busy: "", error: "", confirmDelete: true })}>
                      {tr("Excluir cartão", "Delete card")}
                    </button>
                  )}
                </div>
                {cardAction.confirmDelete && (
                  <div className="pmy-board-confirm" role="alertdialog" aria-label={tr("Confirmar exclusão", "Confirm delete")}>
                    <p>{openCard.bookings.length
                      ? tr("Esta saída tem reservas, então o cartão não pode ser excluído. Use \"Arquivar\" para tirá-lo do Quadro.", "This departure has bookings, so the card cannot be deleted. Use \"Archive\" instead.")
                      : tr("Excluir apaga os checklists, observações, etiquetas e arquivos deste cartão e tira os guias escalados. Não dá para desfazer.", "Deleting removes this card's checklists, notes, labels and files and unassigns its guides. This cannot be undone.")}</p>
                    <div className="pmy-support-actions" style={{ marginTop: 6 }}>
                      {!openCard.bookings.length && (
                        <button type="button" className="pmy-board-btn is-danger" disabled={Boolean(cardAction.busy)} onClick={deleteOpenCard}>
                          {cardAction.busy === "delete" ? "…" : tr("Excluir de vez", "Delete permanently")}
                        </button>
                      )}
                      <button type="button" className="pmy-board-btn" disabled={Boolean(cardAction.busy)} onClick={() => setCardAction({ busy: "", error: "", confirmDelete: false })}>{tr("Cancelar", "Cancel")}</button>
                    </div>
                  </div>
                )}
                {cardAction.error && <p className="pmy-support-error" role="alert">{cardAction.error}</p>}
              </div>
            )}

            {requestJson && (
              <ActivityPanel targetType="departure" targetKey={openCard.key} requestJson={requestJson} lang={lang}
                refreshKey={JSON.stringify([departureInfo[openCard.key], openCard.guides])} />
            )}
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
      {openTask && (
        <SupportModal key={openTask.id} card={openTask} guides={guides} handlers={supportHandlers || {}} loadImage={loadImage} requestJson={requestJson} lang={lang} onClose={() => setOpenTaskId("")} />
      )}
      {trelloOpen && (
        <TrelloImportDialog
          tours={tours}
          lang={lang}
          loadBoard={loadTrelloBoard}
          onImport={async (plan) => { const summary = await onImportTrello(plan); setTrelloDone(true); return summary; }}
          // Depois de importar, recarrega a Central para trazer as saídas novas.
          onClose={() => { setTrelloOpen(false); if (trelloDone) window.location.reload(); }}
        />
      )}
    </section>
  );
}

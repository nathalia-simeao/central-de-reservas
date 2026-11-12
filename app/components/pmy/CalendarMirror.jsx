// Agenda → Calendário: espelho do Quadro, só para consultar.
// Mostra as mesmas saídas e demandas do Quadro (mesmo modelo: buildBoardColumns),
// em dia, 3 dias, semana, mês, trimestre, semestre e ano. Clicar abre um resumo
// só de leitura; para mudar qualquer coisa, "Editar no Quadro" leva ao cartão.

import { useEffect, useMemo, useRef, useState } from "react";
import { contrastText, normalizeAgendaLabels, tourColor } from "../../utils/agenda-labels.js";
import { addDays, buildBoardColumns, cardLabelIds } from "../../utils/agenda-board.js";
import { autoChecklists, normalizeChecklists } from "../../utils/departure-checklists.js";
import { cardChecklists } from "../../utils/board-tasks.js";
import { languageLabel } from "../../utils/tour-languages.js";
import { guideNameFromTitle, matchGuide, normalizeText } from "../../utils/trello-import.js";
import AuthedImage, { isPreviewableImage } from "./AuthedImage";
import { Button, DatePicker, Tabs } from "./PmyUI";

const LANG_COLORS = { en: "#0c66e4", pt: "#1f845a", es: "#c9372c", fr: "#6e5dc6", it: "#b65c02", de: "#44546f" };
const CHUNK = 60; // dias por busca de reservas
const EPOCH = "2020-01-06";

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}
const toUTC = (key) => { const [y, m, d] = key.split("-").map(Number); return Date.UTC(y, m - 1, d, 12); };
const keyOf = (ms) => new Date(ms).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 86400000);
const weekdayIndex = (key) => (new Date(toUTC(key)).getUTCDay() + 6) % 7; // segunda = 0
const firstOfMonth = (key) => `${key.slice(0, 7)}-01`;
function addMonths(key, n) {
  const [y, m] = key.split("-").map(Number);
  return keyOf(Date.UTC(y, m - 1 + n, 1, 12));
}
const lastOfMonth = (key) => addDays(addMonths(key, 1), -1);

const VIEW_MONTHS = { month: 1, quarter: 3, semester: 6, year: 12 };
const VIEW_DAYS = { "1d": 1, "3d": 3, "7d": 7 };

/** Primeiro e último dia mostrados (as grades de mês completam a semana). */
export function calendarRange(view, anchor) {
  if (VIEW_DAYS[view]) {
    const start = view === "7d" ? addDays(anchor, -weekdayIndex(anchor)) : anchor;
    return { start, end: addDays(start, VIEW_DAYS[view] - 1), months: [] };
  }
  const span = VIEW_MONTHS[view] || 1;
  const month = Number(anchor.slice(5, 7)) - 1;
  const firstMonth = `${anchor.slice(0, 4)}-${String(Math.floor(month / span) * span + 1).padStart(2, "0")}-01`;
  const months = Array.from({ length: span }, (_, i) => addMonths(firstMonth, i));
  const start = addDays(months[0], -weekdayIndex(months[0]));
  const last = lastOfMonth(months[months.length - 1]);
  const end = addDays(last, 6 - weekdayIndex(last));
  return { start, end, months };
}

/** Próximo período (ou anterior, com step = -1). */
export function shiftAnchor(view, anchor, step) {
  if (VIEW_DAYS[view]) return addDays(anchor, VIEW_DAYS[view] * step);
  return addMonths(firstOfMonth(anchor), (VIEW_MONTHS[view] || 1) * step);
}

function fmt(key, lang, options) {
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pt-PT", { timeZone: "UTC", ...options }).format(new Date(toUTC(key)));
}

function periodLabel(view, anchor, range, lang) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  if (view === "1d") return fmt(anchor, lang, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (VIEW_DAYS[view]) return `${fmt(range.start, lang, { day: "numeric", month: "short" })} – ${fmt(range.end, lang, { day: "numeric", month: "short", year: "numeric" })}`;
  const year = anchor.slice(0, 4);
  const month = Number(anchor.slice(5, 7)) - 1;
  if (view === "month") {
    const label = fmt(anchor, lang, { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  if (view === "quarter") return `${tr(`${Math.floor(month / 3) + 1}º trimestre`, `Q${Math.floor(month / 3) + 1}`)} ${year}`;
  if (view === "semester") return `${tr(`${Math.floor(month / 6) + 1}º semestre`, `H${Math.floor(month / 6) + 1}`)} ${year}`;
  return year;
}

function blocksOn(blockedDates, dateKey) {
  const weekday = String(new Date(toUTC(dateKey)).getUTCDay());
  return (blockedDates || []).filter((b) => b?.active && (
    (b.date && String(b.date).slice(0, 10) === dateKey) || (b.dayOfWeek && String(b.dayOfWeek) === weekday)
  ));
}

const pax = (b) => {
  const explicit = Number(b?.totalParticipants || 0);
  if (explicit > 0) return explicit;
  const sum = ["adults", "children", "youths", "seniors"].reduce((s, k) => s + Number(b?.[k] || 0), 0);
  return sum > 0 ? sum : 1;
};

/* ---------- Janela (mesmo visual dos cartões do Quadro) ---------- */
function MirrorShell({ color, eyebrow, title, subtitle, onClose, onBack, nav = null, footer, children, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      // Setas do teclado: passeio anterior / seguinte do mesmo dia.
      if (nav && e.key === "ArrowLeft" && !/INPUT|TEXTAREA/.test(e.target?.tagName || "")) nav.prev();
      if (nav && e.key === "ArrowRight" && !/INPUT|TEXTAREA/.test(e.target?.tagName || "")) nav.next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, nav]);
  return (
    <div className="pmy-board-modal pmy-mirror">
      <button type="button" className="pmy-board-modal__backdrop" aria-label={tr("Fechar", "Close")} tabIndex={-1} onClick={onClose} />
      <div className="pmy-board-modal__card" role="dialog" aria-modal="true" aria-label={title} style={color ? { "--tour-color": color } : undefined}>
        <div className="pmy-board-modal__head">
          <div>
            {onBack && <button type="button" className="pmy-mirror__back" onClick={onBack}>‹ {tr("Voltar ao dia", "Back to day")}</button>}
            {eyebrow && <small className="pmy-board-modal__collection">{eyebrow}</small>}
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="pmy-mirror__head-actions">
            {nav && (
              <div className="pmy-mirror__nav" role="group" aria-label={tr("Outros passeios do dia", "Other tours this day")}>
                <button type="button" onClick={nav.prev} aria-label={tr("Passeio anterior do dia", "Previous tour this day")}>‹</button>
                <span>{nav.index + 1} {tr("de", "of")} {nav.total}</span>
                <button type="button" onClick={nav.next} aria-label={tr("Próximo passeio do dia", "Next tour this day")}>›</button>
              </div>
            )}
            <button type="button" className="pmy-board-pop__icon" aria-label={tr("Fechar", "Close")} onClick={onClose}>×</button>
          </div>
        </div>
        {children}
        {footer && <div className="pmy-mirror__footer">{footer}</div>}
      </div>
    </div>
  );
}

function ReadOnlyChecklist({ title, items, isDone }) {
  const done = items.filter(isDone).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  return (
    <div className="pmy-mirror__checklist">
      <div className="pmy-mirror__checklist-head"><strong>{title}</strong><small>{done}/{items.length}</small></div>
      <div className={`pmy-mirror__bar${pct === 100 ? " is-complete" : ""}`}><i style={{ width: `${pct}%` }} /></div>
      <ul>
        {items.map((item) => (
          <li key={item.key || item.id} className={isDone(item) ? "is-done" : ""}>
            <span className="pmy-mirror__box" aria-hidden="true">{isDone(item) ? "✓" : ""}</span>{item.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilesList({ files, basePath, loadImage, onOpen, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  if (!files.length) return null;
  return (
    <div className="pmy-board-modal__section">
      <span className="pmy-board-pop__sub">{tr("Arquivos", "Files")}</span>
      {loadImage && files.some(isPreviewableImage) && (
        <div className="pmy-attach-thumbs">
          {files.filter(isPreviewableImage).map((file) => (
            <AuthedImage key={file.id} path={`${basePath}/${file.id}`} loadImage={loadImage} alt={file.fileName} className="pmy-attach-thumb" onClick={onOpen ? () => onOpen(file.id) : undefined} />
          ))}
        </div>
      )}
      <div className="pmy-departure-tags__files">
        {files.map((file) => (
          <span key={file.id} className="pmy-departure-file">
            {onOpen ? <button type="button" className="pmy-departure-file__open" onClick={() => onOpen(file.id)}>📎 {file.fileName}</button> : <>📎 {file.fileName}</>}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Guias escritos nos checklists do Trello que não estão escalados nesta saída. */
export function trelloGuideGaps(info, card, guides = [], aliases = {}) {
  const assignedIds = new Set((card.guides || []).map((g) => g.guideId));
  const assignedFirst = new Set((card.guides || []).map((g) => normalizeText(g.name).split(" ")[0]));
  const gaps = new Map();
  for (const list of normalizeChecklists(info?.checklists).lists) {
    if (!String(list.id).startsWith("trello_")) continue;
    const name = guideNameFromTitle(list.title);
    if (!name || gaps.has(name)) continue;
    const guide = matchGuide(name, guides, aliases);
    if (guide ? assignedIds.has(guide.id) : assignedFirst.has(normalizeText(name).split(" ")[0])) continue;
    gaps.set(name, { name, guideName: guide?.name || null, inTeam: Boolean(guide) });
  }
  return [...gaps.values()];
}

export function TrelloGuideCheck({ gaps, lang = "pt" }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  if (!gaps.length) return null;
  return (
    <ul className="pmy-mirror__gaps" role="status">
      {gaps.map((gap) => (
        <li key={gap.name}>
          ⚠ {tr("No Trello:", "In Trello:")} <b>{gap.name}</b>{gap.guideName && gap.guideName !== gap.name ? ` (${gap.guideName})` : ""} — {gap.inTeam
            ? tr("está na Equipe, mas não foi escalado nesta saída.", "is in the Team but not assigned here.")
            : tr("não está cadastrado(a) na Equipe da Central.", "is not registered in the Central Team.")}
        </li>
      ))}
    </ul>
  );
}

function DepartureDetail({ card, info, agendaLabels, tagById, collections, guides = [], aliases = {}, nav, onOpenBoard, onOpenAttachment, loadImage, onClose, onBack, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const labelIds = cardLabelIds(agendaLabels, card).filter((id) => tagById.has(id));
  const state = normalizeChecklists(info?.checklists);
  const autos = autoChecklists(card);
  const notes = Array.isArray(info?.guideNotes) ? info.guideNotes : [];
  const gaps = trelloGuideGaps(info, card, guides, aliases);
  return (
    <MirrorShell
      lang={lang} onClose={onClose} onBack={onBack} nav={nav}
      color={tourColor(agendaLabels, card.tourId)}
      eyebrow={collections.join(" · ")}
      title={card.title}
      subtitle={`${fmt(card.dateKey, lang, { weekday: "long", day: "numeric", month: "long" })} · ${card.timeKey} · ${card.pax} ${tr("confirmadas", "confirmed")}${card.pending ? ` · ${card.pending} ${tr("aguardando pagamento", "awaiting payment")}` : ""}`}
      footer={(
        <>
          <span className="pmy-mirror__readonly">{tr("Só visualização. As mudanças são feitas no Quadro.", "View only. Changes are made on the board.")}</span>
          <Button type="button" variant="primary" size="sm" onClick={() => onOpenBoard({ dateKey: card.dateKey, key: card.key })}>{tr("Editar no Quadro", "Edit on board")}</Button>
        </>
      )}
    >
      {labelIds.length > 0 && (
        <div className="pmy-board-modal__section">
          <span className="pmy-board-pop__sub">{tr("Etiquetas", "Labels")}</span>
          <div className="pmy-board-modal__labels">
            {labelIds.map((id) => { const tag = tagById.get(id); return <span key={id} className="pmy-board-label is-static" style={{ background: tag.color, color: contrastText(tag.color) }}>{tag.name || " "}</span>; })}
          </div>
        </div>
      )}

      <div className="pmy-board-modal__section">
        <span className="pmy-board-pop__sub">{tr("Guias", "Guides")}</span>
        {card.guides.length ? (
          <ul className="pmy-mirror__guides">
            {card.guides.map((g) => (
              <li key={g.assignmentId}>
                <b>{g.name}</b>
                {(g.languages || []).length
                  ? g.languages.map((l) => <span key={l} className="pmy-guide-lang" style={{ background: LANG_COLORS[l] || "#626f86" }}>{languageLabel(l, lang)}</span>)
                  : <small>{tr("todos os idiomas", "all languages")}</small>}
              </li>
            ))}
          </ul>
        ) : <p className="pmy-mirror__empty">{tr("Nenhum guia escalado.", "No guide assigned.")}</p>}
        <TrelloGuideCheck gaps={gaps} lang={lang} />
      </div>

      {card.bookings.length > 0 && (
        <div className="pmy-board-modal__section">
          <span className="pmy-board-pop__sub">{tr("Clientes", "Guests")} ({card.bookings.length})</span>
          <ul className="pmy-board-guests">
            {card.bookings.map((b) => (
              <li key={b.id}>
                <span>{b.customerName || b.leadTravelerName || tr("Cliente", "Guest")}</span>
                <small>{[b.platform, b.language, `${pax(b)} pax`, b.status === "PENDING" ? tr("aguardando pagamento", "awaiting payment") : ""].filter(Boolean).join(" · ")}</small>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(autos.length > 0 || state.lists.length > 0) && (
        <div className="pmy-board-modal__section">
          <span className="pmy-board-pop__sub">{tr("Checklists", "Checklists")}</span>
          {autos.map((list) => <ReadOnlyChecklist key={list.id} title={list.title} items={list.items} isDone={(item) => Boolean(state.auto[item.key]?.done)} />)}
          {state.lists.map((list) => <ReadOnlyChecklist key={list.id} title={list.title} items={list.items} isDone={(item) => item.done} />)}
        </div>
      )}

      {notes.length > 0 && (
        <div className="pmy-board-modal__section">
          <span className="pmy-board-pop__sub">{tr("Observações", "Notes")}</span>
          <div className="pmy-departure-tags__notes">
            {notes.map((note, i) => <p key={i}>📝 {note.text} {note.by && <small>— {note.by}</small>}</p>)}
          </div>
        </div>
      )}

      <FilesList files={info?.attachments || []} basePath="/saida/anexo" loadImage={loadImage} onOpen={onOpenAttachment} lang={lang} />
    </MirrorShell>
  );
}

function TaskDetail({ task, guides, nav, onOpenBoard, onOpenAttachment, loadImage, onClose, onBack, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const people = (task.assigneeIds || []).map((id) => guides.find((g) => g.id === id)?.name).filter(Boolean);
  const lists = normalizeChecklists(cardChecklists(task.checklists)).lists;
  return (
    <MirrorShell
      lang={lang} onClose={onClose} onBack={onBack} nav={nav}
      eyebrow={tr("Demanda (sem passeio)", "Task (no tour)")}
      title={task.title}
      subtitle={[fmt(task.dateKey, lang, { weekday: "long", day: "numeric", month: "long" }), task.time, task.done ? tr("concluída", "done") : ""].filter(Boolean).join(" · ")}
      footer={(
        <>
          <span className="pmy-mirror__readonly">{tr("Só visualização. As mudanças são feitas no Quadro.", "View only. Changes are made on the board.")}</span>
          <Button type="button" variant="primary" size="sm" onClick={() => onOpenBoard({ dateKey: task.dateKey, taskId: task.id })}>{tr("Editar no Quadro", "Edit on board")}</Button>
        </>
      )}
    >
      <div className="pmy-board-modal__section">
        <span className="pmy-board-pop__sub">{tr("Responsáveis", "Assignees")}</span>
        <p className="pmy-mirror__empty">{people.length ? people.join(", ") : tr("Ninguém ainda.", "Nobody yet.")}</p>
      </div>
      {task.body && (
        <div className="pmy-board-modal__section">
          <span className="pmy-board-pop__sub">{tr("Descrição", "Description")}</span>
          <p className="pmy-support-body">{task.body}</p>
        </div>
      )}
      {lists.length > 0 && (
        <div className="pmy-board-modal__section">
          <span className="pmy-board-pop__sub">{tr("Checklists", "Checklists")}</span>
          {lists.map((list) => <ReadOnlyChecklist key={list.id} title={list.title} items={list.items} isDone={(item) => item.done} />)}
        </div>
      )}
      <FilesList files={task.attachments || []} basePath="/suporte/anexo" loadImage={loadImage} onOpen={onOpenAttachment} lang={lang} />
    </MirrorShell>
  );
}

function DayDetail({ dateKey, items, blocks, agendaLabels, onPick, onOpenBoard, onClose, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const label = fmt(dateKey, lang, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <MirrorShell
      lang={lang} onClose={onClose}
      title={label.charAt(0).toUpperCase() + label.slice(1)}
      subtitle={items.length ? `${items.length} ${items.length === 1 ? tr("item no Quadro", "item on the board") : tr("itens no Quadro", "items on the board")}` : tr("Nada agendado neste dia.", "Nothing scheduled.")}
      footer={(
        <>
          <span className="pmy-mirror__readonly">{items.length ? tr("Clique num passeio para ver os detalhes.", "Click a tour for details.") : tr("Para criar um cartão neste dia, use o Quadro.", "To add a card on this day, use the board.")}</span>
          <Button type="button" variant="secondary" size="sm" onClick={() => onOpenBoard({ dateKey })}>{tr("Abrir este dia no Quadro", "Open this day on the board")}</Button>
        </>
      )}
    >
      {blocks.length > 0 && (
        <p className="pmy-mirror__blocks">🔒 {blocks.length === 1 ? tr("1 bloqueio de disponibilidade neste dia", "1 availability block on this day") : tr(`${blocks.length} bloqueios de disponibilidade neste dia`, `${blocks.length} availability blocks on this day`)}
          {": "}{blocks.map((b) => [b.tour?.title || tr("todos os passeios", "all tours"), b.timeSlot && b.timeSlot !== "ALL" ? b.timeSlot : ""].filter(Boolean).join(" ")).join("; ")}</p>
      )}
      {items.length > 0 && (
        <ul className="pmy-mirror__day-list">
          {items.map((item) => item.kind === "task" ? (
            <li key={item.task.id}>
              <button type="button" className="pmy-mirror__row is-task" onClick={() => onPick(item)}>
                <b>{item.task.time || "—"}</b>
                <span><strong>{item.task.title}</strong><small>{item.task.done ? tr("Demanda concluída", "Task done") : tr("Demanda", "Task")}</small></span>
              </button>
            </li>
          ) : (
            <li key={item.card.key}>
              <button type="button" className="pmy-mirror__row" style={{ "--tour-color": tourColor(agendaLabels, item.card.tourId) }} onClick={() => onPick(item)}>
                <b>{item.card.timeKey}</b>
                <span>
                  <strong>{item.card.title}</strong>
                  <small>{[`${item.card.pax} pax${item.card.pending ? ` +${item.card.pending}` : ""}`, item.card.guides.length ? item.card.guides.map((g) => g.name).join(", ") : tr("sem guia", "no guide")].join(" · ")}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </MirrorShell>
  );
}

/* ---------- Calendário ---------- */
export default function CalendarMirror({
  bookings = [], assignments = [], tours = [], guides = [], agendaLabels = null,
  departureTags = {}, departureInfo = {}, supportCards = [], blockedDates = [],
  loadBookings = null, loadImage = null, onOpenAttachment = null, onOpenSupportAttachment = null,
  onOpenBoard, view = "month", onViewChange, trelloAliases = {}, lang = "pt",
}) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [anchor, setAnchor] = useState(todayKey);
  const [dayKey, setDayKey] = useState("");
  const [detail, setDetail] = useState(null); // { kind: "departure", key } | { kind: "task", id }
  const [extraBookings, setExtraBookings] = useState([]);
  const fetchedRef = useRef(new Set());
  const today = todayKey();

  const range = useMemo(() => calendarRange(view, anchor), [view, anchor]);

  // Reservas do período inteiro (a Central só carrega ~1 mês ao abrir).
  useEffect(() => {
    if (typeof loadBookings !== "function") return undefined;
    let alive = true;
    const wanted = [];
    // Blocos fixos de 60 dias (a partir de 2020) para não buscar o mesmo período duas vezes.
    const startChunk = addDays(EPOCH, Math.floor(daysBetween(EPOCH, range.start) / CHUNK) * CHUNK);
    for (let from = startChunk; from <= range.end; from = addDays(from, CHUNK)) {
      if (fetchedRef.current.has(from)) continue;
      fetchedRef.current.add(from);
      wanted.push(from);
    }
    if (!wanted.length) return undefined;
    Promise.all(wanted.map((from) => loadBookings(from, addDays(from, CHUNK + 1)).catch(() => { fetchedRef.current.delete(from); return []; })))
      .then((lists) => {
        if (!alive) return;
        setExtraBookings((current) => {
          const byId = new Map(current.map((b) => [b.id, b]));
          for (const list of lists) for (const b of list || []) if (b?.id) byId.set(b.id, b);
          return [...byId.values()];
        });
      });
    return () => { alive = false; };
  }, [loadBookings, range.start, range.end]);

  const allBookings = useMemo(() => {
    if (!extraBookings.length) return bookings;
    const byId = new Map(extraBookings.map((b) => [b.id, b]));
    for (const b of bookings) byId.set(b.id, b);
    return [...byId.values()];
  }, [bookings, extraBookings]);

  const itemsByDate = useMemo(() => {
    const cols = buildBoardColumns({ startDateKey: range.start, days: daysBetween(range.start, range.end) + 1, bookings: allBookings, assignments, departureTags, departureInfo, tours });
    const map = new Map();
    for (const col of cols) {
      map.set(col.dateKey, col.cards.filter((c) => !departureInfo[c.key]?.archivedAt).map((card) => ({ kind: "departure", time: card.timeKey, card })));
    }
    for (const task of supportCards) {
      if (!task.dateKey || task.archivedAt || !map.has(task.dateKey)) continue;
      map.get(task.dateKey).push({ kind: "task", time: task.time || "99:99", task });
    }
    for (const list of map.values()) list.sort((a, b) => a.time.localeCompare(b.time));
    return map;
  }, [range.start, range.end, allBookings, assignments, departureTags, departureInfo, tours, supportCards]);

  const { tags } = normalizeAgendaLabels(agendaLabels);
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);
  const collectionsByTour = useMemo(() => new Map(tours.map((t) => {
    const list = t?.shopifySnapshot?.collections || t?.collections || [];
    return [t.id, (Array.isArray(list) ? list : []).map((c) => (typeof c === "string" ? c : c?.title)).filter(Boolean)];
  })), [tours]);

  const itemsOn = (key) => itemsByDate.get(key) || [];
  const findCard = (key) => { for (const list of itemsByDate.values()) for (const it of list) if (it.kind === "departure" && it.card.key === key) return it.card; return null; };
  const openItem = (item) => setDetail(item.kind === "task" ? { kind: "task", id: item.task.id } : { kind: "departure", key: item.card.key });
  const closeAll = () => { setDetail(null); setDayKey(""); };

  const views = [
    { value: "1d", label: tr("Dia", "Day") },
    { value: "3d", label: tr("3 dias", "3 days") },
    { value: "7d", label: tr("Semana", "Week") },
    { value: "month", label: tr("Mês", "Month") },
    { value: "quarter", label: tr("Trimestre", "Quarter") },
    { value: "semester", label: tr("Semestre", "Half-year") },
    { value: "year", label: tr("Ano", "Year") },
  ];
  const weekdayNames = lang === "en" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  const renderChip = (item, compact = false) => {
    if (item.kind === "task") {
      return (
        <button key={item.task.id} type="button" className={`pmy-cal-chip is-task${item.task.done ? " is-done" : ""}`} onClick={() => openItem(item)} title={item.task.title}>
          {item.task.time && <b>{item.task.time}</b>}<span>{item.task.done ? "✓ " : ""}{item.task.title}</span>
        </button>
      );
    }
    const { card } = item;
    const color = tourColor(agendaLabels, card.tourId);
    const people = card.pax + card.pending;
    const labelIds = cardLabelIds(agendaLabels, card).filter((id) => tagById.has(id));
    return (
      <button key={card.key} type="button" className="pmy-cal-chip" style={{ background: color, color: contrastText(color) }} onClick={() => openItem(item)}
        title={`${card.timeKey} · ${card.title} · ${people} pax`}>
        <b>{card.timeKey}</b>
        <span>{card.title}</span>
        {!compact && labelIds.length > 0 && <span className="pmy-cal-tag-dots" aria-hidden="true">{labelIds.slice(0, 3).map((id) => <i key={id} style={{ background: tagById.get(id).color }} />)}</span>}
        {people > 0 && <i className="pmy-cal-chip__pax">{people}</i>}
      </button>
    );
  };

  const dayButtonLabel = (key) => fmt(key, lang, { weekday: "long", day: "numeric", month: "long" });

  const renderMonthGrid = (monthKey) => {
    const first = monthKey;
    const start = addDays(first, -weekdayIndex(first));
    const last = lastOfMonth(first);
    const total = daysBetween(start, addDays(last, 6 - weekdayIndex(last))) + 1;
    return (
      <div className="pmy-cal-month">
        <div className="pmy-cal-month__head">{weekdayNames.map((n) => <span key={n}>{n}</span>)}</div>
        <div className="pmy-cal-month__grid">
          {Array.from({ length: total }, (_, i) => {
            const key = addDays(start, i);
            const outside = key.slice(0, 7) !== first.slice(0, 7);
            const items = itemsOn(key);
            const visible = items.length > 4 ? items.slice(0, 3) : items;
            const blocked = blocksOn(blockedDates, key).length > 0;
            return (
              <div key={key} className={`pmy-cal-cell${outside ? " is-outside" : ""}${key === today ? " is-today" : ""}`}>
                <button type="button" className="pmy-cal-cell__day" onClick={() => setDayKey(key)} aria-label={dayButtonLabel(key)}>
                  <span className="pmy-cal-cell__num">{Number(key.slice(8))}</span>
                  {blocked && <span title={tr("Tem bloqueio de disponibilidade", "Has an availability block")}>🔒</span>}
                </button>
                <div className="pmy-cal-cell__items">
                  {visible.map((item) => renderChip(item, true))}
                  {items.length > visible.length && (
                    <button type="button" className="pmy-cal-more" onClick={() => setDayKey(key)}>+{items.length - visible.length} {tr("mais", "more")}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMiniMonth = (monthKey) => {
    const start = addDays(monthKey, -weekdayIndex(monthKey));
    const last = lastOfMonth(monthKey);
    const total = daysBetween(start, addDays(last, 6 - weekdayIndex(last))) + 1;
    const monthName = fmt(monthKey, lang, { month: "long" });
    const monthCount = Array.from({ length: Number(last.slice(8)) }, (_, i) => itemsOn(addDays(monthKey, i)).length).reduce((s, n) => s + n, 0);
    return (
      <section key={monthKey} className="pmy-cal-mini">
        <button type="button" className="pmy-cal-mini__title" onClick={() => { setAnchor(monthKey); onViewChange?.("month"); }}>
          <strong>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</strong>
          <small>{monthCount ? `${monthCount} ${monthCount === 1 ? tr("item", "item") : tr("itens", "items")}` : tr("vazio", "empty")}</small>
        </button>
        <div className="pmy-cal-mini__head">{weekdayNames.map((n) => <span key={n}>{n.charAt(0)}</span>)}</div>
        <div className="pmy-cal-mini__grid">
          {Array.from({ length: total }, (_, i) => {
            const key = addDays(start, i);
            if (key.slice(0, 7) !== monthKey.slice(0, 7)) return <span key={key} className="pmy-cal-mini__cell is-outside" aria-hidden="true" />;
            const items = itemsOn(key);
            const departures = items.filter((it) => it.kind === "departure");
            return (
              <button key={key} type="button" className={`pmy-cal-mini__cell${items.length ? " has-items" : ""}${key === today ? " is-today" : ""}`}
                onClick={() => setDayKey(key)}
                title={items.length ? `${dayButtonLabel(key)}: ${items.map((it) => (it.kind === "task" ? it.task.title : `${it.card.timeKey} ${it.card.title}`)).join(", ")}` : dayButtonLabel(key)}>
                <span>{Number(key.slice(8))}</span>
                {items.length > 0 && (
                  <span className="pmy-cal-mini__bars" aria-hidden="true">
                    {departures.slice(0, 3).map((it) => <i key={it.card.key} style={{ background: tourColor(agendaLabels, it.card.tourId) }} />)}
                    {items.length > departures.slice(0, 3).length && <i className="is-more" />}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>
    );
  };

  const renderDays = () => {
    const count = daysBetween(range.start, range.end) + 1;
    return (
      <div className="pmy-cal-days" style={{ "--cols": count }}>
        {Array.from({ length: count }, (_, i) => {
          const key = addDays(range.start, i);
          const items = itemsOn(key);
          const blocked = blocksOn(blockedDates, key).length > 0;
          const label = fmt(key, lang, { weekday: "short", day: "numeric", month: "short" });
          return (
            <div key={key} className={`pmy-cal-daycol${key === today ? " is-today" : ""}`}>
              <button type="button" className="pmy-cal-daycol__head" onClick={() => setDayKey(key)}>
                <span>{label}</span>{blocked && <span>🔒</span>}<small>{items.length || ""}</small>
              </button>
              <div className="pmy-cal-daycol__items">
                {items.length ? items.map((item) => (
                  item.kind === "task" ? renderChip(item) : (
                    <button key={item.card.key} type="button" className="pmy-cal-event" style={{ "--tour-color": tourColor(agendaLabels, item.card.tourId) }} onClick={() => openItem(item)}>
                      <b>{item.card.timeKey}</b>
                      <strong>{item.card.title}</strong>
                      <small>{`${item.card.pax} pax${item.card.pending ? ` +${item.card.pending}` : ""}`} · {item.card.guides.length ? item.card.guides.map((g) => g.name.split(" ")[0]).join(", ") : tr("sem guia", "no guide")}</small>
                    </button>
                  )
                )) : <p className="pmy-cal-daycol__empty">{tr("Livre", "Free")}</p>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const detailCard = detail?.kind === "departure" ? findCard(detail.key) : null;
  const detailTask = detail?.kind === "task" ? supportCards.find((c) => c.id === detail.id) : null;
  const back = dayKey ? () => setDetail(null) : null;
  // Setinhas ‹ › para ver os outros passeios do mesmo dia sem fechar a janela.
  const detailDate = detailCard?.dateKey || detailTask?.dateKey || "";
  const siblings = detailDate ? itemsOn(detailDate) : [];
  const detailIndex = siblings.findIndex((it) => (it.kind === "task" ? detail?.kind === "task" && it.task.id === detail.id : detail?.kind === "departure" && it.card.key === detail.key));
  const nav = siblings.length > 1 && detailIndex >= 0 ? {
    index: detailIndex,
    total: siblings.length,
    prev: () => openItem(siblings[(detailIndex - 1 + siblings.length) % siblings.length]),
    next: () => openItem(siblings[(detailIndex + 1) % siblings.length]),
  } : null;

  return (
    <div className="pmy-cal">
      <div className="pmy-cal__toolbar">
        <div className="pmy-cal__nav">
          <Button type="button" variant="secondary" size="sm" onClick={() => setAnchor(shiftAnchor(view, anchor, -1))} aria-label={tr("Período anterior", "Previous period")}>‹</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setAnchor(todayKey())}>{tr("Hoje", "Today")}</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setAnchor(shiftAnchor(view, anchor, 1))} aria-label={tr("Próximo período", "Next period")}>›</Button>
          <h3 className="pmy-cal__period">{periodLabel(view, anchor, range, lang)}</h3>
        </div>
        <div className="pmy-cal__controls">
          <div className="pmy-cal__jump">
            <DatePicker value={anchor} onChange={(e) => { const v = e?.target?.value ?? e; if (v) setAnchor(v); }}
              locale={lang === "en" ? "en-GB" : "pt-PT"} placeholder={lang === "en" ? "Go to date" : "Ir para data"}
              todayLabel={tr("Hoje", "Today")} clearLabel={tr("Limpar", "Clear")} />
          </div>
          <Tabs items={views} value={view} onChange={onViewChange} ariaLabel={tr("Visualização da agenda", "Calendar view")} />
        </div>
      </div>
      <p className="pmy-cal__hint">{tr("O calendário espelha o Quadro. Clique num passeio para ver o resumo; para mudar algo, use \"Editar no Quadro\".", "The calendar mirrors the board. Click a tour for a summary; edit it on the board.")}</p>

      {VIEW_DAYS[view] ? renderDays() : view === "month" ? renderMonthGrid(range.months[0]) : (
        <div className={`pmy-cal-months is-${view}`}>{range.months.map(renderMiniMonth)}</div>
      )}

      {detailCard ? (
        <DepartureDetail card={detailCard} info={departureInfo[detailCard.key]} agendaLabels={agendaLabels} tagById={tagById}
          collections={collectionsByTour.get(detailCard.tourId) || []} guides={guides} aliases={trelloAliases} nav={nav} onOpenBoard={onOpenBoard} onOpenAttachment={onOpenAttachment}
          loadImage={loadImage} onClose={closeAll} onBack={back} lang={lang} />
      ) : detailTask ? (
        <TaskDetail task={detailTask} guides={guides} nav={nav} onOpenBoard={onOpenBoard} onOpenAttachment={onOpenSupportAttachment}
          loadImage={loadImage} onClose={closeAll} onBack={back} lang={lang} />
      ) : dayKey ? (
        <DayDetail dateKey={dayKey} items={itemsOn(dayKey)} blocks={blocksOn(blockedDates, dayKey)} agendaLabels={agendaLabels}
          onPick={openItem} onOpenBoard={onOpenBoard} onClose={closeAll} lang={lang} />
      ) : null}
    </div>
  );
}

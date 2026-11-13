// Quadro da Agenda (estilo Trello): uma coluna por data, um cartão por saída
// (passeio + horário). Monta tudo a partir do que a Central já tem: reservas,
// escala de guias e o registro da saída (etiquetas, checks, observações, anexos).

import { languageKey } from "./tour-languages.js";

const LISBON = "Europe/Lisbon";

export function lisbonParts(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: LISBON, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(date).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
  );
  return { dateKey: `${parts.year}-${parts.month}-${parts.day}`, timeKey: `${parts.hour}:${parts.minute}` };
}

export function addDays(dateKey, days) {
  const [y, m, d] = String(dateKey).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export function boardKey(tourId, startTime) {
  const date = new Date(startTime);
  return `${tourId}|${Number.isNaN(date.getTime()) ? String(startTime) : date.toISOString()}`;
}

function passengers(booking) {
  const explicit = Number(booking?.totalParticipants || 0);
  if (explicit > 0) return explicit;
  const sum = ["adults", "children", "youths", "seniors"].reduce((acc, k) => acc + Number(booking?.[k] || 0), 0);
  return sum > 0 ? sum : 1;
}

const ACTIVE = new Set(["CONFIRMED", "PENDING"]);

/**
 * @returns [{ dateKey, cards: [{ key, tourId, startTime, timeKey, title, pax, present, pending,
 *            bookings, guides:[{assignmentId, guideId, name, languages}], tagIds, notes, attachments, checks }] }]
 */
export function buildBoardColumns({
  startDateKey,
  days = 14,
  bookings = [],
  assignments = [],
  departureTags = {},
  departureInfo = {},
  tours = [],
  splitByGuide = true,
}) {
  const dateKeys = Array.from({ length: days }, (_, i) => addDays(startDateKey, i));
  const inRange = new Set(dateKeys);
  const titles = new Map(tours.map((t) => [t.id, t.title]));
  const cards = new Map();

  const ensure = (tourId, startTime, title) => {
    if (!tourId || !startTime) return null;
    const parts = lisbonParts(startTime);
    if (!parts || !inRange.has(parts.dateKey)) return null;
    const key = boardKey(tourId, startTime);
    if (!cards.has(key)) {
      cards.set(key, {
        key, tourId, startTime: new Date(startTime).toISOString(), dateKey: parts.dateKey, timeKey: parts.timeKey,
        title: title || titles.get(tourId) || "Passeio",
        pax: 0, present: 0, pending: 0, bookings: [], guides: [], tagIds: [],
        notes: 0, attachments: 0, checks: 0,
      });
    }
    return cards.get(key);
  };

  for (const booking of bookings) {
    const status = String(booking?.status || "").toUpperCase();
    if (!ACTIVE.has(status) || booking?.syncStatus === "HOLD_RELEASED") continue;
    const card = ensure(booking.tourId, booking.startTime);
    if (!card) continue;
    const pax = passengers(booking);
    card.bookings.push(booking);
    if (status === "CONFIRMED") {
      card.pax += pax;
      if (String(booking.attendanceStatus || "").toUpperCase() === "COMPLETED") card.present += pax;
    } else {
      card.pending += pax;
    }
  }

  for (const a of assignments) {
    if (a?.status && String(a.status).toUpperCase() !== "ASSIGNED") continue;
    const card = ensure(a.tourId || a.tour?.id, a.startTime, a.tour?.title);
    if (!card) continue;
    card.guides.push({
      assignmentId: a.id,
      guideId: a.guideId || a.guide?.id,
      name: a.guide?.name || "Guia",
      languages: Array.isArray(a.languages) ? a.languages : [],
    });
  }

  // Saídas que só têm etiquetas, checklists ou observações (sem reserva nem guia)
  // também aparecem — é o caso dos cartões importados do Trello.
  for (const [key, tagIds] of Object.entries(departureTags)) {
    if (!tagIds?.length) continue;
    const [tourId, iso] = key.split("|");
    ensure(tourId, iso);
  }
  for (const [key, info] of Object.entries(departureInfo)) {
    const lists = info?.checklists?.lists;
    if (!info?.archivedAt && !(Array.isArray(lists) && lists.length) && !(Array.isArray(info?.guideNotes) && info.guideNotes.length)) continue;
    const [tourId, iso] = key.split("|");
    ensure(tourId, iso);
  }

  for (const card of cards.values()) {
    card.tagIds = departureTags[card.key] || [];
    const info = departureInfo[card.key] || {};
    card.notes = (info.guideNotes || []).length;
    card.attachments = (info.attachments || []).length;
    card.checks = [info.checkStartAt, info.checkMidAt, info.checkEndAt].filter(Boolean).length;
  }

  const byDate = new Map(dateKeys.map((k) => [k, []]));
  for (const card of cards.values()) {
    for (const piece of splitByGuide ? splitCardByGuide(card) : [{ ...card, uid: card.key }]) byDate.get(card.dateKey)?.push(piece);
  }
  return dateKeys.map((dateKey) => ({
    dateKey,
    cards: byDate.get(dateKey).sort((a, b) => a.timeKey.localeCompare(b.timeKey) || a.title.localeCompare(b.title)),
  }));
}

/**
 * Um cartão por guia (pedido da Nathalia, 13/11/2026): o mesmo passeio no mesmo
 * horário com 2+ guias vira um cartão para cada guia. Os clientes vão pelo grupo
 * escolhido na reserva (groupGuideId) ou pelo idioma escalado do guia; quem não
 * casar com ninguém fica num cartão "Sem guia" para a equipe ver.
 * `key` continua sendo a saída (passeio|horário) — etiquetas, anexos, observações
 * e checklists manuais são da saída —, e `uid` identifica o cartão na tela.
 */
export function splitCardByGuide(card) {
  const guides = card.guides || [];
  if (guides.length < 2) return [{ ...card, uid: card.key }];
  const buckets = new Map(guides.map((g) => [g.guideId || g.assignmentId, []]));
  const rest = [];
  const open = guides.find((g) => !(g.languages || []).length);
  for (const booking of card.bookings) {
    const byGroup = booking.groupGuideId && guides.find((g) => g.guideId === booking.groupGuideId);
    const lang = languageKey(booking.language);
    const byLang = !byGroup && lang && guides.find((g) => (g.languages || []).includes(lang));
    const target = byGroup || byLang || open;
    if (target) buckets.get(target.guideId || target.assignmentId).push(booking);
    else rest.push(booking);
  }
  const piece = (suffix, guideList, bookings) => {
    const confirmed = bookings.filter((b) => String(b.status || "").toUpperCase() === "CONFIRMED");
    return {
      ...card,
      uid: `${card.key}#${suffix}`,
      split: true,
      siblingGuides: guides,
      guides: guideList,
      bookings,
      pax: confirmed.reduce((sum, b) => sum + passengers(b), 0),
      present: confirmed.filter((b) => String(b.attendanceStatus || "").toUpperCase() === "COMPLETED").reduce((sum, b) => sum + passengers(b), 0),
      pending: bookings.filter((b) => String(b.status || "").toUpperCase() !== "CONFIRMED").reduce((sum, b) => sum + passengers(b), 0),
    };
  };
  const pieces = guides.map((g) => piece(g.guideId || g.assignmentId, [g], buckets.get(g.guideId || g.assignmentId)));
  if (rest.length) pieces.push(piece("sem-guia", [], rest));
  return pieces;
}

/** Listas manuais que aparecem neste cartão (quando a saída está dividida por guia). */
export function listsForCard(lists, card) {
  if (!card?.split) return lists || [];
  const words = (text) => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const firstName = (name) => words(name)[0] || "";
  const guide = card.guides?.[0] || null;
  const others = (card.siblingGuides || []).filter((g) => g.guideId !== guide?.guideId).map((g) => firstName(g.name)).filter(Boolean);
  return (lists || []).filter((list) => {
    if (list.guideId) return Boolean(guide) && list.guideId === guide.guideId;
    const titleWords = words(list.title);
    if (guide && titleWords.includes(firstName(guide.name))) return true;
    // Sem dono (nem guia marcado nem nome de outro guia no título): aparece em todos.
    return !others.some((n) => titleWords.includes(n));
  });
}

/** Etiquetas do cartão: as fixas do passeio (todas as saídas) + as desta saída. */
export function cardLabelIds(labels, card) {
  const key = labels?.colorAliases?.[card.tourId] || card.tourId;
  const fixed = labels?.tours?.[key]?.tagIds || labels?.tours?.[card.tourId]?.tagIds || [];
  return [...new Set([...fixed, ...(card.tagIds || [])])];
}

export function initials(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0]).toUpperCase();
}

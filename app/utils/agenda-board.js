// Quadro da Agenda (estilo Trello): uma coluna por data, um cartão por saída
// (passeio + horário). Monta tudo a partir do que a Central já tem: reservas,
// escala de guias e o registro da saída (etiquetas, checks, observações, anexos).

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

  // Saídas que só têm etiquetas/checks (sem reserva nem guia) também aparecem.
  for (const [key, tagIds] of Object.entries(departureTags)) {
    if (!tagIds?.length) continue;
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
  for (const card of cards.values()) byDate.get(card.dateKey)?.push(card);
  return dateKeys.map((dateKey) => ({
    dateKey,
    cards: byDate.get(dateKey).sort((a, b) => a.timeKey.localeCompare(b.timeKey) || a.title.localeCompare(b.title)),
  }));
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

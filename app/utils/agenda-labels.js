// Agenda colours and tags ("etiquetas"), chosen by the PMY management team.
//
// Stored on BusinessSetting.agendaLabels as:
//   {
//     tags:  [{ id, name, color }],                 // e.g. "Privado", "Com barco"
//     tours: { [tourId]: { color, tagIds: [] } },   // colour of each master tour
//   }
// A tour without a chosen colour gets a stable automatic colour from the palette,
// so the Agenda is readable before anyone configures anything.

export const AGENDA_PALETTE = [
  "#2563eb", // azul
  "#db2777", // rosa
  "#16a34a", // verde
  "#ea580c", // laranja
  "#7c3aed", // roxo
  "#0891b2", // ciano
  "#ca8a04", // mostarda
  "#dc2626", // vermelho
  "#4f46e5", // índigo
  "#0d9488", // verde-água
  "#9333ea", // violeta
  "#65a30d", // lima
];

const HEX_RE = /^#[0-9a-f]{6}$/i;
const MAX_TAGS = 40;
const MAX_TAG_NAME = 30;

function cleanColor(value) {
  const color = String(value || "").trim();
  return HEX_RE.test(color) ? color.toLowerCase() : null;
}

function hash(value) {
  let h = 0;
  for (const ch of String(value || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function automaticTourColor(tourId) {
  return AGENDA_PALETTE[hash(tourId) % AGENDA_PALETTE.length];
}

/** Tolerant normaliser: drops anything malformed, never throws. */
export function normalizeAgendaLabels(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const tags = [];
  const seen = new Set();
  for (const tag of Array.isArray(source.tags) ? source.tags : []) {
    const id = String(tag?.id || "").trim().slice(0, 64);
    const name = String(tag?.name || "").trim().slice(0, MAX_TAG_NAME);
    const color = cleanColor(tag?.color);
    if (!id || !name || !color || seen.has(id)) continue;
    seen.add(id);
    tags.push({ id, name, color });
    if (tags.length >= MAX_TAGS) break;
  }

  const tours = {};
  const rawTours = source.tours && typeof source.tours === "object" ? source.tours : {};
  for (const [tourId, value] of Object.entries(rawTours)) {
    const id = String(tourId || "").trim();
    if (!id) continue;
    const color = cleanColor(value?.color);
    const tagIds = [...new Set((Array.isArray(value?.tagIds) ? value.tagIds : [])
      .map((item) => String(item))
      .filter((item) => seen.has(item)))];
    if (!color && !tagIds.length) continue;
    tours[id] = { color, tagIds };
  }

  return { tags, tours };
}

export function tourColor(labels, tourId) {
  return normalizeAgendaLabels(labels).tours[tourId]?.color || automaticTourColor(tourId);
}

export function tourTags(labels, tourId) {
  const normalized = normalizeAgendaLabels(labels);
  const ids = normalized.tours[tourId]?.tagIds || [];
  return normalized.tags.filter((tag) => ids.includes(tag.id));
}

/** Readable text colour (black/white) for a given background. */
export function contrastText(hex) {
  const color = cleanColor(hex) || "#000000";
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#111827" : "#ffffff";
}

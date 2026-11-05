// Checklists dos cartões do Quadro, no formato que o Renan usa no Trello:
//
//   10h ESP (3p) 3A Dee            ← grupo: horário, idioma, pessoas, faixas, guia
//   ☐ Pronto(a) e no local de encontro
//   ☐ RAÚL NAHÁS (3A) +5435…        ← um item por reserva confirmada
//   ☐ Fim de tour
//
// Os checklists automáticos são montados a partir das reservas (não precisam ser
// criados); só o "marcado/desmarcado" fica salvo em TourDeparture.checklists.auto.
// Listas manuais ficam em TourDeparture.checklists.lists.

import { languageKey } from "./tour-languages.js";

const MAX_LISTS = 20;
const MAX_ITEMS = 60;
const MAX_TEXT = 200;

const LANG_ABBR = { en: "ENG", pt: "POR", es: "ESP", fr: "FRA", it: "ITA", de: "DEU", nl: "NLD", zh: "CHN", ar: "ARA", he: "HEB", ru: "RUS", ja: "JPN" };

const clean = (value, max = MAX_TEXT) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const newId = (prefix) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function normalizeChecklists(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const lists = (Array.isArray(source.lists) ? source.lists : []).slice(0, MAX_LISTS).map((list) => ({
    id: clean(list?.id, 64) || newId("cl"),
    title: clean(list?.title, 120) || "Checklist",
    items: (Array.isArray(list?.items) ? list.items : []).slice(0, MAX_ITEMS).map((item) => ({
      id: clean(item?.id, 64) || newId("it"),
      text: clean(item?.text),
      done: Boolean(item?.done),
      at: item?.at || null,
      by: clean(item?.by, 80) || null,
    })).filter((item) => item.text),
  }));
  const auto = {};
  for (const [key, value] of Object.entries(source.auto && typeof source.auto === "object" ? source.auto : {})) {
    if (value?.done) auto[clean(key, 120)] = { done: true, at: value.at || null, by: clean(value.by, 80) || null };
  }
  const hideDone = {};
  for (const [key, value] of Object.entries(source.hideDone && typeof source.hideDone === "object" ? source.hideDone : {})) {
    if (value) hideDone[clean(key, 120)] = true;
  }
  return { lists, auto, hideDone };
}

/** Aplica uma operação (feita no servidor, para duas pessoas não se atropelarem). */
export function applyChecklistOp(raw, op = {}, by = null, now = new Date()) {
  const state = normalizeChecklists(raw);
  const at = now.toISOString();
  const findList = (id) => state.lists.find((list) => list.id === id);
  switch (op.type) {
    case "addList": {
      if (state.lists.length >= MAX_LISTS) throw new Error("Limite de checklists atingido.");
      const items = (Array.isArray(op.items) ? op.items : []).map((text) => ({ id: newId("it"), text: clean(text), done: false, at: null, by: null })).filter((i) => i.text);
      state.lists.push({ id: newId("cl"), title: clean(op.title, 120) || "Checklist", items });
      break;
    }
    case "renameList": { const list = findList(op.listId); if (list) list.title = clean(op.title, 120) || list.title; break; }
    case "deleteList": state.lists = state.lists.filter((list) => list.id !== op.listId); break;
    case "addItem": {
      const list = findList(op.listId);
      const text = clean(op.text);
      if (list && text) {
        if (list.items.length >= MAX_ITEMS) throw new Error("Limite de itens atingido.");
        list.items.push({ id: newId("it"), text, done: false, at: null, by: null });
      }
      break;
    }
    case "toggleItem": {
      const item = findList(op.listId)?.items.find((i) => i.id === op.itemId);
      if (item) { item.done = !item.done; item.at = item.done ? at : null; item.by = item.done ? by : null; }
      break;
    }
    case "deleteItem": { const list = findList(op.listId); if (list) list.items = list.items.filter((i) => i.id !== op.itemId); break; }
    case "toggleAuto": {
      const key = clean(op.key, 120);
      if (key) { if (state.auto[key]?.done) delete state.auto[key]; else state.auto[key] = { done: true, at, by }; }
      break;
    }
    case "toggleHideDone": {
      const key = clean(op.listId, 120);
      if (key) { if (state.hideDone[key]) delete state.hideDone[key]; else state.hideDone[key] = true; }
      break;
    }
    default: throw new Error("Operação de checklist inválida.");
  }
  return state;
}

function ages(booking) {
  const parts = [["adults", "A"], ["youths", "J"], ["children", "C"], ["seniors", "S"]]
    .map(([field, letter]) => [Number(booking?.[field] || 0), letter])
    .filter(([n]) => n > 0)
    .map(([n, letter]) => `${n}${letter}`);
  if (parts.length) return parts.join(" ");
  const total = Number(booking?.totalParticipants || 0);
  return total ? `${total}A` : "";
}

function pax(booking) {
  const explicit = Number(booking?.totalParticipants || 0);
  if (explicit > 0) return explicit;
  const sum = ["adults", "children", "youths", "seniors"].reduce((acc, k) => acc + Number(booking?.[k] || 0), 0);
  return sum || 1;
}

function sumAges(bookings) {
  const totals = { A: 0, J: 0, C: 0, S: 0 };
  for (const b of bookings) {
    totals.A += Number(b.adults || 0); totals.J += Number(b.youths || 0);
    totals.C += Number(b.children || 0); totals.S += Number(b.seniors || 0);
  }
  return ["A", "J", "C", "S"].filter((k) => totals[k]).map((k) => `${totals[k]}${k}`).join(" ");
}

/**
 * Um checklist automático por grupo de idioma da saída (reservas confirmadas).
 * @param card { tourId, timeKey, bookings, guides: [{ name, languages }] }
 */
export function autoChecklists(card) {
  const confirmed = (card.bookings || []).filter((b) => String(b.status || "").toUpperCase() === "CONFIRMED");
  if (!confirmed.length) return [];
  const groups = new Map();
  for (const booking of confirmed) {
    const lang = languageKey(booking.language) || "";
    if (!groups.has(lang)) groups.set(lang, []);
    groups.get(lang).push(booking);
  }
  const hour = String(card.timeKey || "").replace(/^0/, "").replace(/:00$/, "h").replace(":", "h");
  return [...groups.entries()].map(([lang, bookings]) => {
    const people = bookings.reduce((sum, b) => sum + pax(b), 0);
    const guide = (card.guides || []).find((g) => (g.languages || []).includes(lang)) ||
      ((card.guides || []).length === 1 ? card.guides[0] : null);
    const listId = `auto:${lang || "any"}`;
    const title = [hour, LANG_ABBR[lang] || (lang ? lang.toUpperCase() : ""), `(${people}p)`, sumAges(bookings), guide ? String(guide.name).split(" ")[0] : ""]
      .filter(Boolean).join(" ");
    const items = [
      { key: `${listId}:ready`, text: "Pronto(a) e no local de encontro" },
      ...bookings.map((b) => ({
        key: `booking:${b.id}`,
        text: [clean(b.customerName, 80) || "Cliente", ages(b) ? `(${ages(b)})` : "", clean(b.customerPhone, 40)].filter(Boolean).join(" "),
      })),
      { key: `${listId}:end`, text: "Fim de tour" },
    ];
    return { id: listId, title, auto: true, items };
  });
}

/** Contagem para o selo do cartão (☑ feitos/total), juntando automáticos e manuais. */
export function checklistProgress(card, raw) {
  const state = normalizeChecklists(raw);
  let done = 0;
  let total = 0;
  for (const list of autoChecklists(card)) {
    for (const item of list.items) { total += 1; if (state.auto[item.key]?.done) done += 1; }
  }
  for (const list of state.lists) {
    for (const item of list.items) { total += 1; if (item.done) done += 1; }
  }
  return { done, total };
}

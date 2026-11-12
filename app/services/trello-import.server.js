// Grava na Central o que a prévia do Trello montou (ver app/utils/trello-import.js).
//
// Pode rodar mais de uma vez: o que veio do Trello é marcado ("trello_<id>" nos
// checklists, source "trello" nas observações, trelloId nos documentos de
// suporte) e é substituído, nunca duplicado. O que a equipe criou na Central
// fica como está.

import { normalizeChecklists } from "../utils/departure-checklists.js";
import { lisbonParts } from "../utils/agenda-board.js";
import { guideNameFromTitle, matchGuide, memberForGroup, normalizeText, noteTextForCard } from "../utils/trello-import.js";

const MAX_CARDS = 2000;
const MAX_LISTS = 20;
const TRELLO_PREFIX = "trello_";

/** "2026-11-12" + "09:30" em Lisboa → instante UTC (horário de verão incluído). */
export function lisbonLocalDateTimeToUtc(dateKey, timeKey) {
  if (!isDateKey(dateKey) || !isTime(timeKey)) return null;
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = timeKey.split(":").map(Number);
  const target = Date.UTC(y, m - 1, d, hh, mm);
  let guess = target;
  for (let i = 0; i < 2; i += 1) {
    const parts = lisbonParts(new Date(guess));
    const [py, pm, pd] = parts.dateKey.split("-").map(Number);
    const [ph, pmin] = parts.timeKey.split(":").map(Number);
    guess += target - Date.UTC(py, pm - 1, pd, ph, pmin);
  }
  return new Date(guess);
}

const asText = (value, max = 200) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const isDateKey = (value) => /^20\d{2}-\d{2}-\d{2}$/.test(String(value || ""));
const isTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));

function lisbonDayRange(dateKey) {
  const start = lisbonLocalDateTimeToUtc(dateKey, "00:00");
  const end = new Date(start.getTime() + 26 * 3600 * 1000);
  return { start: new Date(start.getTime() - 2 * 3600 * 1000), end };
}

/** Horários que a Central já conhece para o passeio no dia (reservas, guias, saídas). */
async function knownTimes(prisma, tourId, dateKey) {
  const { start, end } = lisbonDayRange(dateKey);
  const where = { tourId, startTime: { gte: start, lt: end } };
  const [bookings, assignments, departures] = await Promise.all([
    prisma.booking.findMany({ where: { ...where, status: { in: ["CONFIRMED", "PENDING"] } }, select: { startTime: true } }),
    prisma.guideAssignment.findMany({ where: { ...where, status: "ASSIGNED" }, select: { startTime: true } }),
    prisma.tourDeparture.findMany({ where, select: { startTime: true } }),
  ]);
  const times = new Set();
  for (const row of [...bookings, ...assignments, ...departures]) {
    const parts = lisbonParts(row.startTime);
    if (parts?.dateKey === dateKey) times.add(parts.timeKey);
  }
  return [...times];
}

function cleanPlanCard(raw) {
  return {
    trelloId: asText(raw?.trelloId, 64),
    name: asText(raw?.name, 160),
    listName: asText(raw?.listName, 80),
    tourId: asText(raw?.tourId, 64),
    dateKey: isDateKey(raw?.dateKey) ? raw.dateKey : null,
    desc: String(raw?.desc || "").slice(0, 4000),
    attachments: (Array.isArray(raw?.attachments) ? raw.attachments : []).slice(0, 30)
      .map((a) => ({ name: asText(a?.name, 160) || "Anexo", url: String(a?.url || "").slice(0, 1000) }))
      .filter((a) => /^https?:\/\//.test(a.url)),
    members: (Array.isArray(raw?.members) ? raw.members : []).slice(0, 20).map((m) => asText(m, 120)).filter(Boolean),
    groups: (Array.isArray(raw?.groups) ? raw.groups : []).slice(0, MAX_LISTS).map((g) => ({
      trelloId: asText(g?.trelloId, 64),
      title: asText(g?.title, 120) || "Checklist",
      time: isTime(g?.time) ? g.time : null,
      languages: (Array.isArray(g?.languages) ? g.languages : []).map((l) => asText(l, 8)).filter(Boolean),
      items: (Array.isArray(g?.items) ? g.items : []).slice(0, 60)
        .map((it) => ({ text: asText(it?.text), done: Boolean(it?.done) }))
        .filter((it) => it.text),
    })).filter((g) => g.trelloId),
  };
}

/**
 * plan: { cards: [{ ...cartão da prévia, tourId }], support: [...], assignGuides: boolean }
 * assignGuide: ({ tour, guide, startTime, languages }) => { ok, error }
 */
export async function importTrelloPlan({ prisma, plan, assignGuide, now = new Date() }) {
  const cards = (Array.isArray(plan?.cards) ? plan.cards : []).slice(0, MAX_CARDS).map(cleanPlanCard);
  const support = Array.isArray(plan?.support) ? plan.support.slice(0, 200) : [];
  const summary = {
    departures: 0, checklists: 0, notes: 0, guidesAssigned: 0, support: 0,
    unplaced: [], guideWarnings: [], skipped: 0,
  };

  const [tours, guides] = await Promise.all([
    prisma.tour.findMany({ select: { id: true, title: true } }),
    plan?.assignGuides === false ? [] : prisma.guide.findMany({ select: { id: true, name: true } }),
  ]);
  const tourById = new Map(tours.map((t) => [t.id, t]));
  const nowIso = now.toISOString();

  // 1) Cada grupo (checklist) vai para a saída passeio + data + horário.
  const buckets = new Map();
  const bucketFor = (tourId, startTime) => {
    const key = `${tourId}|${startTime.toISOString()}`;
    if (!buckets.has(key)) buckets.set(key, { tourId, startTime, lists: [], notes: [], guides: [] });
    return buckets.get(key);
  };
  const timesCache = new Map();
  const timesFor = async (tourId, dateKey) => {
    const key = `${tourId}|${dateKey}`;
    if (!timesCache.has(key)) timesCache.set(key, await knownTimes(prisma, tourId, dateKey));
    return timesCache.get(key);
  };

  for (const card of cards) {
    if (!card.tourId || !tourById.has(card.tourId) || !card.dateKey) { summary.skipped += 1; continue; }
    const cardTimes = [...new Set(card.groups.map((g) => g.time).filter(Boolean))];
    let fallback = cardTimes.length === 1 ? cardTimes[0] : null;
    if (!fallback && (card.groups.some((g) => !g.time) || !card.groups.length)) {
      const known = await timesFor(card.tourId, card.dateKey);
      if (known.length === 1) fallback = known[0];
    }

    const placed = new Set();
    for (const group of card.groups) {
      const time = group.time || fallback;
      if (!time) continue;
      const startTime = lisbonLocalDateTimeToUtc(card.dateKey, time);
      if (!startTime) continue;
      const bucket = bucketFor(card.tourId, startTime);
      bucket.lists.push(group);
      placed.add(bucket);
      // Guia: o membro do cartão citado no título; senão, o nome escrito no título
      // (muitos cartões do Trello não têm membros, só "… Miguel" no checklist).
      const titleName = guideNameFromTitle(group.title);
      const member = memberForGroup(group.title, card.members) || (!titleName && card.members.length === 1 ? card.members[0] : null);
      if (member || titleName) bucket.guides.push({ member, name: titleName, languages: group.languages, title: group.title, card });
    }
    if (!card.groups.length && fallback) {
      const bucket = bucketFor(card.tourId, lisbonLocalDateTimeToUtc(card.dateKey, fallback));
      placed.add(bucket);
      if (card.members.length === 1) bucket.guides.push({ member: card.members[0], languages: [], title: card.name, card });
    }
    const missing = card.groups.filter((g) => !(g.time || fallback)).length;
    if (!placed.size || missing) {
      summary.unplaced.push({
        list: card.listName, name: card.name,
        reason: card.groups.length ? `${missing || card.groups.length} checklist(s) sem horário` : "Cartão sem checklist e sem horário na Central",
      });
    }
    const note = noteTextForCard(card);
    if (note) for (const bucket of placed) bucket.notes.push({ trelloId: card.trelloId, text: note });
  }

  // 2) Grava cada saída: troca o que veio do Trello, mantém o resto.
  for (const bucket of buckets.values()) {
    const where = { tourId_startTime: { tourId: bucket.tourId, startTime: bucket.startTime } };
    const existing = await prisma.tourDeparture.findUnique({ where, select: { checklists: true, guideNotes: true } });
    const current = normalizeChecklists(existing?.checklists);
    const kept = current.lists.filter((list) => !String(list.id).startsWith(TRELLO_PREFIX));
    // O que a equipe marcou na Central continua marcado quando o Trello é lido de novo
    // (o mesmo item = mesma lista do Trello + mesmo texto).
    const markedHere = new Map();
    for (const list of current.lists) {
      if (!String(list.id).startsWith(TRELLO_PREFIX)) continue;
      for (const item of list.items) if (item.done) markedHere.set(`${list.id}|${normalizeText(item.text)}`, item);
    }
    const imported = bucket.lists.map((group) => {
      const listId = `${TRELLO_PREFIX}${group.trelloId}`.slice(0, 64);
      return {
        id: listId,
        title: group.title,
        items: group.items.map((item, index) => {
          const before = markedHere.get(`${listId}|${normalizeText(item.text)}`);
          const done = item.done || Boolean(before);
          return {
            id: `${TRELLO_PREFIX}${group.trelloId}_${index}`.slice(0, 64),
            text: item.text,
            done,
            at: done ? before?.at || nowIso : null,
            by: done ? before?.by || "Trello" : null,
          };
        }),
      };
    });
    const room = Math.max(0, MAX_LISTS - kept.length);
    if (imported.length > room) {
      summary.unplaced.push({ list: bucket.startTime.toISOString(), name: tourById.get(bucket.tourId)?.title || "", reason: `Limite de ${MAX_LISTS} checklists por saída` });
    }
    const checklists = normalizeChecklists({ ...current, lists: [...kept, ...imported.slice(0, room)] });

    const trelloIds = new Set(bucket.notes.map((n) => n.trelloId));
    const notes = (Array.isArray(existing?.guideNotes) ? existing.guideNotes : [])
      .filter((n) => !(n?.source === "trello" && trelloIds.has(n.trelloId)));
    const seen = new Set();
    for (const n of bucket.notes) {
      if (seen.has(n.trelloId)) continue;
      seen.add(n.trelloId);
      notes.push({ at: nowIso, by: "Trello", text: n.text, source: "trello", trelloId: n.trelloId });
    }

    await prisma.tourDeparture.upsert({
      where,
      create: { tourId: bucket.tourId, startTime: bucket.startTime, checklists, guideNotes: notes },
      update: { checklists, guideNotes: notes },
    });
    summary.departures += 1;
    summary.checklists += Math.min(imported.length, room);
    summary.notes += seen.size;

    // 3) Guias: membro do cartão cujo nome aparece no título do grupo.
    if (plan?.assignGuides === false || typeof assignGuide !== "function") continue;
    const tour = tourById.get(bucket.tourId);
    const done = new Set();
    for (const entry of bucket.guides) {
      const guide = (entry.member && matchGuide(entry.member, guides)) || (entry.name && matchGuide(entry.name, guides)) || null;
      if (!guide) {
        summary.guideWarnings.push(`${entry.card.listName} · ${entry.card.name}: "${entry.member || entry.name}" não está na Equipe da Central.`);
        continue;
      }
      if (done.has(guide.id)) continue;
      done.add(guide.id);
      const result = await assignGuide({ tour, guide, startTime: bucket.startTime, languages: entry.languages });
      if (result?.ok) summary.guidesAssigned += 1;
      else summary.guideWarnings.push(`${entry.card.listName} · ${entry.card.name}: ${guide.name} — ${result?.error || "não escalado"}`);
    }
  }

  // 4) Documentos de suporte.
  for (const [index, raw] of support.entries()) {
    const trelloId = asText(raw?.trelloId, 64);
    if (!trelloId) continue;
    const data = {
      title: asText(raw?.name, 160) || "Documento",
      body: String(raw?.desc || "").slice(0, 8000) || null,
      links: (Array.isArray(raw?.attachments) ? raw.attachments : []).slice(0, 40)
        .map((a) => ({ name: asText(a?.name, 160) || "Anexo", url: String(a?.url || "").slice(0, 1000) }))
        .filter((a) => /^https?:\/\//.test(a.url)),
      checklists: {
        lists: (Array.isArray(raw?.checklists) ? raw.checklists : []).slice(0, 20).map((cl, i) => ({
          id: `trello_${trelloId}_${i}`.slice(0, 64),
          title: asText(cl?.title, 120) || "Checklist",
          items: (Array.isArray(cl?.items) ? cl.items : []).slice(0, 60).map((it, j) => ({ id: `trello_${trelloId}_${i}_${j}`.slice(0, 64), text: asText(it?.text), done: Boolean(it?.done) })).filter((it) => it.text),
        })),
      },
      position: index,
    };
    await prisma.supportCard.upsert({ where: { trelloId }, create: { ...data, trelloId }, update: data });
    summary.support += 1;
  }

  return summary;
}

import test from "node:test";
import assert from "node:assert/strict";
import { importTrelloPlan } from "../app/services/trello-import.server.js";

function fakePrisma({ departures = [], bookings = [] } = {}) {
  const rows = new Map(departures.map((d) => [`${d.tourId}|${d.startTime.toISOString()}`, { ...d }]));
  const support = new Map();
  const inRange = (row, where) => row.tourId === where.tourId && row.startTime >= where.startTime.gte && row.startTime < where.startTime.lt;
  return {
    rows, support,
    tour: { findMany: async () => [{ id: "belem", title: "Belém Tour" }] },
    guide: { findMany: async () => [{ id: "g1", name: "Luís Cardoso de Meneses" }, { id: "g2", name: "Simone Silva" }] },
    booking: { findMany: async ({ where }) => bookings.filter((b) => inRange(b, where)) },
    guideAssignment: { findMany: async () => [] },
    tourDeparture: {
      findMany: async ({ where }) => [...rows.values()].filter((r) => inRange(r, where)),
      findUnique: async ({ where }) => rows.get(`${where.tourId_startTime.tourId}|${where.tourId_startTime.startTime.toISOString()}`) || null,
      upsert: async ({ where, create, update }) => {
        const key = `${where.tourId_startTime.tourId}|${where.tourId_startTime.startTime.toISOString()}`;
        rows.set(key, rows.has(key) ? { ...rows.get(key), ...update } : { ...create });
      },
    },
    supportCard: { upsert: async ({ where, create, update }) => support.set(where.trelloId, support.has(where.trelloId) ? { ...support.get(where.trelloId), ...update } : create) },
  };
}

const card = {
  trelloId: "c1", name: "Belem Tour", listName: "12/11 (Thursday)", tourId: "belem", dateKey: "2026-11-12",
  desc: "Mosteiro: entrada lateral", attachments: [{ name: "lista.pdf", url: "https://trello.com/1/x.pdf" }],
  members: ["Luis Cardoso de Meneses", "Simone Silva"],
  groups: [
    { trelloId: "k1", title: "09h30 ENG (12p) Luis | T1", time: "09:30", languages: ["en"], items: [{ text: "JOHN (2A)", done: true }, { text: "Fim de tour", done: false }] },
    { trelloId: "k2", title: "14h ENG (3p) 3A Simone | T3", time: "14:00", languages: ["en"], items: [{ text: "ANA (3A)", done: false }] },
  ],
};

test("each checklist lands on its departure, with note and guide", async () => {
  const prisma = fakePrisma({ departures: [{ tourId: "belem", startTime: new Date("2026-11-12T09:30:00Z"), checklists: { lists: [{ id: "cl_mine", title: "Da equipe", items: [] }] }, guideNotes: [{ at: "x", by: "Renan", text: "oi" }] }] });
  const calls = [];
  const summary = await importTrelloPlan({ prisma, plan: { cards: [card], support: [] }, assignGuide: async (a) => { calls.push(a); return { ok: true }; } });
  assert.equal(summary.departures, 2);
  assert.equal(summary.checklists, 2);
  const morning = prisma.rows.get("belem|2026-11-12T09:30:00.000Z"); // Lisboa = UTC em novembro
  assert.deepEqual(morning.checklists.lists.map((l) => l.id), ["cl_mine", "trello_k1"]);
  assert.equal(morning.checklists.lists[1].items[0].done, true);
  assert.equal(morning.guideNotes.length, 2);
  assert.match(morning.guideNotes[1].text, /entrada lateral[\s\S]*lista\.pdf/);
  assert.deepEqual(calls.map((c) => [c.guide.id, c.startTime.toISOString(), c.languages]), [
    ["g1", "2026-11-12T09:30:00.000Z", ["en"]],
    ["g2", "2026-11-12T14:00:00.000Z", ["en"]],
  ]);
});

test("running the import twice replaces, never duplicates", async () => {
  const prisma = fakePrisma();
  await importTrelloPlan({ prisma, plan: { cards: [card], assignGuides: false } });
  const changed = { ...card, groups: [{ ...card.groups[0], items: [{ text: "JOHN (2A)", done: true }] }] };
  await importTrelloPlan({ prisma, plan: { cards: [changed], assignGuides: false } });
  const morning = prisma.rows.get("belem|2026-11-12T09:30:00.000Z");
  assert.equal(morning.checklists.lists.length, 1);
  assert.equal(morning.checklists.lists[0].items.length, 1);
  assert.equal(morning.guideNotes.length, 1);
});

test("groups without time use the only time the Central knows, otherwise go to review", async () => {
  const prisma = fakePrisma({ bookings: [{ tourId: "belem", startTime: new Date("2026-11-23T10:00:00Z") }] });
  const noTime = { ...card, trelloId: "c9", dateKey: "2026-11-23", members: [], groups: [{ trelloId: "k9", title: "Grupo", time: null, languages: [], items: [{ text: "X", done: false }] }] };
  const lost = { ...noTime, trelloId: "c10", dateKey: "2026-11-24", groups: [{ ...noTime.groups[0], trelloId: "k10" }] };
  const summary = await importTrelloPlan({ prisma, plan: { cards: [noTime, lost], assignGuides: false } });
  assert.ok(prisma.rows.get("belem|2026-11-23T10:00:00.000Z"));
  assert.equal(summary.unplaced.length, 1);
  assert.equal(summary.unplaced[0].list, "12/11 (Thursday)");
});

test("cards without a chosen tour are skipped; support cards are saved by Trello id", async () => {
  const prisma = fakePrisma();
  const summary = await importTrelloPlan({ prisma, plan: { cards: [{ ...card, tourId: "" }], support: [{ trelloId: "s1", name: "Voucher Pastéis", attachments: [{ name: "v.pdf", url: "https://trello.com/v.pdf" }] }] } });
  assert.equal(summary.skipped, 1);
  assert.equal(summary.support, 1);
  assert.equal(prisma.support.get("s1").links[0].name, "v.pdf");
});

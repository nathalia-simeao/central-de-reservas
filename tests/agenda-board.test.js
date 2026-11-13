import test from "node:test";
import assert from "node:assert/strict";
import { buildBoardColumns, cardLabelIds, addDays, initials } from "../app/utils/agenda-board.js";

test("monta colunas por data e cartões por saída", () => {
  const cols = buildBoardColumns({
    startDateKey: "2026-11-10",
    days: 3,
    tours: [{ id: "t1", title: "Belém Tour" }, { id: "t2", title: "Torre de Belém" }],
    bookings: [
      { tourId: "t1", startTime: "2026-11-10T10:00:00Z", status: "CONFIRMED", adults: 2, attendanceStatus: "COMPLETED" },
      { tourId: "t1", startTime: "2026-11-10T10:00:00Z", status: "CONFIRMED", totalParticipants: 3 },
      { tourId: "t1", startTime: "2026-11-10T10:00:00Z", status: "CANCELED", adults: 5 },
      { tourId: "t2", startTime: "2026-11-11T11:00:00Z", status: "PENDING", adults: 1 },
      { tourId: "t2", startTime: "2026-11-20T11:00:00Z", status: "CONFIRMED", adults: 1 },
    ],
    assignments: [{ id: "a1", tourId: "t1", startTime: "2026-11-10T10:00:00Z", status: "ASSIGNED", guide: { id: "g1", name: "Maria Alves" }, languages: ["en"] }],
    departureTags: { "t2|2026-11-12T09:00:00.000Z": ["x"] },
    departureInfo: { "t1|2026-11-10T10:00:00.000Z": { attachments: [{}, {}], guideNotes: [{}], checkStartAt: "2026-11-10T10:01:00Z" } },
  });
  assert.deepEqual(cols.map((c) => c.dateKey), ["2026-11-10", "2026-11-11", "2026-11-12"]);
  const card = cols[0].cards[0];
  assert.equal(card.title, "Belém Tour");
  assert.equal(card.timeKey, "10:00");
  assert.equal(card.pax, 5);
  assert.equal(card.present, 2);
  assert.equal(card.guides[0].name, "Maria Alves");
  assert.equal(card.attachments, 2);
  assert.equal(card.notes, 1);
  assert.equal(card.checks, 1);
  assert.equal(cols[1].cards[0].pending, 1);
  assert.equal(cols[2].cards[0].tagIds[0], "x");
});

test("etiquetas fixas do passeio + da saída", () => {
  const labels = { tours: { t1: { tagIds: ["pena", "regaleira"] } }, colorAliases: {} };
  assert.deepEqual(cardLabelIds(labels, { tourId: "t1", tagIds: ["transfer", "pena"] }), ["pena", "regaleira", "transfer"]);
});

test("utilitários", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(initials("Maria Alves"), "MA");
  assert.equal(initials("Sofia"), "SO");
});

import { listsForCard, splitCardByGuide } from "../app/utils/agenda-board.js";

test("mesmo passeio e horário com 2 guias vira 2 cartões, clientes pelo idioma", () => {
  const card = {
    key: "t1|2026-11-14T09:30:00.000Z", tourId: "t1", pax: 9, present: 0, pending: 0,
    guides: [{ guideId: "g1", name: "Miguel Alves", languages: ["en"] }, { guideId: "g2", name: "Maria Aldina", languages: ["es"] }],
    bookings: [
      { id: "b1", status: "CONFIRMED", language: "English", adults: 2 },
      { id: "b2", status: "CONFIRMED", language: "Español", adults: 3 },
      { id: "b3", status: "CONFIRMED", language: "Français", adults: 1 },
      { id: "b4", status: "CONFIRMED", language: "English", adults: 4, groupGuideId: "g2" },
    ],
  };
  const pieces = splitCardByGuide(card);
  assert.deepEqual(pieces.map((p) => p.uid), ["t1|2026-11-14T09:30:00.000Z#g1", "t1|2026-11-14T09:30:00.000Z#g2", "t1|2026-11-14T09:30:00.000Z#sem-guia"]);
  assert.deepEqual(pieces.map((p) => p.bookings.map((b) => b.id)), [["b1"], ["b2", "b4"], ["b3"]]);
  assert.deepEqual(pieces.map((p) => p.pax), [2, 7, 1]);
  assert.ok(pieces.every((p) => p.key === card.key));
  const lists = [{ id: "a", title: "9h ENG Miguel" }, { id: "b", title: "9h ESP Maria" }, { id: "c", title: "Ingressos" }, { id: "d", title: "Extra", guideId: "g2" }];
  assert.deepEqual(listsForCard(lists, pieces[0]).map((l) => l.id), ["a", "c"]);
  assert.deepEqual(listsForCard(lists, pieces[1]).map((l) => l.id), ["b", "c", "d"]);
});

test("um guia só continua um cartão", () => {
  const card = { key: "k", guides: [{ guideId: "g1", name: "A" }], bookings: [] };
  assert.deepEqual(splitCardByGuide(card).map((p) => p.uid), ["k"]);
});

import { attachmentsForCard, notesForCard } from "../app/utils/agenda-board.js";

test("anexos e observações por cartão de guia", () => {
  const info = {
    guideNotes: [{ source: "trello", trelloId: "t1", guideId: "g1", text: "ingressos Miguel" }, { source: "trello", trelloId: "t2", guideId: "g2", text: "ingressos Maria" }, { by: "Renan", text: "geral" }],
    attachments: [{ id: "a", trelloCardId: "t1" }, { id: "b", trelloCardId: "t2" }, { id: "c", guideId: "g2" }, { id: "d" }],
  };
  const miguel = { split: true, guides: [{ guideId: "g1" }] };
  const maria = { split: true, guides: [{ guideId: "g2" }] };
  assert.deepEqual(attachmentsForCard(info, miguel).map((a) => a.id), ["a", "d"]);
  assert.deepEqual(attachmentsForCard(info, maria).map((a) => a.id), ["b", "c", "d"]);
  assert.deepEqual(notesForCard(info, miguel).map((n) => n.text), ["ingressos Miguel", "geral"]);
  assert.equal(attachmentsForCard(info, { guides: [] }).length, 4);
});

test("completed cards: whole departure or one guide's card", async () => {
  const { cardCompletion, cardOwnerKey } = await import("../app/utils/agenda-board.js");
  assert.equal(cardOwnerKey({ uid: "t|2026-11-14T09:30:00.000Z" }), "all");
  assert.equal(cardOwnerKey({ uid: "t|2026-11-14T09:30:00.000Z#g1" }), "g1");
  const info = { completed: { g1: { at: "x", by: "Nathalia" } } };
  assert.ok(cardCompletion(info, { uid: "k#g1" }));
  assert.equal(cardCompletion(info, { uid: "k#g2" }), null);
  assert.ok(cardCompletion({ completed: { all: { at: "x" } } }, { uid: "k#g2" }));
  assert.equal(cardCompletion(null, { uid: "k" }), null);
});

test("card turns green by itself when the tour happened and every check is ticked; manual reopen wins", async () => {
  const { cardCompletion } = await import("../app/utils/agenda-board.js");
  const card = { key: "t|2026-11-14T09:30:00.000Z", uid: "t|2026-11-14T09:30:00.000Z", startTime: "2026-11-14T09:30:00.000Z", bookings: [], guides: [] };
  const lists = (done) => ({ lists: [{ id: "l1", title: "9h30", items: [{ id: "a", text: "Ana (2A)", done: true }, { id: "b", text: "Rui (1A)", done }] }] });
  const after = Date.parse("2026-11-14T12:00:00Z");
  const before = Date.parse("2026-11-14T08:00:00Z");
  assert.equal(cardCompletion({ checklists: lists(false) }, card, { now: after }), null);
  assert.equal(cardCompletion({ checklists: lists(true) }, card, { now: before }), null);
  assert.equal(cardCompletion({ checklists: lists(true) }, card, { now: after }).auto, true);
  assert.equal(cardCompletion({ checklists: lists(true), completed: { all: { open: true } } }, card, { now: after }), null);
  assert.equal(cardCompletion({ checklists: { lists: [] } }, card, { now: after }), null);
});

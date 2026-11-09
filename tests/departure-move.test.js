import test from "node:test";
import assert from "node:assert/strict";
import { externalChannelBookings, mergeDepartureRecords, moveDeparture, validateMove } from "../app/utils/departure-move.server.js";

const now = new Date("2026-11-09T10:00:00Z");
const from = new Date("2026-11-12T09:30:00Z");
const to = new Date("2026-11-14T09:30:00Z");

test("validação do movimento", () => {
  assert.equal(validateMove({ fromStartTime: from, toStartTime: to, now }), null);
  assert.match(validateMove({ fromStartTime: from, toStartTime: from, now }), /já está/);
  assert.match(validateMove({ fromStartTime: from, toStartTime: new Date("2026-11-01T09:00:00Z"), now }), /passado/);
  assert.match(validateMove({ fromStartTime: from, toStartTime: new Date("x"), now }), /inválida/);
});

test("reservas de plataformas externas precisam de remarcação na origem", () => {
  const list = externalChannelBookings([{ platform: "SHOPIFY" }, { platform: "GETYOURGUIDE" }, { platform: "viator" }, { platform: "CENTRAL" }]);
  assert.deepEqual(list.map((b) => b.platform), ["GETYOURGUIDE", "viator"]);
});

test("junta etiquetas, observações e checklists quando a data de destino já tem a saída", () => {
  const merged = mergeDepartureRecords(
    { tagIds: ["a"], guideNotes: [{ at: "2", text: "y" }], checklists: { lists: [{ id: "l2" }], auto: { k: { done: true } } }, checkStartAt: null },
    { tagIds: ["a", "b"], guideNotes: [{ at: "1", text: "x" }], checklists: { lists: [{ id: "l1" }], auto: { j: { done: true } } }, checkStartAt: "t" },
  );
  assert.deepEqual(merged.tagIds, ["a", "b"]);
  assert.deepEqual(merged.guideNotes.map((n) => n.text), ["x", "y"]);
  assert.deepEqual(merged.checklists.lists.map((l) => l.id), ["l2", "l1"]);
  assert.ok(merged.checklists.auto.j && merged.checklists.auto.k);
  assert.equal(merged.checkStartAt, "t");
});

function fakePrisma({ bookings, assignments, departures }) {
  const calls = { attachmentsMoved: null, deleted: null };
  const tx = {
    booking: {
      findMany: async ({ where }) => bookings.filter((b) => b.tourId === where.tourId && +b.startTime === +where.startTime && where.status.in.includes(b.status)),
      update: async ({ where, data }) => Object.assign(bookings.find((b) => b.id === where.id), data),
    },
    guideAssignment: {
      findMany: async ({ where }) => assignments.filter((a) => a.tourId === where.tourId && +a.startTime === +where.startTime && a.status === "ASSIGNED"),
      updateMany: async ({ where, data }) => { for (const a of assignments) if (where.id.in.includes(a.id)) Object.assign(a, data); },
    },
    tourDeparture: {
      findUnique: async ({ where }) => departures.find((d) => d.tourId === where.tourId_startTime.tourId && +d.startTime === +where.tourId_startTime.startTime) || null,
      update: async ({ where, data }) => Object.assign(departures.find((d) => d.id === where.id), data),
      delete: async ({ where }) => { calls.deleted = where.id; departures.splice(departures.findIndex((d) => d.id === where.id), 1); },
    },
    waitlistEntry: { updateMany: async () => ({ count: 0 }) },
    departureAttachment: { updateMany: async ({ where, data }) => { calls.attachmentsMoved = [where.departureId, data.departureId]; } },
  };
  return { prisma: { $transaction: (fn) => fn(tx) }, calls };
}

test("move reservas ativas, escala e registro da saída, guardando a data original", async () => {
  const bookings = [
    { id: "b1", tourId: "t1", startTime: from, status: "CONFIRMED", platform: "SHOPIFY", customerName: "Ana" },
    { id: "b2", tourId: "t1", startTime: from, status: "CONFIRMED", platform: "GETYOURGUIDE", customerName: "Bob" },
    { id: "b3", tourId: "t1", startTime: from, status: "CANCELED", platform: "SHOPIFY" },
  ];
  const assignments = [{ id: "a1", tourId: "t1", startTime: from, status: "ASSIGNED" }];
  const departures = [{ id: "d1", tourId: "t1", startTime: from, tagIds: ["x"] }];
  const { prisma } = fakePrisma({ bookings, assignments, departures });
  const result = await moveDeparture(prisma, { tourId: "t1", fromStartTime: from, toStartTime: to, by: "Nathalia", now });
  assert.deepEqual(result.bookingIds, ["b1", "b2"]);
  assert.equal(+bookings[0].startTime, +to);
  assert.equal(+bookings[0].movedFromStartTime, +from);
  assert.equal(bookings[0].movedBy, "Nathalia");
  assert.equal(+bookings[2].startTime, +from, "reserva cancelada fica onde estava");
  assert.equal(+assignments[0].startTime, +to);
  assert.equal(+departures[0].startTime, +to);
  assert.deepEqual(result.external.map((b) => b.platform), ["GETYOURGUIDE"]);
});

test("une com a saída que já existe na data de destino", async () => {
  const departures = [
    { id: "d1", tourId: "t1", startTime: from, tagIds: ["x"] },
    { id: "d2", tourId: "t1", startTime: to, tagIds: ["y"] },
  ];
  const { prisma, calls } = fakePrisma({ bookings: [], assignments: [], departures });
  const result = await moveDeparture(prisma, { tourId: "t1", fromStartTime: from, toStartTime: to, now });
  assert.deepEqual(calls.attachmentsMoved, ["d1", "d2"]);
  assert.equal(calls.deleted, "d1");
  assert.deepEqual(result.departure.tagIds, ["y", "x"]);
});

test("data original não é sobrescrita em movimentos seguidos", async () => {
  const original = new Date("2026-11-10T09:30:00Z");
  const bookings = [{ id: "b1", tourId: "t1", startTime: from, status: "CONFIRMED", platform: "SHOPIFY", movedFromStartTime: original }];
  const { prisma } = fakePrisma({ bookings, assignments: [], departures: [] });
  await moveDeparture(prisma, { tourId: "t1", fromStartTime: from, toStartTime: to, now });
  assert.equal(+bookings[0].movedFromStartTime, +original);
});

import test from "node:test";
import assert from "node:assert/strict";
import { matchTour, processEmail } from "../app/services/gmail-sync.server.js";

// Banco de mentira com só o que a leitura do Gmail usa.
function fakeDb() {
  const events = [];
  const bookings = [];
  const syncEvents = [];
  return {
    events, bookings, syncEvents,
    integrationEvent: {
      findUnique: async ({ where }) => events.find((e) => e.provider === where.provider_externalEventId?.provider && e.externalEventId === where.provider_externalEventId?.externalEventId) || null,
      create: async ({ data }) => { const row = { id: `ev${events.length + 1}`, receivedAt: new Date(), ...data }; events.push(row); return row; },
    },
    booking: {
      findFirst: async ({ where }) => bookings.find((b) => b.platform === where.platform && where.OR.some((c) => (c.externalBookingId && b.externalBookingId === c.externalBookingId) || (c.bookingRef && b.bookingRef === c.bookingRef))) || null,
      create: async ({ data }) => { const row = { id: `b${bookings.length + 1}`, ...data }; bookings.push(row); return row; },
      update: async ({ where, data }) => { const row = bookings.find((b) => b.id === where.id); Object.assign(row, data); return row; },
    },
    syncEvent: { findFirst: async () => null, create: async ({ data }) => { syncEvents.push(data); return { id: "s1", ...data }; }, upsert: async ({ create }) => { syncEvents.push(create); return { id: "s1", ...create }; } },
    $transaction: async (fn) => (typeof fn === "function" ? fn(this) : Promise.all(fn)),
    tour: { findUnique: async () => null },
  };
}

const catalog = [
  { id: "belem", title: "Visita a Pé em Pequeno Grupo por Belém + Bilhetes para o Mosteiro dos Jerónimos", names: ["Visita a Pé em Pequeno Grupo por Belém + Bilhetes para o Mosteiro dos Jerónimos", "Belém Small Group Walking Tour + Jerónimos Monastery Tickets", "Tour a pie por Belém en grupo reducido + Entradas al Monasterio de los Jerónimos"], scheduleSlots: ["09:30", "14:00"] },
  { id: "sintra", title: "Sintra e Cascais", names: ["Sintra e Cascais", "Sintra and Cascais Day Trip"], scheduleSlots: ["09:00"] },
];

test("tour matching by name and by saved alias", () => {
  assert.equal(matchTour({ platform: "VIATOR", product: "Belém Walking Tour with Jerónimos Monastery Tickets" }, catalog)?.tourId, "belem");
  assert.equal(matchTour({ platform: "KLOOK", product: "Lisbon Highlights" }, catalog), null);
  assert.equal(matchTour({ platform: "KLOOK", product: "Lisbon Highlights" }, catalog, { "KLOOK|lisbon highlights": "sintra" })?.tourId, "sintra");
});

const now = new Date("2026-11-13T12:00:00Z");
const viatorMail = (extra = {}) => ({
  messageId: "<m1@viator>",
  from: "booking@viator.com",
  subject: "New Booking for Sat, Nov 14, 2026 (BR-987654321)",
  date: now,
  text: [
    "Booking Reference: BR-987654321",
    "Tour Name: Belém Small Group Walking Tour + Jerónimos Monastery Tickets",
    "Travel Date: Sat, Nov 14, 2026",
    "Time: 9:30 AM",
    "Lead Traveler Name: Ana Gómez",
    "Travelers: 2 Adults",
    "Tour Language: Spanish",
  ].join("\n"),
  ...extra,
});

test("a clear new booking goes straight in, once", async () => {
  const db = fakeDb();
  const first = await processEmail(db, viatorMail(), { catalog, now });
  assert.equal(first.status, "IMPORTED");
  assert.equal(db.bookings.length, 1);
  const b = db.bookings[0];
  assert.equal(b.platform, "VIATOR");
  assert.equal(b.tourId, "belem");
  assert.equal(b.totalParticipants, 2);
  assert.equal(b.language, "es");
  assert.equal(b.externalBookingId, "email:BR-987654321");
  assert.equal(b.startTime.toISOString(), "2026-11-14T09:30:00.000Z");
  const again = await processEmail(db, viatorMail(), { catalog, now });
  assert.equal(again.status, "DUPLICATE");
  assert.equal(db.bookings.length, 1);
});

test("before the connection (review mode) nothing is created", async () => {
  const db = fakeDb();
  const result = await processEmail(db, viatorMail(), { catalog, now, mode: "review" });
  assert.equal(result.status, "REVIEW");
  assert.equal(db.bookings.length, 0);
});

test("unknown tour goes to review with a reason", async () => {
  const db = fakeDb();
  const result = await processEmail(db, viatorMail({ text: viatorMail().text.replace(/Tour Name: .*/, "Tour Name: Fado Night in Alfama") }), { catalog, now });
  assert.equal(result.status, "REVIEW");
  assert.ok(db.events[0].result.missing.includes("tour"));
});

test("cancellation cancels the booking with the same reference", async () => {
  const db = fakeDb();
  await processEmail(db, viatorMail(), { catalog, now });
  const result = await processEmail(db, { messageId: "<m2@viator>", from: "booking@viator.com", subject: "Booking Cancelled: BR-987654321", text: "Booking Reference: BR-987654321\nThe traveler cancelled.", date: now }, { catalog, now });
  assert.equal(result.status, "IMPORTED");
  assert.equal(db.bookings[0].status, "CANCELED");
});

test("reviews and messages are ignored; GetYourGuide e-mails never become bookings", async () => {
  const db = fakeDb();
  assert.equal((await processEmail(db, { messageId: "<r>", from: "noreply@airbnb.com", subject: "You have a new review", text: "", date: now }, { catalog, now })).status, "IGNORED");
  assert.equal((await processEmail(db, { ...viatorMail(), messageId: "<g>", from: "supplier@getyourguide.com" }, { catalog, now })).status, "IGNORED");
  assert.equal(db.bookings.length, 0);
});

test("platforms already selling through the direct connection are not added again from e-mail", async () => {
  const db = fakeDb();
  const result = await processEmail(db, viatorMail(), { catalog, now, directPlatforms: ["VIATOR"] });
  assert.equal(result.status, "IGNORED");
  assert.equal(db.bookings.length, 0);
});

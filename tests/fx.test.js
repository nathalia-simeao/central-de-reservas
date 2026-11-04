import test from "node:test";
import assert from "node:assert/strict";
import { convertBookingsToEur, eurAmount, getRateToEur } from "../app/utils/fx.server.js";
import { eurValueOf } from "../app/utils/dashboard-view-model.js";

function fakePrisma(bookings) {
  const rates = new Map();
  return {
    bookings,
    $executeRawUnsafe: async () => 0,
    fxRate: {
      findUnique: async ({ where }) => rates.get(`${where.date_currency.date}|${where.date_currency.currency}`) || null,
      upsert: async ({ create }) => { rates.set(`${create.date}|${create.currency}`, { rateToEur: create.rateToEur }); return create; },
    },
    booking: {
      findMany: async () => bookings.filter((b) => b.totalPrice !== null && b.fxRateToEur == null),
      update: async ({ where, data }) => Object.assign(bookings.find((b) => b.id === where.id), data),
    },
  };
}

test("EUR needs no lookup; other currencies use the ECB rate of the booking day", async () => {
  const calls = [];
  const fetchImpl = async (url) => { calls.push(url); return { ok: true, json: async () => ({ rates: { EUR: 0.92 } }) }; };
  const prisma = fakePrisma([
    { id: "eur", totalPrice: "100", currency: "EUR", createdAt: new Date("2026-11-03T10:00:00Z") },
    { id: "usd1", totalPrice: "800", currency: "USD", createdAt: new Date("2026-11-03T10:00:00Z") },
    { id: "usd2", totalPrice: "100", currency: "usd", createdAt: new Date("2026-11-03T18:00:00Z") },
  ]);
  const result = await convertBookingsToEur(prisma, { fetchImpl });
  assert.equal(result.converted, 3);
  assert.equal(calls.length, 1, "one ECB lookup per currency and day (cached)");
  assert.ok(calls[0].endsWith("/2026-11-03?from=USD&to=EUR"));
  assert.equal(prisma.bookings.find((b) => b.id === "eur").totalPriceEur, 100);
  assert.equal(prisma.bookings.find((b) => b.id === "usd1").totalPriceEur, 736);
  assert.equal(prisma.bookings.find((b) => b.id === "usd1").fxRateDate, "2026-11-03");
});

test("a failed lookup leaves the booking for the next run", async () => {
  const prisma = fakePrisma([{ id: "x", totalPrice: "50", currency: "GBP", createdAt: new Date("2026-11-03T10:00:00Z") }]);
  const result = await convertBookingsToEur(prisma, { fetchImpl: async () => ({ ok: false, status: 503 }) });
  assert.equal(result.converted, 0);
  assert.equal(prisma.bookings[0].fxRateToEur, undefined);
  await assert.rejects(getRateToEur(prisma, "GBP", new Date(), async () => ({ ok: false, status: 503 })));
});

test("dashboard values are always euros", () => {
  assert.equal(eurAmount("2400", "0.92"), 2208);
  assert.equal(eurValueOf({ totalPrice: "2400", currency: "USD", totalPriceEur: "2208.00" }), 2208);
  assert.equal(eurValueOf({ totalPrice: "2400", currency: "USD" }), null);
  assert.equal(eurValueOf({ totalPrice: "59", currency: "EUR" }), 59);
  assert.equal(eurValueOf({ totalPrice: "59", currency: null }), 59);
});

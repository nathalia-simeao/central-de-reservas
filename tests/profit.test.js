import test from "node:test";
import assert from "node:assert/strict";
import { computeProfit, guidePayForPax, normalizeCostSettings } from "../app/utils/profit.js";

const range = { start: new Date("2026-11-01T00:00:00Z"), end: new Date("2026-11-30T23:59:59Z") };
const costSettings = {
  platformCommissionPercent: { GETYOURGUIDE: 30 },
  paymentFees: { SHOPIFY: { percent: 2, fixed: 0.25 } },
  tours: {
    jer: {
      ticketCost: { ADULT: 10, CHILD: 0, SENIOR: 5 },
      guidePay: [{ minPax: 1, maxPax: 5, amount: 40 }, { minPax: 6, maxPax: null, amount: 60 }],
    },
  },
};

const at = "2026-11-04T09:30:00Z";
const booking = (extra) => ({ tourId: "jer", status: "CONFIRMED", startTime: at, currency: "EUR", ...extra });

test("guide pay follows the pax tier of the departure", () => {
  const tiers = normalizeCostSettings(costSettings).tours.jer.guidePay;
  assert.equal(guidePayForPax(tiers, 0), 0);
  assert.equal(guidePayForPax(tiers, 5), 40);
  assert.equal(guidePayForPax(tiers, 6), 60);
  assert.equal(guidePayForPax(tiers, 40), 60);
});

test("profit = revenue − commission − payment fee − tickets − guide (one guide per departure)", () => {
  const result = computeProfit({
    range,
    costSettings,
    bookings: [
      booking({ platform: "GETYOURGUIDE", totalPrice: "118", adults: 2, totalParticipants: 2 }),
      booking({ platform: "SHOPIFY", totalPrice: "100", adults: 1, seniors: 1, totalParticipants: 2 }),
    ],
  });
  // revenue 218; commission 35.40; fee 2 + 0.25; tickets 2×10 + 10 + 5 = 35; guide 4 pax → 40
  assert.equal(result.revenue, 218);
  assert.equal(result.commission, 35.4);
  assert.equal(result.paymentFees, 2.25);
  assert.equal(result.tickets, 35);
  assert.equal(result.guides, 40);
  assert.equal(result.profit, 105.35);
  assert.equal(result.departureCount, 1);
});

test("no-shows keep revenue but generate no ticket and don't count for the guide tier", () => {
  const result = computeProfit({
    range,
    costSettings,
    bookings: [booking({ platform: "SHOPIFY", totalPrice: "59", adults: 1, totalParticipants: 1, attendanceStatus: "NO_SHOW" })],
  });
  assert.equal(result.revenue, 59);
  assert.equal(result.tickets, 0);
  assert.equal(result.guides, 0);
});

test("cancelled bookings, other periods and missing prices are handled", () => {
  const result = computeProfit({
    range,
    costSettings,
    bookings: [
      booking({ platform: "SHOPIFY", totalPrice: "50", status: "CANCELED", adults: 1 }),
      booking({ platform: "SHOPIFY", totalPrice: "50", startTime: "2026-12-04T09:30:00Z", adults: 1 }),
      booking({ platform: "GETYOURGUIDE", totalPrice: null, adults: 2, tourId: "other" }),
    ],
  });
  assert.equal(result.bookingCount, 1);
  assert.equal(result.missingPriceCount, 1);
  assert.deepEqual(result.toursWithoutCosts, ["other"]);
});

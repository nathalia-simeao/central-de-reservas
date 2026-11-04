import test from "node:test";
import assert from "node:assert/strict";
import { computeGuidePayouts, lisbonMonthRange } from "../app/utils/guide-payouts.js";

const costSettings = {
  tours: { bel: { guidePay: [{ minPax: 1, maxPax: 5, amount: 40 }, { minPax: 6, maxPax: null, amount: 60 }] } },
};
const at = "2026-11-04T09:30:00.000Z";
const b = (extra) => ({ tourId: "bel", startTime: at, status: "CONFIRMED", ...extra });

test("one payment per departure by the guide's group size; no-shows excluded", () => {
  const result = computeGuidePayouts({
    costSettings,
    assignments: [
      { id: "a1", guideId: "dee", tourId: "bel", startTime: at, languages: ["en"], guide: { name: "Dee" } },
      { id: "a2", guideId: "luis", tourId: "bel", startTime: at, languages: ["pt", "es"], guide: { name: "Luis" } },
    ],
    bookings: [
      b({ language: "English", adults: 4 }),
      b({ language: "English", adults: 3 }),
      b({ language: "English", adults: 2, attendanceStatus: "NO_SHOW" }),
      b({ language: "Português", adults: 2 }),
      b({ language: "English", adults: 1, groupGuideId: "luis" }),
    ],
  });
  const dee = result.guides.find((g) => g.guideId === "dee");
  const luis = result.guides.find((g) => g.guideId === "luis");
  assert.equal(dee.pax, 7);
  assert.equal(dee.total, 60);
  assert.equal(dee.departures[0].noShow, 2);
  assert.equal(luis.pax, 3);
  assert.equal(luis.total, 40);
  assert.equal(result.total, 100);
});

test("tours without guide tiers are flagged and pay zero", () => {
  const result = computeGuidePayouts({
    costSettings: {},
    assignments: [{ id: "x", guideId: "dee", tourId: "sintra", startTime: at, languages: [] }],
    bookings: [{ tourId: "sintra", startTime: at, status: "CONFIRMED", adults: 3 }],
  });
  assert.equal(result.total, 0);
  assert.deepEqual(result.toursWithoutTiers, ["sintra"]);
});

test("Lisbon month range follows the local midnight (winter and summer time)", () => {
  const nov = lisbonMonthRange("2026-11");
  assert.equal(nov.start.toISOString(), "2026-11-01T00:00:00.000Z");
  assert.equal(nov.end.toISOString(), "2026-12-01T00:00:00.000Z");
  const jul = lisbonMonthRange("2026-07");
  assert.equal(jul.start.toISOString(), "2026-06-30T23:00:00.000Z");
  assert.equal(lisbonMonthRange("2026-13"), null);
});

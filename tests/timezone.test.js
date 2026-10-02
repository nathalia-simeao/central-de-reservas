import test from "node:test";
import assert from "node:assert/strict";

import { lisbonLocalDateTimeToUtc } from "../app/utils/shopify-orders.server.js";

test("Lisbon winter slots preserve WET offset", () => {
  const value = lisbonLocalDateTimeToUtc("2026-01-15", "10:00");
  assert.equal(value?.toISOString(), "2026-01-15T10:00:00.000Z");
});

test("Lisbon summer slots apply WEST daylight saving time", () => {
  const value = lisbonLocalDateTimeToUtc("2026-07-15", "10:00");
  assert.equal(value?.toISOString(), "2026-07-15T09:00:00.000Z");
});

test("invalid local date/time is rejected", () => {
  assert.equal(lisbonLocalDateTimeToUtc("15/01/2026", "10:00"), null);
  assert.equal(lisbonLocalDateTimeToUtc("2026-01-15", "25:00"), null);
});

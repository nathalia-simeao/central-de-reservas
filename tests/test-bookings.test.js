import test from "node:test";
import assert from "node:assert/strict";
import { excludeTestBookingsWhere, isTestBooking } from "../app/utils/test-bookings.js";

test("sem go-live: todas as reservas do GYG são teste", () => {
  assert.deepEqual(excludeTestBookingsWhere({}), { NOT: { platform: "GETYOURGUIDE" } });
  assert.equal(isTestBooking({ platform: "GETYOURGUIDE", createdAt: "2026-11-01" }, {}), true);
  assert.equal(isTestBooking({ platform: "SHOPIFY", createdAt: "2026-11-01" }, {}), false);
});

test("depois do go-live só as antigas são teste", () => {
  const env = { GYG_LIVE_SINCE: "2026-12-01" };
  assert.equal(isTestBooking({ platform: "GETYOURGUIDE", createdAt: "2026-11-20" }, env), true);
  assert.equal(isTestBooking({ platform: "GETYOURGUIDE", createdAt: "2026-12-02" }, env), false);
  assert.ok(excludeTestBookingsWhere(env).NOT.createdAt.lt instanceof Date);
});

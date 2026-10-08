import test from "node:test";
import assert from "node:assert/strict";
import { validateIdempotentBooking } from "../app/utils/capacity.server.js";

const base = {
  id: "booking-1",
  tourId: "tour-1",
  platform: "SHOPIFY",
  startTime: new Date("2026-10-20T09:00:00Z"),
  totalParticipants: 2,
  status: "CONFIRMED",
};
const request = {
  tourId: "tour-1",
  platform: "SHOPIFY",
  startTime: new Date("2026-10-20T09:00:00Z"),
  seats: 2,
  now: new Date("2026-10-08T12:00:00Z"),
};

test("confirmed identical booking can be replayed safely", () => {
  assert.equal(validateIdempotentBooking(base, request), null);
});

test("same external ID cannot change tour, slot or participants", () => {
  for (const variant of [
    { tourId: "tour-other" },
    { startTime: new Date("2026-10-20T10:00:00Z") },
    { seats: 3 },
    { platform: "VIATOR" },
  ]) {
    const result = validateIdempotentBooking(base, { ...request, ...variant });
    assert.equal(result.accepted, false);
    assert.equal(result.reason, "IDEMPOTENCY_CONFLICT");
  }
});

test("expired pending hold is never accepted as idempotent", () => {
  const result = validateIdempotentBooking({
    ...base, status: "PENDING", holdExpiresAt: new Date("2026-10-08T11:00:00Z"),
  }, request);
  assert.equal(result.reason, "HOLD_EXPIRED");
  assert.equal(result.idempotent, false);
});

test("active pending hold can be replayed until its expiration", () => {
  assert.equal(validateIdempotentBooking({
    ...base, status: "PENDING", holdExpiresAt: new Date("2026-10-08T13:00:00Z"),
  }, request), null);
});

test("canceled or inactive reservations are not reused", () => {
  assert.equal(validateIdempotentBooking({ ...base, status: "CANCELED" }, request).reason, "BOOKING_CANCELED");
  assert.equal(validateIdempotentBooking({ ...base, status: "FAILED" }, request).reason, "BOOKING_NOT_ACTIVE");
});

test("expired hold cannot evade parameter validation", () => {
  const result = validateIdempotentBooking({
    ...base, status: "PENDING", holdExpiresAt: new Date("2026-10-08T11:00:00Z"),
  }, { ...request, seats: 7 });
  assert.equal(result.reason, "IDEMPOTENCY_CONFLICT");
});

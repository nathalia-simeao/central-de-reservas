import test from "node:test";
import assert from "node:assert/strict";

import {
  bookingSeatCount,
  calculateAvailabilityFromLoaded,
} from "../app/utils/capacity.server.js";

test("expired holds and cancelled bookings do not consume capacity", () => {
  const now = new Date("2026-01-15T09:00:00.000Z");

  assert.equal(
    bookingSeatCount({
      status: "PENDING",
      totalParticipants: 3,
      holdExpiresAt: "2026-01-15T08:59:00.000Z",
    }, now),
    0,
  );

  assert.equal(
    bookingSeatCount({
      status: "CANCELED",
      totalParticipants: 4,
    }, now),
    0,
  );
});

test("capacity rejects a request larger than the remaining seats", () => {
  const startTime = new Date("2026-01-15T10:00:00.000Z");
  const availability = calculateAvailabilityFromLoaded({
    tour: {
      id: "tour-1",
      maxCapacity: 5,
      timezone: "Europe/Lisbon",
    },
    bookings: [
      {
        status: "CONFIRMED",
        startTime,
        totalParticipants: 2,
      },
      {
        status: "PENDING",
        startTime,
        totalParticipants: 1,
        holdExpiresAt: "2026-01-15T11:00:00.000Z",
      },
    ],
    blocks: [],
    startTime,
    platform: "shopify",
    requestedSeats: 3,
    now: new Date("2026-01-15T09:00:00.000Z"),
  });

  assert.equal(availability.occupiedSeats, 3);
  assert.equal(availability.remainingSeats, 2);
  assert.equal(availability.canAccept, false);
  assert.equal(availability.blocked, false);
});

test("an active slot block wins over free capacity", () => {
  const startTime = new Date("2026-01-15T10:00:00.000Z");
  const availability = calculateAvailabilityFromLoaded({
    tour: {
      id: "tour-1",
      maxCapacity: 20,
      timezone: "Europe/Lisbon",
    },
    bookings: [],
    blocks: [{
      id: "block-1",
      active: true,
      tourId: "tour-1",
      date: new Date("2026-01-15T00:00:00.000Z"),
      timeSlot: "10:00",
      platforms: [],
    }],
    startTime,
    platform: "viator",
    requestedSeats: 1,
  });

  assert.equal(availability.blocked, true);
  assert.equal(availability.remainingSeats, 0);
  assert.equal(availability.canAccept, false);
});

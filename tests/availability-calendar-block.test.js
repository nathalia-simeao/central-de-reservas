import test from "node:test";
import assert from "node:assert/strict";

import {
  blockMatchesCalendarSlot,
  dateInputToUtcMidnight,
} from "../app/utils/availability.server.js";

test("specific block dates preserve the selected calendar day", () => {
  const selected = "2026-10-11";
  const stored = dateInputToUtcMidnight(selected);

  assert.ok(stored instanceof Date);
  assert.equal(stored.toISOString().slice(0, 10), selected);
  assert.equal(stored.getUTCHours(), 12);
});

test("a time-specific block closes only the selected departure", () => {
  const block = {
    active: true,
    tourId: "tour-1",
    date: dateInputToUtcMidnight("2026-10-15"),
    dayOfWeek: null,
    timeSlot: "14:00",
    platforms: ["getyourguide"],
  };

  assert.equal(
    blockMatchesCalendarSlot(block, {
      tourId: "tour-1",
      dateKey: "2026-10-15",
      timeKey: "14:00",
      platform: "getyourguide",
    }),
    true,
  );

  assert.equal(
    blockMatchesCalendarSlot(block, {
      tourId: "tour-1",
      dateKey: "2026-10-15",
      timeKey: "10:00",
      platform: "getyourguide",
    }),
    false,
  );

  assert.equal(
    blockMatchesCalendarSlot(block, {
      tourId: "tour-1",
      dateKey: "2026-10-15",
      timeKey: "14:00",
      platform: "shopify",
    }),
    false,
  );
});

test("ALL time and all platforms block every departure without blocking adjacent dates", () => {
  const block = {
    active: true,
    tourId: "tour-1",
    date: dateInputToUtcMidnight("2026-10-21"),
    dayOfWeek: null,
    timeSlot: "ALL",
    platforms: [],
  };
  for (const platform of ["shopify", "getyourguide", "viator", "civitatis", "headout"]) {
    for (const timeKey of ["09:00", "12:30", "18:00"]) {
      assert.equal(blockMatchesCalendarSlot(block, {
        tourId: "tour-1", dateKey: "2026-10-21", timeKey, platform,
      }), true);
      assert.equal(blockMatchesCalendarSlot(block, {
        tourId: "tour-1", dateKey: "2026-10-22", timeKey, platform,
      }), false);
    }
  }
});

test("GYG-only block and removal preserve other channels and restore availability", () => {
  const block = {
    active: true,
    tourId: "tour-1",
    date: dateInputToUtcMidnight("2026-10-22"),
    dayOfWeek: null,
    timeSlot: "ALL",
    platforms: ["getyourguide"],
  };
  const slot = { tourId: "tour-1", dateKey: "2026-10-22", timeKey: "09:30" };
  assert.equal(blockMatchesCalendarSlot(block, { ...slot, platform: "getyourguide" }), true);
  for (const platform of ["shopify", "viator", "civitatis", "headout"]) {
    assert.equal(blockMatchesCalendarSlot(block, { ...slot, platform }), false);
  }
  block.active = false;
  assert.equal(blockMatchesCalendarSlot(block, { ...slot, platform: "getyourguide" }), false);
});

test("GYG production scenario: 16 October ALL-platform rule closes Jeronimos 09:30 but 17 October stays open", async () => {
  const { calculateAvailabilityForCalendarSlotFromLoaded } = await import("../app/utils/capacity.server.js");
  const tour = { id: "jeronimos-master-tour", maxCapacity: 20, timezone: "Europe/Lisbon" };
  const block = {
    id: "jeronimos-16-oct-block",
    active: true,
    tourId: tour.id,
    date: dateInputToUtcMidnight("2026-10-16"),
    dayOfWeek: null,
    timeSlot: "ALL",
    platforms: [],
  };
  const input = { tour, bookings: [], blocks: [block], timeKey: "09:30", platform: "getyourguide" };
  const blocked = calculateAvailabilityForCalendarSlotFromLoaded({ ...input, dateKey: "2026-10-16" });
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.remainingSeats, 0);
  const nextDay = calculateAvailabilityForCalendarSlotFromLoaded({ ...input, dateKey: "2026-10-17" });
  assert.equal(nextDay.blocked, false);
  assert.equal(nextDay.remainingSeats, 20);
  const incorrectMasterTour = calculateAvailabilityForCalendarSlotFromLoaded({
    ...input, tour: { ...tour, id: "different-master-tour" }, dateKey: "2026-10-16",
  });
  assert.equal(incorrectMasterTour.remainingSeats, 20);
});

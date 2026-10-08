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

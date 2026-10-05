import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGygOperationalOptionGroups,
  deriveGygOperationalOptionKey,
  deriveGygOperationalOptionTitle,
  gygProductCategories,
  gygProductScheduleSlots,
} from "../app/utils/gyg-product-options.server.js";

test("GYG option title removes passenger category but preserves operational choice", () => {
  assert.equal(
    deriveGygOperationalOptionTitle({
      title: "Child (Under 14 years old) / 09:30 - Skip-The-Line Guided Tour",
    }),
    "09:30 - Skip-The-Line Guided Tour",
  );

  assert.equal(
    deriveGygOperationalOptionTitle({
      title: "Adult / 14:00 - Guided Tour + Sunset Boat Trip",
    }),
    "14:00 - Guided Tour + Sunset Boat Trip",
  );

  assert.equal(
    deriveGygOperationalOptionTitle({
      title:
        "Private Tour: Jerónimos Monastery with Belém + Sailboat Cruise / 09:30 - Private Skip-The-Line Guided Tour + Afternoon Boat Trip",
    }),
    "Private Tour: Jerónimos Monastery with Belém + Sailboat Cruise / 09:30 - Private Skip-The-Line Guided Tour + Afternoon Boat Trip",
  );
});

test("GYG operational grouping keeps categories together inside the same option", () => {
  const groups = buildGygOperationalOptionGroups([
    {
      id: "child",
      title: "Child (Under 14 years old) / 09:30 - Skip-The-Line Guided Tour",
      passengerCategory: "CHILD",
      startTimeSlot: "09:30",
      active: true,
    },
    {
      id: "adult",
      title: "Adult / 09:30 - Skip-The-Line Guided Tour",
      passengerCategory: "ADULT",
      startTimeSlot: "09:30",
      active: true,
    },
    {
      id: "youth",
      title: "Youth (Ages 14 to 23) / 14:00 - Guided Tour",
      passengerCategory: "YOUTH",
      startTimeSlot: "14:00",
      active: true,
    },
  ]);

  assert.equal(groups.length, 2);

  const morning = groups.find((group) =>
    group.title.includes("09:30 - Skip-The-Line Guided Tour"),
  );
  assert.deepEqual(morning.categories, ["ADULT", "CHILD"]);
  assert.deepEqual(morning.startTimes, ["09:30"]);
  assert.deepEqual(new Set(morning.variantIds), new Set(["adult", "child"]));
});

test("GYG supplier product option key is deterministic", () => {
  assert.equal(
    deriveGygOperationalOptionKey("09:30 - Skip-The-Line Guided Tour"),
    "09-30-skip-the-line-guided-tour",
  );
});

test("GYG product schedule and categories come from the option variants", () => {
  const product = {
    legacyTourProductId: false,
    variants: [
      {
        active: true,
        startTimeSlot: "09:30",
        passengerCategory: "ADULT",
      },
      {
        active: true,
        startTimeSlot: "09:30",
        passengerCategory: "CHILD",
      },
    ],
    tour: { scheduleSlots: ["09:30", "14:00"] },
  };

  assert.deepEqual(gygProductScheduleSlots(product), ["09:30"]);
  assert.deepEqual(
    [...gygProductCategories(product)].sort(),
    ["ADULT", "CHILD"],
  );
});

test("legacy Tour productId can still use the Tour schedule during migration", () => {
  const product = {
    legacyTourProductId: true,
    variants: [],
    tour: { scheduleSlots: ["09:30", "14:00"] },
  };

  assert.deepEqual(gygProductScheduleSlots(product), ["09:30", "14:00"]);
});

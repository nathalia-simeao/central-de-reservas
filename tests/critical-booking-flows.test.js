import test from "node:test";
import assert from "node:assert/strict";

import {
  bookingSeatCount,
  calculateAvailabilityFromLoaded,
  releaseBookingHold,
} from "../app/utils/capacity.server.js";
import {
  blockMatchesCalendarSlot,
  getDatePartsInTimeZone,
} from "../app/utils/availability.server.js";
import {
  buildShopifyBookingGroups,
  lisbonLocalDateTimeToUtc,
} from "../app/utils/shopify-orders.server.js";
import { getSyncQueueStats } from "../app/utils/sync-queue.server.js";
import {
  minimizeCheckoutHoldPayload,
  minimizeShopifyOrderPayload,
} from "../app/utils/privacy.server.js";

test("capacity excludes expired pending holds and rejects over-capacity requests", () => {
  const now = new Date("2026-10-02T12:00:00Z");
  const startTime = new Date("2026-10-10T09:00:00Z");
  const tour = { id: "tour-1", maxCapacity: 6, timezone: "Europe/Lisbon" };

  const bookings = [
    {
      status: "CONFIRMED",
      startTime,
      totalParticipants: 3,
    },
    {
      status: "PENDING",
      startTime,
      totalParticipants: 2,
      holdExpiresAt: new Date("2026-10-02T11:00:00Z"),
    },
  ];

  assert.equal(bookingSeatCount(bookings[1], now), 0);

  const availability = calculateAvailabilityFromLoaded({
    tour,
    bookings,
    blocks: [],
    startTime,
    platform: "SHOPIFY",
    requestedSeats: 4,
    now,
  });

  assert.equal(availability.occupiedSeats, 3);
  assert.equal(availability.remainingSeats, 3);
  assert.equal(availability.canAccept, false);
});

test("availability respects date, time, tour and platform block rules", () => {
  const block = {
    active: true,
    tourId: "tour-1",
    date: new Date("2026-10-10T00:00:00Z"),
    dayOfWeek: null,
    timeSlot: "10:00",
    platforms: ["shopify"],
  };

  assert.equal(
    blockMatchesCalendarSlot(block, {
      tourId: "tour-1",
      dateKey: "2026-10-10",
      timeKey: "10:00",
      platform: "SHOPIFY",
    }),
    true,
  );

  assert.equal(
    blockMatchesCalendarSlot(block, {
      tourId: "tour-1",
      dateKey: "2026-10-10",
      timeKey: "10:00",
      platform: "VIATOR",
    }),
    false,
  );
});

test("Lisbon timezone conversion handles winter and summer offsets", () => {
  const winter = lisbonLocalDateTimeToUtc("2026-01-15", "09:00");
  const summer = lisbonLocalDateTimeToUtc("2026-07-15", "09:00");

  assert.equal(winter?.toISOString(), "2026-01-15T09:00:00.000Z");
  assert.equal(summer?.toISOString(), "2026-07-15T08:00:00.000Z");

  const parts = getDatePartsInTimeZone(
    new Date("2026-07-15T08:00:00.000Z"),
    "Europe/Lisbon",
  );
  assert.equal(parts?.dateKey, "2026-07-15");
  assert.equal(parts?.timeKey, "09:00");
});

test("Shopify webhook grouping produces one canonical booking group", async () => {
  const prisma = {
    tour: {
      findMany: async () => [
        {
          id: "tour-1",
          title: "Sintra",
          shopifyProductId: "gid://shopify/Product/123",
        },
      ],
    },
  };

  const payload = {
    id: 9001,
    admin_graphql_api_id: "gid://shopify/Order/9001",
    name: "#9001",
    currency: "EUR",
    email: "guest@example.com",
    customer: { first_name: "Ana", last_name: "Silva" },
    note_attributes: [
      { name: "language", value: "Português" },
    ],
    line_items: [
      {
        id: 1,
        product_id: 123,
        variant_id: 456,
        title: "Sintra",
        variant_title: "Adult 09:00",
        quantity: 2,
        price: "100.00",
        properties: [
          { name: "date", value: "2026-07-15" },
          { name: "time", value: "09:00" },
        ],
      },
    ],
  };

  const result = await buildShopifyBookingGroups(prisma, payload);

  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].tour.id, "tour-1");
  assert.equal(result.groups[0].totalParticipants, 2);
  assert.equal(result.groups[0].startTime.toISOString(), "2026-07-15T08:00:00.000Z");
  assert.match(result.groups[0].externalBookingId, /^shopify:9001:tour-1:/);
});

test("cancellation releases a pending hold exactly once", async () => {
  const current = {
    id: "hold-1",
    status: "PENDING",
    syncStatus: "STOREFRONT_HOLD",
    holdExpiresAt: new Date("2026-10-02T15:00:00Z"),
  };

  let updateData = null;
  const prisma = {
    booking: {
      findUnique: async () => current,
      updateMany: async ({ data }) => {
        updateData = data;
        return { count: 1 };
      },
    },
  };

  const result = await releaseBookingHold(prisma, "hold-1", "test_cancel");

  assert.equal(result.released, true);
  assert.equal(result.booking.status, "CANCELED");
  assert.equal(result.booking.cancelReason, "test_cancel");
  assert.equal(updateData.status, "CANCELED");
  assert.equal(updateData.syncStatus, "HOLD_RELEASED");
});

test("sync queue health aggregates operational states", async () => {
  const prisma = {
    syncJob: {
      groupBy: async () => [
        { status: "PENDING", _count: { _all: 2 } },
        { status: "RETRY", _count: { _all: 1 } },
        { status: "DEAD", _count: { _all: 3 } },
        { status: "COMPLETED", _count: { _all: 12 } },
      ],
    },
  };

  const stats = await getSyncQueueStats(prisma);

  assert.equal(stats.pending, 2);
  assert.equal(stats.retry, 1);
  assert.equal(stats.dead, 3);
  assert.equal(stats.completed, 12);
  assert.equal(stats.health, "critical");
  assert.equal(stats.attention, 4);
});

test("stored Shopify payload strips customer PII and address data", () => {
  const minimized = minimizeShopifyOrderPayload({
    id: 1,
    name: "#1",
    email: "private@example.com",
    phone: "+351999999999",
    customer: {
      first_name: "Private",
      last_name: "Person",
      email: "private@example.com",
    },
    billing_address: {
      address1: "Rua Secreta 1",
      city: "Lisboa",
    },
    line_items: [
      {
        id: 10,
        product_id: 20,
        variant_id: 30,
        title: "Tour",
        quantity: 2,
        price: "99.00",
      },
    ],
    note_attributes: [
      { name: "customer_email", value: "private@example.com" },
      { name: "PMY UTM Source", value: "google" },
    ],
  });

  const serialized = JSON.stringify(minimized);
  assert.equal(serialized.includes("private@example.com"), false);
  assert.equal(serialized.includes("Rua Secreta"), false);
  assert.equal(minimized.attributes.length, 1);
  assert.equal(minimized.attributes[0].name, "PMY UTM Source");
});

test("checkout raw payload does not duplicate customer identity", () => {
  const minimized = minimizeCheckoutHoldPayload({
    kind: "CENTRAL_CHECKOUT_HOLD",
    date: "2026-10-10",
    time: "10:00",
    language: "English",
    productId: "gid://shopify/Product/123",
    lineItems: [{ variantId: "gid://shopify/ProductVariant/456", quantity: 2 }],
    attribution: {
      commercialSource: "Google Ads",
      source: "google",
      medium: "cpc",
      campaign: "autumn",
      email: "should-not-be-kept@example.com",
    },
  });

  const serialized = JSON.stringify(minimized);
  assert.equal(serialized.includes("should-not-be-kept@example.com"), false);
  assert.equal(minimized.lineItems[0].quantity, 2);
});

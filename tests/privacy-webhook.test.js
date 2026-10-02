import test from "node:test";
import assert from "node:assert/strict";

import {
  containsDirectCustomerPii,
  minimizeCivitatisPayload,
  minimizeGygPayload,
  minimizeShopifyOrderPayload,
  minimizeViatorPayload,
} from "../app/utils/booking-payload-privacy.server.js";
import {
  processShopifyOrderWebhook,
  processShopifyWebhookEvent,
} from "../app/utils/shopify-orders.server.js";

const pii = {
  email: "person@example.com",
  phone: "+351900000000",
  customer: {
    first_name: "Person",
    last_name: "Example",
    email: "person@example.com",
  },
  shipping_address: {
    address1: "Private street",
  },
};

test("platform audit payloads exclude direct customer PII", () => {
  const shopify = minimizeShopifyOrderPayload({
    id: 123,
    name: "#123",
    financial_status: "paid",
    ...pii,
    line_items: [{
      id: 9,
      product_id: 10,
      variant_id: 11,
      sku: "TOUR-1",
      quantity: 2,
      properties: [{ name: "Email", value: "person@example.com" }],
    }],
  }, "ORDERS_PAID");

  const gyg = minimizeGygPayload({
    productId: "tour-1",
    travelers: [{ firstName: "Person", email: "person@example.com" }],
    bookingItems: [{ category: "ADULT", count: 2 }],
  }, "book");

  const viator = minimizeViatorPayload({
    BookingReference: "V-1",
    ContactEmail: "person@example.com",
    ContactDetail: { ContactName: "Person", ContactValue: "+351900000000" },
    Traveller: [{ FirstName: "Person" }],
    TravellerMix: { Adult: 2 },
  }, "booking");

  const civitatis = minimizeCivitatisPayload({
    productId: "tour-1",
    availabilityId: "slot-1",
    contact: { fullName: "Person", emailAddress: "person@example.com" },
    unitItems: [{
      unitId: "ADULT",
      contact: { fullName: "Person", emailAddress: "person@example.com" },
    }],
  }, "hold", "live");

  for (const payload of [shopify, gyg, viator, civitatis]) {
    assert.equal(containsDirectCustomerPii(payload), false);
  }
});

test("processed Shopify webhook IDs remain idempotent", async () => {
  const prisma = {
    integrationEvent: {
      findUnique: async () => ({
        status: "PROCESSED",
        result: { bookings: 1 },
      }),
    },
  };

  const result = await processShopifyWebhookEvent(prisma, {
    payload: { id: 123, updated_at: "2026-10-02T10:00:00Z" },
    topic: "ORDERS_UPDATED",
    shop: "example.myshopify.com",
    webhookId: "wh-123",
  });

  assert.deepEqual(result, {
    duplicate: true,
    result: { bookings: 1 },
  });
});

test("Shopify cancellation releases bookings without retaining the full order", async () => {
  let updateData = null;
  const prisma = {
    booking: {
      findMany: async () => [],
      updateMany: async ({ data }) => {
        updateData = data;
        return { count: 2 };
      },
    },
  };

  const result = await processShopifyOrderWebhook(prisma, {
    topic: "ORDERS_CANCELLED",
    payload: {
      id: 123,
      name: "#123",
      cancel_reason: "customer",
      cancelled_at: "2026-10-02T10:00:00Z",
      updated_at: "2026-10-02T10:00:00Z",
      ...pii,
    },
  });

  assert.equal(result.cancelledBookings, 2);
  assert.equal(updateData.status, "CANCELED");
  assert.equal(updateData.cancelReason, "customer");
  assert.equal(containsDirectCustomerPii(updateData.rawPayload), false);
});

import test from "node:test";
import assert from "node:assert/strict";

process.env.GYG_NOTIFY_MODE = "sandbox";
process.env.GYG_OUTGOING_USER = "sandbox-user";
process.env.GYG_OUTGOING_PASS = "sandbox-pass";
process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test";

const { gygSandboxDeals, notifyGygAvailabilityUpdate } = await import(
  "../app/utils/gyg-v1.server.js"
);
const { default: db } = await import("../app/db.server.js");

db.integrationEvent.create = async () => ({});

function mockFetch(status, body) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, init });
    return {
      status,
      json: async () => {
        if (body === undefined) throw new Error("no body");
        return body;
      },
    };
  };
  return calls;
}

const PRODUCT = "0f8fad5b-d9cb-469f-a165-70867728950e";

test("notify availability with price only targets the sandbox and sends minor units", async () => {
  const calls = mockFetch(202, { data: { message: "ok" } });
  const result = await notifyGygAvailabilityUpdate({
    productId: PRODUCT,
    manualSandboxTest: true,
    availabilities: [{
      dateTime: "2026-11-10T10:00:00+00:00",
      vacancies: 5,
      currency: "EUR",
      pricesByCategory: { retailPrices: [{ category: "ADULT", price: 4500 }] },
    }],
  });
  assert.equal(result.sent, true);
  assert.equal(calls[0].url, "https://supplier-api.getyourguide.com/sandbox/1/notify-availability-update");
  const sent = JSON.parse(calls[0].init.body).data.availabilities[0];
  assert.deepEqual(sent.pricesByCategory.retailPrices, [{ category: "ADULT", price: 4500 }]);
  assert.equal(sent.currency, "EUR");
});

test("notify availability rejects a price without a currency", async () => {
  const calls = mockFetch(202, {});
  const result = await notifyGygAvailabilityUpdate({
    productId: PRODUCT,
    manualSandboxTest: true,
    availabilities: [{
      dateTime: "2026-11-10T10:00:00+00:00",
      vacancies: 5,
      pricesByCategory: { retailPrices: [{ category: "ADULT", price: 4500 }] },
    }],
  });
  assert.equal(result.sent, false);
  assert.equal(calls.length, 0);
});

test("deals create/list/delete hit the sandbox deals endpoints", async () => {
  let calls = mockFetch(201, { deals: [{ dealId: 36457, gygTourOptionId: 1 }] });
  const created = await gygSandboxDeals({
    operation: "create",
    productId: PRODUCT,
    deal: { dealType: "last_minute", discountPercentage: 10, start: "2026-11-20", end: "2026-11-30", noticePeriodDays: 3 },
  });
  assert.equal(created.sent, true);
  assert.equal(calls[0].url, "https://supplier-api.getyourguide.com/sandbox/1/deals");
  assert.equal(calls[0].init.method, "POST");
  const data = JSON.parse(calls[0].init.body).data;
  assert.equal(data.externalProductId, PRODUCT);
  assert.deepEqual(data.dateRange, { start: "2026-11-20", end: "2026-11-30" });
  assert.equal(data.noticePeriodDays, 3);

  calls = mockFetch(200, { deals: [] });
  const listed = await gygSandboxDeals({ operation: "list", productId: PRODUCT });
  assert.equal(listed.sent, true);
  assert.equal(calls[0].url, `https://supplier-api.getyourguide.com/sandbox/1/deals?externalProductId=${PRODUCT}`);
  assert.equal(calls[0].init.method, "GET");

  calls = mockFetch(204);
  const deleted = await gygSandboxDeals({ operation: "delete", dealId: "36457" });
  assert.equal(deleted.sent, true);
  assert.equal(calls[0].url, "https://supplier-api.getyourguide.com/sandbox/1/deals/36457");
  assert.equal(calls[0].init.method, "DELETE");
});

test("deals refuse to run outside sandbox mode or with invalid input", async () => {
  const calls = mockFetch(201, {});
  assert.equal((await gygSandboxDeals({ operation: "delete", dealId: "abc" })).sent, false);
  assert.equal((await gygSandboxDeals({
    operation: "create", productId: PRODUCT,
    deal: { dealType: "last_minute", discountPercentage: 150, start: "2026-11-20", end: "2026-11-30" },
  })).sent, false);
  process.env.GYG_NOTIFY_MODE = "production";
  assert.equal((await gygSandboxDeals({ operation: "list", productId: PRODUCT })).reason, "GYG_NOTIFY_SANDBOX_NOT_ENABLED");
  process.env.GYG_NOTIFY_MODE = "sandbox";
  assert.equal(calls.length, 0);
});

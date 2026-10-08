import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  syncShopifyAvailabilityMetafields,
} from "../app/utils/shopify-availability-metafields.server.js";

test("Shopify availability mirror writes the same product fields already read by the PMY catalog", async () => {
  const graphqlCalls = [];
  const updates = [];
  const prisma = {
    tour: {
      findUnique: async () => ({
        id: "tour-1",
        shopifyProductId: "gid://shopify/Product/123",
        shopifySnapshot: { metafields: {} },
      }),
      update: async (input) => {
        updates.push(input);
        return input;
      },
    },
    blockedDate: {
      findMany: async () => [
        {
          id: "block-1",
          active: true,
          source: "MANUAL",
          date: new Date("2026-10-22T12:00:00.000Z"),
          dayOfWeek: null,
          timeSlot: "ALL",
          platforms: ["shopify"],
        },
        {
          id: "block-2",
          active: true,
          source: "MANUAL",
          date: null,
          dayOfWeek: "0",
          timeSlot: "ALL",
          platforms: [],
        },
        {
          id: "block-3",
          active: true,
          source: "MANUAL",
          date: new Date("2026-10-23T12:00:00.000Z"),
          dayOfWeek: null,
          timeSlot: "09:30",
          platforms: ["shopify"],
        },
        {
          id: "block-4",
          active: true,
          source: "MANUAL",
          date: new Date("2026-10-24T12:00:00.000Z"),
          dayOfWeek: null,
          timeSlot: "ALL",
          platforms: ["getyourguide"],
        },
      ],
      updateMany: async () => ({ count: 0 }),
    },
  };
  const admin = {
    graphql: async (query, options) => {
      graphqlCalls.push({ query, options });
      if (query.includes("query PmyAvailabilityMetafields")) {
        return {
          json: async () => ({
            data: {
              product: {
                id: "gid://shopify/Product/123",
                blockedDays: { type: "single_line_text_field", value: "" },
                blockedDates: { type: "single_line_text_field", value: "" },
              },
            },
          }),
        };
      }
      return {
        json: async () => ({
          data: {
            metafieldsSet: {
              metafields: [],
              userErrors: [],
            },
          },
        }),
      };
    },
  };

  const result = await syncShopifyAvailabilityMetafields(
    prisma,
    admin,
    "tour-1",
  );

  assert.equal(result.synced, true);
  assert.deepEqual(result.weekdays, ["0"]);
  assert.deepEqual(result.dates, ["2026-10-22"]);

  const mutation = graphqlCalls.find((call) =>
    call.query.includes("mutation PmySetAvailabilityMetafields"),
  );
  assert.ok(mutation);
  const values = Object.fromEntries(
    mutation.options.variables.metafields.map((item) => [item.key, item.value]),
  );
  assert.equal(values.blocked_days, "0");
  assert.equal(values.blocked_specific_dates, "2026-10-22");

  const snapshot = updates.at(-1).data.shopifySnapshot.metafields;
  assert.equal(snapshot.blocked_days, "0");
  assert.equal(snapshot.blocked_specific_dates, "2026-10-22");
});

test("central block actions mirror create and release into Shopify product metafields", async () => {
  const source = await fs.readFile(
    new URL("../app/services/central-route.server.js", import.meta.url),
    "utf8",
  );
  assert.equal(
    source.includes("syncShopifyAvailabilityMetafields"),
    true,
  );
  assert.equal(
    source.includes("SHOPIFY_AVAILABILITY_MIRROR_FAILED"),
    true,
  );
});

test("catalog import avoids duplicating Central-owned mirrored blocks", async () => {
  const source = await fs.readFile(
    new URL("../app/utils/tour-passport.server.js", import.meta.url),
    "utf8",
  );
  assert.equal(source.includes("centralOwnedKeys"), true);
  assert.equal(source.includes("blockTargetsPlatform(block, \"shopify\")"), true);
});

test("GYG-only availability block changes do not trigger Shopify metafield writes", async () => {
  const source = await fs.readFile(
    new URL("../app/services/central-route.server.js", import.meta.url), "utf8",
  );
  const create = source.split('if (_action === "createBlock")')[1].split('if (_action === "removeBlock")')[0];
  const remove = source.split('if (_action === "removeBlock")')[1].split('if (_action === "saveCapacity")')[0];
  assert.match(create, /if \(platforms\.includes\("shopify"\)\) try \{/);
  assert.match(remove, /blockTargetsPlatform\(existingBlock, "shopify"\)/);
});

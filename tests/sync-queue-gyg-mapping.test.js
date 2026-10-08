import test from "node:test";
import assert from "node:assert/strict";

import {
  mappedProvidersForTour,
} from "../app/utils/sync-queue.server.js";

test("sync queue recognizes active GygProductOption mappings without legacy gygActivityId", async () => {
  let receivedSelect = null;
  const prisma = {
    tour: {
      findUnique: async ({ select }) => {
        receivedSelect = select;
        return {
          shopifyProductId: "gid://shopify/Product/123",
          gygActivityId: null,
          gygProductOptions: [
            { id: "supplier-product-1", gygOptionId: "GYG-OPTION-1" },
          ],
          viatorProductCode: null,
          headoutId: null,
          civitatisId: null,
        };
      },
    },
  };

  const providers = await mappedProvidersForTour(prisma, "tour-1");

  assert.equal(
    receivedSelect.gygProductOptions.where.active,
    true,
    "Only active GYG Supplier products should count as a live mapping.",
  );
  assert.equal(receivedSelect.gygProductOptions.take, 1);
  assert.equal(providers.includes("GETYOURGUIDE"), true);
  assert.equal(providers.includes("SHOPIFY"), true);
});

test("sync queue still supports the legacy GYG activity id as migration fallback", async () => {
  const prisma = {
    tour: {
      findUnique: async () => ({
        shopifyProductId: null,
        gygActivityId: "legacy-activity-1",
        gygProductOptions: [],
        viatorProductCode: null,
        headoutId: null,
        civitatisId: null,
      }),
    },
  };

  const providers = await mappedProvidersForTour(prisma, "tour-legacy");
  assert.deepEqual(providers, ["GETYOURGUIDE"]);
});

test("sync queue does not target GYG when neither new nor legacy mapping exists", async () => {
  const prisma = {
    tour: {
      findUnique: async () => ({
        shopifyProductId: "gid://shopify/Product/999",
        gygActivityId: null,
        gygProductOptions: [],
        viatorProductCode: null,
        headoutId: null,
        civitatisId: null,
      }),
    },
  };

  const providers = await mappedProvidersForTour(prisma, "tour-no-gyg");
  assert.equal(providers.includes("GETYOURGUIDE"), false);
  assert.equal(providers.includes("SHOPIFY"), true);
});

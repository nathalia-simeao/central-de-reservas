import test from "node:test";
import assert from "node:assert/strict";
import { gygRetailPricesFor, normalizePlatformPrices } from "../app/utils/platform-prices.js";

test("platform prices keep valid euro values per category and drop the rest", () => {
  const prices = normalizePlatformPrices({
    tours: { bel: { GETYOURGUIDE: { ADULT: "69", CHILD: "34,50", YOUTH: "", SENIOR: "abc" }, HEADOUT: { ADULT: 65 }, SHOPIFY: { ADULT: 1 } } },
  });
  assert.deepEqual(prices.tours.bel, { GETYOURGUIDE: { ADULT: 69, CHILD: 34.5 }, HEADOUT: { ADULT: 65 } });
});

test("GYG receives the configured prices in cents; nothing configured falls back", () => {
  const prices = { tours: { bel: { GETYOURGUIDE: { ADULT: 69, CHILD: 34.5 } } } };
  assert.deepEqual(gygRetailPricesFor(prices, "bel"), {
    currency: "EUR",
    retailPrices: [{ category: "ADULT", price: 6900 }, { category: "CHILD", price: 3450 }],
    ambiguous: false,
  });
  assert.equal(gygRetailPricesFor(prices, "sintra"), null);
});

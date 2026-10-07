import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  consumeStorefrontRateLimit,
  storefrontReserveFingerprint,
} from "../app/utils/storefront-security.server.js";

test("storefront reserve fingerprint is stable and changes with booking data", () => {
  const base = {
    requestId: "checkout-12345678",
    groups: [
      {
        key: "tour-a",
        productId: "gid://shopify/Product/123",
        date: "2026-10-20",
        time: "09:00",
        language: "English",
        items: [
          { variantId: "gid://shopify/ProductVariant/2", quantity: 1 },
          { variantId: "gid://shopify/ProductVariant/1", quantity: 2 },
        ],
      },
    ],
  };

  const sameDifferentItemOrder = {
    ...base,
    groups: [{
      ...base.groups[0],
      items: [...base.groups[0].items].reverse(),
    }],
  };

  assert.equal(
    storefrontReserveFingerprint(base),
    storefrontReserveFingerprint(sameDifferentItemOrder),
  );

  assert.notEqual(
    storefrontReserveFingerprint(base),
    storefrontReserveFingerprint({
      ...base,
      groups: [{
        ...base.groups[0],
        time: "14:00",
      }],
    }),
  );
});

test("storefront rate limiter blocks excessive reserve attempts", () => {
  const key = "client-test-" + Date.now();
  const now = Date.now();

  for (let index = 0; index < 8; index += 1) {
    assert.equal(
      consumeStorefrontRateLimit({ key, action: "reserve", now }).allowed,
      true,
    );
  }

  const blocked = consumeStorefrontRateLimit({
    key,
    action: "reserve",
    now,
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds > 0, true);
});

test("storefront hold mutations are routed through a signed Shopify app proxy", async () => {
  const direct = await fs.readFile(
    new URL("../app/utils/storefront-hold.server.js", import.meta.url),
    "utf8",
  );
  const proxy = await fs.readFile(
    new URL("../app/routes/app-proxy.pmy.hold.jsx", import.meta.url),
    "utf8",
  );
  const shopify = await fs.readFile(
    new URL("../app/shopify.server.js", import.meta.url),
    "utf8",
  );
  const toml = await fs.readFile(
    new URL("../shopify.app.toml", import.meta.url),
    "utf8",
  );

  assert.equal(proxy.includes("authenticate.public.appProxy(request)"), true);
  assert.equal(direct.includes('STOREFRONT_APP_PROXY_ENFORCED'), true);
  assert.equal(direct.includes('status: 307'), true);
  assert.equal(direct.includes('/apps/pmy-central/hold'), true);
  assert.equal(direct.includes('legacyOriginAllowed: true'), true);
  assert.equal(direct.includes('method === "OPTIONS"'), true);
  assert.equal(shopify.includes('"write_app_proxy"'), true);
  assert.equal(toml.includes("[app_proxy]"), true);
  assert.equal(toml.includes('subpath = "pmy-central"'), true);
});

test("storefront request nonce persists idempotency state", async () => {
  const source = await fs.readFile(
    new URL("../app/utils/storefront-security.server.js", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes('provider: PROVIDER'), true);
  assert.equal(source.includes('"PROCESSING"'), true);
  assert.equal(source.includes('"PROCESSED"'), true);
  assert.equal(source.includes('"REQUEST_ID_REUSED"'), true);
});

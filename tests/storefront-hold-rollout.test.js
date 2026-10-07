import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("storefront proxy security can be rolled out without breaking checkout before Shopify config release", async () => {
  const source = await fs.readFile(
    new URL("../app/utils/storefront-hold.server.js", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("STOREFRONT_APP_PROXY_ENFORCED"), true);
  assert.equal(source.includes("legacyOriginAllowed: true"), true);
  assert.equal(source.includes('"X-PMY-Security-Mode": "shopify-app-proxy"'), true);
  assert.equal(source.includes("consumeStorefrontRateLimit"), true);
  assert.equal(source.includes("beginStorefrontRequest"), true);
});

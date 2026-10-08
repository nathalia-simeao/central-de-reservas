import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Shopify App Proxy is enforced by default after production activation", async () => {
  const source = await fs.readFile(
    new URL("../app/utils/storefront-hold.server.js", import.meta.url),
    "utf8",
  );

  assert.equal(
    source.includes('process.env.STOREFRONT_APP_PROXY_ENFORCED ?? "true"'),
    true,
  );
  assert.equal(
    source.includes('.toLowerCase() !== "false"'),
    true,
  );
  assert.equal(
    source.includes('Location: proxyUrl.toString()'),
    true,
  );
});

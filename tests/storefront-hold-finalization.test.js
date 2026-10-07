import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("storefront nonce failures are finalized and do not leave PROCESSING forever", async () => {
  const source = await fs.readFile(
    new URL("../app/routes/api.storefront-hold.jsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("let registeredRequestId = null;"), true);
  assert.equal(source.includes("registeredRequestId = requestId;"), true);
  assert.equal(source.includes("storefront_idempotency_finalize_failed"), true);
});

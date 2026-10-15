import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("GYG optional notification webhook uses inbound Basic Auth and safe response", async () => {
  const source = await fs.readFile(
    new URL("../app/routes/1.notify.jsx", import.meta.url), "utf8",
  );
  assert.ok(source.includes('requireGygAuth(request, "notify")'));
  assert.ok(source.includes('event?.notificationType !== "PRODUCT_DEACTIVATION"'));
  assert.ok(source.includes('event?.productDetails?.productId'));
  assert.ok(source.includes('gygV1Success({})'));
  assert.ok(source.includes('recordGygAuthenticatedTraffic('));
  assert.equal(source.includes('prisma.tour.update'), false);
  assert.equal(source.includes('shopifyProductUpdate'), false);
});

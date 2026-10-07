import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("storefront hold resource route exports only loader/action wrappers", async () => {
  const source = await fs.readFile(
    new URL("../app/routes/api.storefront-hold.jsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("storefront-security.server"), false);
  assert.equal(source.includes("export const loader = storefrontHoldLoader"), true);
  assert.equal(source.includes("export const action = handleStorefrontHoldDirectAction"), true);
});

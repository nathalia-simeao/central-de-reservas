import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Headout UI does not confuse distributor API with PMY supplier connectivity", async () => {
  const panel = await fs.readFile(
    new URL("../app/components/pmy/HeadoutOnboardingPanel.jsx", import.meta.url),
    "utf8",
  );
  const config = await fs.readFile(
    new URL("../app/config/pmy-central-config.js", import.meta.url),
    "utf8",
  );

  assert.equal(panel.includes("Supply Partner"), true);
  assert.equal(panel.includes("distribuidor"), true);
  assert.equal(panel.includes("Headout-Auth"), true);
  assert.equal(config.includes("PENDING_SUPPLIER_CONTRACT"), true);
});

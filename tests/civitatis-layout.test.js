import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Civitatis onboarding uses structured rows and design-system buttons", async () => {
  const panel = await fs.readFile(
    new URL("../app/components/pmy/CivitatisOnboardingPanel.jsx", import.meta.url),
    "utf8",
  );
  const modal = await fs.readFile(
    new URL("../app/components/pmy/CentralModalLayer.jsx", import.meta.url),
    "utf8",
  );
  const css = await fs.readFile(
    new URL("../app/styles/pmy-design-system.css", import.meta.url),
    "utf8",
  );

  assert.equal(panel.includes("pmy-civitatis-endpoint-row"), true);
  assert.equal(panel.includes("pmy-civitatis-product-row"), true);
  assert.equal(panel.includes('icon="copy"'), true);
  assert.equal(modal.includes("pmy-civitatis-token-actions"), true);
  assert.equal(modal.includes('icon="refresh"'), true);
  assert.equal(css.includes(".pmy-civitatis-environment-field"), true);
});

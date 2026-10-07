import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Viator endpoint rows use structured layout and design-system copy button", async () => {
  const panel = await fs.readFile(
    new URL("../app/components/pmy/ViatorOnboardingPanel.jsx", import.meta.url),
    "utf8",
  );
  const css = await fs.readFile(
    new URL("../app/styles/pmy-design-system.css", import.meta.url),
    "utf8",
  );

  assert.equal(panel.includes("pmy-viator-endpoint-row"), true);
  assert.equal(panel.includes("pmy-viator-endpoint-main"), true);
  assert.equal(panel.includes('icon="copy"'), true);
  assert.equal(css.includes(".pmy-viator-endpoint-url"), true);
  assert.equal(css.includes("overflow-wrap: anywhere"), true);
});

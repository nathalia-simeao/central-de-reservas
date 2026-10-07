import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("dashboard has dedicated tablet and mobile responsive rules", async () => {
  const ds = await fs.readFile(
    new URL("../app/styles/pmy-design-system.css", import.meta.url),
    "utf8",
  );
  const central = await fs.readFile(
    new URL("../app/styles/pmy-central-style.js", import.meta.url),
    "utf8",
  );
  const dashboard = await fs.readFile(
    new URL("../app/components/pmy/DashboardTab.jsx", import.meta.url),
    "utf8",
  );

  for (const breakpoint of ["1024px", "820px", "620px", "430px"]) {
    assert.equal(ds.includes(`@media (max-width: ${breakpoint})`), true);
  }

  assert.equal(ds.includes(".pmy-ds-departure-date::before"), true);
  assert.equal(ds.includes(".pmy-ds-ranking-controls"), true);
  assert.equal(ds.includes("position: fixed;\n    z-index: 10040;"), true);
  assert.equal(central.includes("@media (max-width: 820px)"), true);
  assert.equal(central.includes("min-width:620px"), true);
  assert.equal(dashboard.includes('data-label={lang === "pt" ? "Data" : "Date"}'), true);
  assert.equal(dashboard.includes('data-label={lang === "pt" ? "Canais" : "Channels"}'), true);
});

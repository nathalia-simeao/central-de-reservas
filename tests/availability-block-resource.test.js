import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("availability blocks use a dedicated JSON resource route", async () => {
  const routeSource = await fs.readFile(
    new URL("../app/routes/api.availability-blocks.jsx", import.meta.url),
    "utf8",
  );
  const indexSource = await fs.readFile(
    new URL("../app/routes/_index/route.jsx", import.meta.url),
    "utf8",
  );

  assert.equal(
    routeSource.includes('export { action } from "../services/central-route.server";'),
    true,
  );
  assert.equal(
    indexSource.includes('requestResourceJson("/api/availability-blocks", fd)'),
    true,
  );
});

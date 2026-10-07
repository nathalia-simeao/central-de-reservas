import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("GetYourGuide catalog uses active supplier product options instead of legacy activity ids", async () => {
  const route = await fs.readFile(
    new URL("../app/routes/_index/route.jsx", import.meta.url),
    "utf8",
  );
  const sync = await fs.readFile(
    new URL("../app/utils/platform-sync.server.js", import.meta.url),
    "utf8",
  );

  assert.equal(route.includes("(tour.gygProductOptions || [])"), true);
  assert.equal(route.includes("getyourguide: initialGygProducts"), true);
  assert.equal(sync.includes("function productItemFromGygOption"), true);
  assert.equal(sync.includes("gygProductOptions"), true);
  assert.equal(sync.includes("some: { active: true }"), true);
  assert.equal(sync.includes("items: productItems"), true);
  assert.equal(sync.includes('where: { gygActivityId: { not: null } }'), false);
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("GetYourGuide products are hydrated from mapped master tours on initial load", async () => {
  const source = await fs.readFile(
    new URL("../app/routes/_index/route.jsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("const initialGygProducts = (tours || [])"), true);
  assert.equal(source.includes(".filter((tour) => Boolean(tour.gygActivityId))"), true);
  assert.equal(source.includes("getyourguide: initialGygProducts"), true);
});

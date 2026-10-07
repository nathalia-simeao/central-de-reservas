import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("GetYourGuide products are hydrated from active Supplier product options on initial load", async () => {
  const source = await fs.readFile(
    new URL("../app/routes/_index/route.jsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("const initialGygProducts = (tours || []).flatMap"), true);
  assert.equal(source.includes("(tour.gygProductOptions || [])"), true);
  assert.equal(source.includes("option.gygOptionId"), true);
  assert.equal(source.includes("getyourguide: initialGygProducts"), true);
  assert.equal(source.includes(".filter((tour) => Boolean(tour.gygActivityId))"), false);
});

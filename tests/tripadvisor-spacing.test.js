import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Tripadvisor credential status has spacing below content actions", async () => {
  const source = await fs.readFile(
    new URL("../app/components/pmy/CentralModalLayer.jsx", import.meta.url),
    "utf8",
  );
  assert.equal(source.includes('isTripadvisor ? "pmy-u-mt-3 " : ""'), true);
});

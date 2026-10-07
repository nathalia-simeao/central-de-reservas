import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Tripadvisor Terra uses supported v1 endpoints for credential validation", async () => {
  const source = await fs.readFile(
    new URL("../app/utils/tripadvisor.server.js", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes('"/locations/search"'), true);
  assert.equal(source.includes('"/catalog/locations/search"'), false);
  assert.equal(source.includes("version: 1"), true);
  assert.equal(source.includes("version: 2"), false);
});

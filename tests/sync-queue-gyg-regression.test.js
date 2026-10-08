import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("GYG queue mapping no longer depends only on gygActivityId", async () => {
  const source = await fs.readFile(
    new URL("../app/utils/sync-queue.server.js", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("gygProductOptions: {"), true);
  assert.equal(source.includes("where: { active: true }"), true);
  assert.equal(source.includes('provider === "GETYOURGUIDE"'), true);
  assert.equal(
    source.includes("(tour.gygProductOptions || []).length > 0"),
    true,
  );
});

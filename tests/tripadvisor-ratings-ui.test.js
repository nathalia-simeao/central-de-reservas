import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Tripadvisor v1 ratings use traveler_ratings.overall", async () => {
  const server = await fs.readFile(
    new URL("../app/utils/tripadvisor.server.js", import.meta.url),
    "utf8",
  );
  assert.equal(server.includes("location?.traveler_ratings?.overall?.rating"), true);
  assert.equal(server.includes("location?.traveler_ratings?.overall?.count"), true);
  assert.equal(server.includes("review?.traveler_ratings?.overall?.rating"), true);
});

test("Tripadvisor modal uses Design System buttons", async () => {
  const modal = await fs.readFile(
    new URL("../app/components/pmy/CentralModalLayer.jsx", import.meta.url),
    "utf8",
  );
  assert.equal(modal.includes('import { Button, Icon } from "./PmyUI";'), true);
  assert.equal(modal.includes('icon="external"'), true);
  assert.equal(modal.includes('icon="refresh"'), true);
});

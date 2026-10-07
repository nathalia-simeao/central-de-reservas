import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Tripadvisor content adapter never exposes localized objects as React children", async () => {
  const source = await fs.readFile(
    new URL("../app/utils/tripadvisor.server.js", import.meta.url),
    "utf8",
  );
  const modal = await fs.readFile(
    new URL("../app/components/pmy/CentralModalLayer.jsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("function localizedText(value)"), true);
  assert.equal(source.includes('localizedText(location?.name)'), true);
  assert.equal(source.includes("title: localizedText(review?.title)"), true);
  assert.equal(source.includes("localizedText(review?.reviewer?.name)"), true);
  assert.equal(modal.includes('typeof tripadvisorContent.location.name === "string"'), true);
});

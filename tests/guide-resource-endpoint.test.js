import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("guide mutations use the dedicated JSON resource endpoint", async () => {
  const routeSource = await fs.readFile(
    new URL("../app/routes/api.guides.jsx", import.meta.url),
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

  for (const actionName of [
    "saveGuide",
    "deleteGuide",
    "saveGuideAssignment",
    "removeGuideAssignment",
  ]) {
    const actionIndex = indexSource.indexOf(`fd.append("_action", "${actionName}")`);
    assert.notEqual(actionIndex, -1, `Missing ${actionName}`);
    const nearby = indexSource.slice(actionIndex, actionIndex + 900);
    assert.equal(
      nearby.includes('requestResourceJson("/api/guides", fd)'),
      true,
      `${actionName} must use /api/guides`,
    );
  }
});

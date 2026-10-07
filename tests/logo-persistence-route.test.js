import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Central persistent settings and media use dedicated JSON mutation route", async () => {
  const route = await fs.readFile(
    new URL("../app/routes/_index/route.jsx", import.meta.url),
    "utf8",
  );
  const media = await fs.readFile(
    new URL("../app/utils/media-library.client.js", import.meta.url),
    "utf8",
  );
  const api = await fs.readFile(
    new URL("../app/routes/api.central-actions.jsx", import.meta.url),
    "utf8",
  );

  assert.equal(route.includes('requestResourceJson("/", fd)'), false);
  assert.equal(route.includes('requestResourceJson("/api/central-actions", fd)'), true);
  assert.equal(media.includes('requestResourceJson("/", prepare)'), false);
  assert.equal(media.includes('requestResourceJson("/", finalize)'), false);
  assert.equal(media.includes('requestResourceJson("/api/central-actions", prepare)'), true);
  assert.equal(media.includes('requestResourceJson("/api/central-actions", finalize)'), true);
  assert.equal(api.includes('export { action } from "../services/central-route.server";'), true);
});

test("Logo reload and light/dark selection remain backed by BusinessSetting", async () => {
  const route = await fs.readFile(
    new URL("../app/routes/_index/route.jsx", import.meta.url),
    "utf8",
  );
  const loader = await fs.readFile(
    new URL("../app/services/central-loader.server.js", import.meta.url),
    "utf8",
  );

  assert.equal(route.includes("businessSettings?.logoOnLightUrl || businessSettings?.logoUrl || null"), true);
  assert.equal(route.includes("businessSettings?.logoOnDarkUrl || null"), true);
  assert.equal(route.includes("sidebarIsDark\n    ? (logoOnDarkUrl || logoOnLightUrl)"), true);
  assert.equal(loader.includes("businessSettings,"), true);
});

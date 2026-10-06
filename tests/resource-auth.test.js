import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("resource requests explicitly attach a fresh Shopify ID token when available", async () => {
  const source = await fs.readFile(
    new URL("../app/routes/_index/route.jsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("await window.shopify?.idToken?.()"), true);
  assert.equal(source.includes("headers.Authorization = `Bearer ${idToken}`"), true);
  assert.equal(source.includes('requestResourceJson("/api/availability-blocks", fd)'), true);
  assert.equal(source.includes('requestResourceJson("/api/guides", fd)'), true);
});

test("dedicated resource routes remain registered by flatRoutes", async () => {
  const routesConfig = await fs.readFile(
    new URL("../app/routes.js", import.meta.url),
    "utf8",
  );
  const blockRoute = await fs.readFile(
    new URL("../app/routes/api.availability-blocks.jsx", import.meta.url),
    "utf8",
  );
  const guideRoute = await fs.readFile(
    new URL("../app/routes/api.guides.jsx", import.meta.url),
    "utf8",
  );

  assert.equal(routesConfig.includes("flatRoutes()"), true);
  assert.equal(blockRoute.includes("central-route.server"), true);
  assert.equal(guideRoute.includes("central-route.server"), true);
});

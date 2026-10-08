import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  SHOPIFY_SCOPES,
  SHOPIFY_SCOPE_REASONS,
} from "../app/config/shopify-scopes.js";

test("Shopify runtime uses the canonical scope list", async () => {
  const server = await fs.readFile(
    new URL("../app/shopify.server.js", import.meta.url),
    "utf8",
  );

  assert.equal(
    server.includes('import { SHOPIFY_SCOPES } from "./config/shopify-scopes"'),
    true,
  );
  assert.equal(server.includes("scopes: SHOPIFY_SCOPES"), true);
  assert.equal(server.includes("const configuredScopes = ["), false);
});

test("Shopify scopes are minimal for the Central features currently in use", () => {
  assert.deepEqual([...SHOPIFY_SCOPES], [
    "read_products",
    "write_products",
    "read_orders",
    "write_draft_orders",
    "write_files",
    "read_metaobjects",
    "write_app_proxy",
  ]);

  for (const scope of SHOPIFY_SCOPES) {
    assert.equal(Boolean(SHOPIFY_SCOPE_REASONS[scope]), true);
  }

  for (const unusedWriteScope of [
    "write_orders",
    "write_metaobjects",
    "write_metaobject_definitions",
  ]) {
    assert.equal(SHOPIFY_SCOPES.includes(unusedWriteScope), false);
  }
});

test("shopify.app.toml matches the canonical runtime scopes", async () => {
  const toml = await fs.readFile(
    new URL("../shopify.app.toml", import.meta.url),
    "utf8",
  );
  const match = toml.match(/^scopes\s*=\s*"([^"]*)"\s*$/m);
  assert.ok(match);

  const configured = match[1]
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean)
    .sort();
  const canonical = [...SHOPIFY_SCOPES].sort();

  assert.deepEqual(configured, canonical);
});
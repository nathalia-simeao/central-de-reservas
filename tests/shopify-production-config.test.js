import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const runtime = fs.readFileSync("app/shopify.server.js", "utf8");
const productionConfig = fs.readFileSync("shopify.app.toml", "utf8");
const developmentConfig = fs.readFileSync(
  "shopify.app.pmy-nathalia-dev.toml",
  "utf8",
);
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const readinessScript = fs.readFileSync(
  "scripts/assert-production-readiness.mjs",
  "utf8",
);

test("Shopify runtime and webhook configs are aligned on 2026-04", () => {
  assert.match(runtime, /apiVersion:\s*ApiVersion\.April26/);
  assert.match(runtime, /export const apiVersion = ApiVersion\.April26/);
  assert.match(productionConfig, /\[webhooks\][\s\S]*api_version = "2026-04"/);
  assert.match(developmentConfig, /\[webhooks\][\s\S]*api_version = "2026-04"/);
});

test("production deploy runs the launch readiness guard first", () => {
  assert.equal(
    packageJson.scripts.deploy,
    "npm run predeploy:shopify && shopify app deploy",
  );
  assert.equal(
    packageJson.scripts["predeploy:shopify"],
    "node scripts/assert-production-readiness.mjs",
  );
});

test("launch guard rejects known temporary hosting domains", () => {
  assert.match(readinessScript, /\.code\.run/);
  assert.match(readinessScript, /\.northflank\.app/);
  assert.match(readinessScript, /SHOPIFY_APP_URL/);
  assert.match(readinessScript, /application_url/);
});

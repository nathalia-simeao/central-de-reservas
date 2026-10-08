import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SHOPIFY_SCOPES } from "../app/config/shopify-scopes.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tomlPath = path.join(root, "shopify.app.toml");
const toml = await fs.readFile(tomlPath, "utf8");

const match = toml.match(/^scopes\s*=\s*"([^"]*)"\s*$/m);
if (!match) {
  console.error("[SHOPIFY_SCOPES] Missing [access_scopes].scopes in shopify.app.toml.");
  process.exit(1);
}

const normalize = (values) =>
  [...new Set(values.map((value) => String(value).trim()).filter(Boolean))].sort();

const canonical = normalize(SHOPIFY_SCOPES);
const configured = normalize(match[1].split(","));

const missing = canonical.filter((scope) => !configured.includes(scope));
const extra = configured.filter((scope) => !canonical.includes(scope));

if (missing.length || extra.length) {
  console.error("[SHOPIFY_SCOPES] Runtime and shopify.app.toml are out of sync.");
  if (missing.length) console.error("Missing from TOML:", missing.join(", "));
  if (extra.length) console.error("Extra in TOML:", extra.join(", "));
  process.exit(1);
}

const forbiddenUnusedWrites = [
  "write_orders",
  "write_metaobjects",
  "write_metaobject_definitions",
];

const unnecessary = configured.filter((scope) =>
  forbiddenUnusedWrites.includes(scope),
);
if (unnecessary.length) {
  console.error(
    "[SHOPIFY_SCOPES] Unused write scopes detected:",
    unnecessary.join(", "),
  );
  process.exit(1);
}

console.log(
  `[SHOPIFY_SCOPES] OK: ${configured.length} minimal scopes match runtime and TOML.`,
);
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "shopify.app.toml");
const runtimePath = path.join(root, "app", "shopify.server.js");

const EXPECTED_API_VERSION = "2026-04";
const EXPECTED_RUNTIME_ENUM = "ApiVersion.April26";

function fail(message) {
  console.error(`[production-readiness] ${message}`);
  process.exitCode = 1;
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function extractQuotedValue(source, key) {
  const match = source.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, "m"));
  return match?.[1] || null;
}

function extractRedirectUrls(source) {
  const match = source.match(/^redirect_urls\s*=\s*\[(.*?)\]/ms);
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
}

function isTemporaryOrUnsafeUrl(value) {
  if (!value) return true;

  let url;
  try {
    url = new URL(value);
  } catch {
    return true;
  }

  const host = url.hostname.toLowerCase();

  return (
    url.protocol !== "https:" ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".code.run") ||
    host.endsWith(".northflank.app") ||
    host.endsWith(".example.com") ||
    host === "example.com"
  );
}

const config = read(configPath);
const runtime = read(runtimePath);

const webhookVersion = extractQuotedValue(config, "api_version");
const applicationUrl = extractQuotedValue(config, "application_url");
const redirectUrls = extractRedirectUrls(config);
const runtimeUrl = process.env.SHOPIFY_APP_URL?.trim() || null;

if (webhookVersion !== EXPECTED_API_VERSION) {
  fail(
    `shopify.app.toml webhooks use ${webhookVersion || "no version"}, expected ${EXPECTED_API_VERSION}.`,
  );
}

if (!runtime.includes(`apiVersion: ${EXPECTED_RUNTIME_ENUM}`)) {
  fail(
    `Shopify runtime is not pinned to ${EXPECTED_API_VERSION} (${EXPECTED_RUNTIME_ENUM}).`,
  );
}

if (!runtime.includes(`export const apiVersion = ${EXPECTED_RUNTIME_ENUM}`)) {
  fail("The exported Shopify API version is out of sync with the runtime.");
}

if (isTemporaryOrUnsafeUrl(applicationUrl)) {
  fail(
    `Production application_url must be a definitive HTTPS domain before launch. Current value: ${applicationUrl || "missing"}.`,
  );
}

const expectedCallback = applicationUrl ? `${applicationUrl.replace(/\/$/, "")}/auth/callback` : null;
if (!expectedCallback || !redirectUrls.includes(expectedCallback)) {
  fail(
    `Production redirect_urls must include the canonical callback ${expectedCallback || "(unknown)"}.`,
  );
}

if (!runtimeUrl) {
  fail("SHOPIFY_APP_URL must be set in the production environment before Shopify config deploy.");
} else if (isTemporaryOrUnsafeUrl(runtimeUrl)) {
  fail(`SHOPIFY_APP_URL is still temporary or unsafe: ${runtimeUrl}.`);
} else if (
  applicationUrl &&
  runtimeUrl.replace(/\/$/, "") !== applicationUrl.replace(/\/$/, "")
) {
  fail(
    `SHOPIFY_APP_URL (${runtimeUrl}) does not match shopify.app.toml application_url (${applicationUrl}).`,
  );
}

if (process.exitCode) {
  console.error(
    "[production-readiness] Launch guard failed. Update the definitive domain and retry.",
  );
} else {
  console.log(
    `[production-readiness] OK: Shopify API ${EXPECTED_API_VERSION} and canonical production domain are aligned.`,
  );
}

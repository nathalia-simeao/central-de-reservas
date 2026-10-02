import test from "node:test";
import assert from "node:assert/strict";

import { deriveProviderHealth } from "../app/utils/integration-health.server.js";

test("dead sync jobs make a provider unhealthy", () => {
  const health = deriveProviderHealth({
    provider: "SHOPIFY",
    queue: { DEAD: 1 },
    latestEvent: { status: "PROCESSED" },
  });

  assert.equal(health.status, "ERROR");
  assert.equal(health.reason, "DEAD_SYNC_JOBS");
});

test("configured supplier credentials without authenticated traffic remain warning", () => {
  const health = deriveProviderHealth({
    provider: "VIATOR",
    queue: {},
    secret: {
      hasCredential: true,
      status: "CONFIGURED",
      lastValidationStatus: "LOCAL_CHECK",
    },
    environment: {},
  });

  assert.equal(health.status, "WARNING");
  assert.equal(health.reason, "WAITING_FOR_AUTHENTICATED_TRAFFIC");
});

test("missing Headout onboarding is observable without being treated as an outage", () => {
  const health = deriveProviderHealth({
    provider: "HEADOUT",
    queue: {},
    environment: { configured: false },
  });

  assert.equal(health.status, "UNKNOWN");
  assert.equal(health.reason, "ONBOARDING_PENDING");
});

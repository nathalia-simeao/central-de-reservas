import test from "node:test";
import assert from "node:assert/strict";

import {
  isRetryableHttpStatus,
  normalizeProvider,
  retryDelayMs,
} from "../app/utils/sync-queue.server.js";

test("provider aliases normalize to the canonical queue provider", () => {
  assert.equal(normalizeProvider("gyg"), "GETYOURGUIDE");
  assert.equal(normalizeProvider("get_your_guide"), "GETYOURGUIDE");
  assert.equal(normalizeProvider("shop"), "SHOPIFY");
});

test("queue retry policy backs off and caps at 24 hours", () => {
  assert.equal(retryDelayMs(1), 60_000);
  assert.equal(retryDelayMs(2), 300_000);
  assert.equal(retryDelayMs(8), 86_400_000);
  assert.equal(retryDelayMs(99), 86_400_000);
});

test("only transient HTTP failures are retried", () => {
  assert.equal(isRetryableHttpStatus(429), true);
  assert.equal(isRetryableHttpStatus(503), true);
  assert.equal(isRetryableHttpStatus(400), false);
  assert.equal(isRetryableHttpStatus(401), false);
});

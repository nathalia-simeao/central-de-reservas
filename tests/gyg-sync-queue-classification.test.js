import assert from "node:assert/strict";
import test from "node:test";
import { classifyGygResult } from "../app/utils/sync-queue.server.js";

test("GYG: outbound notifications restricted to manual sandbox remain blocked, not retried", () => {
  assert.equal(classifyGygResult({ sent: false, reason: "GYG_NOTIFY_MANUAL_SANDBOX_ONLY" }).status, "BLOCKED");
  assert.equal(classifyGygResult({
    sent: false,
    results: [{ productId: "option-1", sent: false, reason: "GYG_NOTIFY_MANUAL_SANDBOX_ONLY" }],
  }).status, "BLOCKED");
});

test("GYG: mixed or partially delivered notifications must not be reported as completed", () => {
  const result = {
    sent: true,
    results: [
      { productId: "option-1", sent: true },
      { productId: "option-2", sent: false, reason: "GYG_NOTIFY_MANUAL_SANDBOX_ONLY" },
    ],
  };
  assert.equal(classifyGygResult(result).status, "BLOCKED");
});

test("GYG: missing outbound credentials remain blocked", () => {
  assert.equal(classifyGygResult({ sent: false, reason: "OUTGOING_GYG_NOT_CONFIGURED" }).status, "BLOCKED");
});

test("GYG: successful sends and non-deliverable slots retain their existing classification", () => {
  assert.equal(classifyGygResult({ sent: true, status: 202 }).status, "COMPLETED");
  assert.equal(classifyGygResult({ sent: false, reason: "NO_MAPPED_OPTION_FOR_SLOT" }).status, "SKIPPED");
  assert.equal(classifyGygResult({ sent: false, status: 400 }).status, "DEAD");
});

import test from "node:test";
import assert from "node:assert/strict";
import { classifyBookingForDashboard } from "../app/utils/dashboard-view-model.js";

const now = new Date("2026-11-02T12:00:00Z");
const past = "2026-11-01T09:30:00Z";
const future = "2026-11-04T09:30:00Z";

test("a confirmed future booking is 'confirmed'", () => {
  assert.equal(classifyBookingForDashboard({ status: "CONFIRMED", startTime: future }, now), "confirmed");
});

test("a confirmed past booking is NOT completed until someone marks it", () => {
  assert.equal(classifyBookingForDashboard({ status: "CONFIRMED", startTime: past }, now), "awaiting");
});

test("attendance decides completed vs no-show", () => {
  assert.equal(classifyBookingForDashboard({ status: "CONFIRMED", startTime: past, attendanceStatus: "COMPLETED" }, now), "completed");
  assert.equal(classifyBookingForDashboard({ status: "CONFIRMED", startTime: past, attendanceStatus: "NO_SHOW" }, now), "noShow");
});

test("cancelled and pending keep their buckets", () => {
  assert.equal(classifyBookingForDashboard({ status: "CANCELED", startTime: past, attendanceStatus: "COMPLETED" }, now), "canceled");
  assert.equal(classifyBookingForDashboard({ status: "PENDING", startTime: past }, now), "pending");
});

test("an abandoned checkout (released hold) is not a cancellation", () => {
  assert.equal(classifyBookingForDashboard({ status: "CANCELED", syncStatus: "HOLD_RELEASED", startTime: future }, now), "unclassified");
  assert.equal(classifyBookingForDashboard({ status: "CANCELED", syncStatus: "SYNCED", startTime: future }, now), "canceled");
});

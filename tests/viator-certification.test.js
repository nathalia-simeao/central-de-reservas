import test from "node:test";
import assert from "node:assert/strict";

import {
  VIATOR_CERTIFICATION_STEPS,
  buildViatorCertificationEvidence,
  summarizeViatorMappings,
} from "../app/utils/viator-certification.js";

test("Viator certification tracks required v1/v2 booking flow operations", () => {
  assert.deepEqual(
    VIATOR_CERTIFICATION_STEPS.map((step) => [step.key, step.required]),
    [
      ["tourlist", true],
      ["availability-check", true],
      ["availability-calendar", true],
      ["reserve", true],
      ["booking", true],
      ["booking-cancellation", true],
      ["booking-amendment", false],
    ],
  );
});

test("Viator technical evidence completes after every required step passes", () => {
  const events = VIATOR_CERTIFICATION_STEPS
    .filter((step) => step.required)
    .map((step, index) => ({
      provider: "VIATOR",
      topic: step.key,
      status: "RECEIVED",
      receivedAt: new Date(Date.UTC(2026, 9, 7, 12, index)).toISOString(),
    }));

  const evidence = buildViatorCertificationEvidence(events);

  assert.equal(evidence.verifiedRequired, 6);
  assert.equal(evidence.requiredTotal, 6);
  assert.equal(evidence.technicalEvidenceComplete, true);
  assert.equal(evidence.trafficVerified, true);
});

test("Viator failed traffic does not count as certification evidence", () => {
  const evidence = buildViatorCertificationEvidence([
    {
      provider: "VIATOR",
      topic: "availability-check",
      status: "ERROR",
      receivedAt: "2026-10-07T12:00:00.000Z",
      error: "INVALID_SUPPLIER",
    },
  ]);

  const step = evidence.steps.find(
    (item) => item.key === "availability-check",
  );
  assert.equal(step.verified, false);
  assert.equal(step.error, "INVALID_SUPPLIER");
  assert.equal(evidence.technicalEvidenceComplete, false);
});

test("Viator amendment remains optional for core certification completion", () => {
  const requiredEvents = VIATOR_CERTIFICATION_STEPS
    .filter((step) => step.required)
    .map((step) => ({
      provider: "VIATOR",
      topic: step.key,
      status: "RECEIVED",
      receivedAt: "2026-10-07T12:00:00.000Z",
    }));

  const evidence = buildViatorCertificationEvidence(requiredEvents);
  const amendment = evidence.steps.find(
    (step) => step.key === "booking-amendment",
  );

  assert.equal(amendment.required, false);
  assert.equal(amendment.verified, false);
  assert.equal(evidence.technicalEvidenceComplete, true);
});

test("Viator mapping summary separates product and tour grade mapping readiness", () => {
  const summary = summarizeViatorMappings([
    {
      shopifyStatus: "ACTIVE",
      viatorProductCode: "VIATOR-1",
      viatorTourGradeCode: "TG1",
      scheduleSlots: ["09:00"],
      variants: [{ active: true, passengerCategory: "ADULT" }],
    },
    {
      shopifyStatus: "ACTIVE",
      viatorProductCode: "VIATOR-2",
      viatorTourGradeCode: null,
      scheduleSlots: ["14:00"],
      variants: [{ active: true, passengerCategory: "ADULT" }],
    },
    {
      shopifyStatus: "ACTIVE",
      viatorProductCode: null,
      viatorTourGradeCode: null,
      scheduleSlots: ["11:00"],
      variants: [{ active: true, passengerCategory: "CHILD" }],
    },
  ]);

  assert.deepEqual(summary, {
    activeTours: 3,
    mappedTours: 2,
    fullyMappedTours: 1,
    readyTours: 2,
    mappingMissing: 1,
    optionMappingMissing: 1,
  });
});

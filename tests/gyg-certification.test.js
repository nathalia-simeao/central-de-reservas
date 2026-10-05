import test from "node:test";
import assert from "node:assert/strict";

import {
  GYG_CERTIFICATION_STEPS,
  buildGygCertificationEvidence,
  summarizeGygOptionMappings,
} from "../app/utils/gyg-certification.js";

test("GYG certification matrix covers all six mandatory operations", () => {
  assert.deepEqual(
    GYG_CERTIFICATION_STEPS.map((step) => step.key),
    [
      "get-availabilities",
      "reserve",
      "cancel-reservation",
      "book",
      "cancel-booking",
      "notify-availability-update",
    ],
  );
});

test("GYG technical evidence is complete only after all operations pass", () => {
  const events = GYG_CERTIFICATION_STEPS.map((step, index) => ({
    provider: "GETYOURGUIDE",
    topic: step.key,
    status: step.direction === "OUTBOUND" ? "PROCESSED" : "RECEIVED",
    receivedAt: new Date(Date.UTC(2026, 9, 2, 12, index)).toISOString(),
    processedAt: new Date(Date.UTC(2026, 9, 2, 12, index)).toISOString(),
  }));

  const evidence = buildGygCertificationEvidence(events);

  assert.equal(evidence.verified, 6);
  assert.equal(evidence.total, 6);
  assert.equal(evidence.trafficVerified, true);
  assert.equal(evidence.technicalEvidenceComplete, true);
  assert.equal(evidence.steps.every((step) => step.verified), true);
});

test("failed GYG operation does not count as certification evidence", () => {
  const events = [
    {
      provider: "GETYOURGUIDE",
      topic: "get-availabilities",
      status: "ERROR",
      receivedAt: "2026-10-02T12:00:00.000Z",
    },
    {
      provider: "GETYOURGUIDE",
      topic: "reserve",
      status: "RECEIVED",
      receivedAt: "2026-10-02T12:01:00.000Z",
    },
  ];

  const evidence = buildGygCertificationEvidence(events);

  assert.equal(
    evidence.steps.find((step) => step.key === "get-availabilities").verified,
    false,
  );
  assert.equal(
    evidence.steps.find((step) => step.key === "reserve").verified,
    true,
  );
  assert.equal(evidence.trafficVerified, true);
  assert.equal(evidence.technicalEvidenceComplete, false);
});

test("outbound notify requires a processed response from GYG", () => {
  const evidence = buildGygCertificationEvidence([
    {
      provider: "GETYOURGUIDE",
      topic: "notify-availability-update",
      status: "RECEIVED",
      receivedAt: "2026-10-02T12:00:00.000Z",
    },
  ]);

  assert.equal(
    evidence.steps.find((step) => step.key === "notify-availability-update")
      .verified,
    false,
  );
});

test("GYG option mapping summary exposes unmapped operational options", () => {
  const summary = summarizeGygOptionMappings([
    {
      id: "tour-1",
      gygProductOptions: [
        { id: "o1", active: true, gygOptionId: "gyg-option-1" },
        { id: "o2", active: true, gygOptionId: null },
        { id: "o3", active: false, gygOptionId: null },
      ],
    },
    {
      id: "tour-2",
      gygProductOptions: [
        { id: "o4", active: true, gygOptionId: null },
      ],
    },
  ]);

  assert.deepEqual(summary, {
    mappedTours: 1,
    activeOptions: 3,
    mappedOptions: 1,
    optionMappingMissing: 2,
  });
});

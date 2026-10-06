import test from "node:test";
import assert from "node:assert/strict";

import {
  GYG_CERTIFICATION_STEPS,
  buildGygCertificationEvidence,
  summarizeGygOptionMappings,
} from "../app/utils/gyg-certification.js";
import {
  bookingMatchesGygRequest,
  ticketsForBooking,
} from "../app/utils/gyg-v1.server.js";

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


test("GYG booking response emits one deterministic QR ticket per participant", () => {
  const booking = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    adults: 2,
    children: 1,
    youths: 0,
    seniors: 1,
  };

  const tickets = ticketsForBooking(booking);

  assert.equal(tickets.length, 4);
  assert.deepEqual(
    tickets.map((ticket) => ticket.category),
    ["ADULT", "ADULT", "CHILD", "SENIOR"],
  );
  assert.equal(tickets.every((ticket) => ticket.ticketCodeType === "QR_CODE"), true);
  assert.equal(new Set(tickets.map((ticket) => ticket.ticketCode)).size, 4);
  assert.deepEqual(ticketsForBooking(booking), tickets);
});

test("GYG reserve retry matches the same slot and quantities but not a modification", () => {
  const booking = {
    externalProductId: "prod-1",
    startTime: new Date("2026-10-15T09:00:00.000Z"),
    totalParticipants: 2,
    adults: 2,
    children: 0,
    youths: 0,
    seniors: 0,
  };

  assert.equal(
    bookingMatchesGygRequest(booking, {
      productId: "prod-1",
      startTime: new Date("2026-10-15T09:00:00.000Z"),
      counts: {
        totalParticipants: 2,
        adults: 2,
        children: 0,
        youths: 0,
        seniors: 0,
      },
    }),
    true,
  );

  assert.equal(
    bookingMatchesGygRequest(booking, {
      productId: "prod-1",
      startTime: new Date("2026-10-16T09:00:00.000Z"),
      counts: {
        totalParticipants: 2,
        adults: 2,
        children: 0,
        youths: 0,
        seniors: 0,
      },
    }),
    false,
  );
});

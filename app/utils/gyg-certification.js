export const GYG_CERTIFICATION_STEPS = [
  {
    key: "get-availabilities",
    label: "Availability",
    direction: "INBOUND",
  },
  {
    key: "reserve",
    label: "Reserve",
    direction: "INBOUND",
  },
  {
    key: "cancel-reservation",
    label: "Cancel reservation",
    direction: "INBOUND",
  },
  {
    key: "book",
    label: "Book",
    direction: "INBOUND",
  },
  {
    key: "cancel-booking",
    label: "Cancel booking",
    direction: "INBOUND",
  },
  {
    key: "notify-availability-update",
    label: "Notify availability",
    direction: "OUTBOUND",
  },
];

function dateValue(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function eventPassed(event, direction) {
  if (!event) return false;
  const status = String(event.status || "").toUpperCase();
  if (direction === "OUTBOUND") return status === "PROCESSED";
  return ["RECEIVED", "PROCESSED"].includes(status);
}

export function buildGygCertificationEvidence(events = []) {
  const rows = GYG_CERTIFICATION_STEPS.map((step) => {
    const matching = (events || [])
      .filter(
        (event) =>
          String(event?.provider || "").toUpperCase() === "GETYOURGUIDE" &&
          String(event?.topic || "").toLowerCase() === step.key,
      )
      .sort((left, right) => {
        const leftDate =
          dateValue(left?.processedAt) ||
          dateValue(left?.receivedAt) ||
          dateValue(left?.updatedAt);
        const rightDate =
          dateValue(right?.processedAt) ||
          dateValue(right?.receivedAt) ||
          dateValue(right?.updatedAt);
        return (rightDate?.getTime() || 0) - (leftDate?.getTime() || 0);
      });

    const passedEvent = matching.find((event) =>
      eventPassed(event, step.direction),
    );
    const latest = passedEvent || matching[0] || null;
    const latestAt =
      dateValue(latest?.processedAt) ||
      dateValue(latest?.receivedAt) ||
      dateValue(latest?.updatedAt);

    return {
      ...step,
      verified: Boolean(passedEvent),
      lastSeenAt: latestAt ? latestAt.toISOString() : null,
      lastStatus: latest?.status || null,
    };
  });

  const verified = rows.filter((row) => row.verified).length;
  const inboundRows = rows.filter((row) => row.direction === "INBOUND");
  const trafficVerified = inboundRows.some((row) => row.verified);
  const lastTrafficAt = rows
    .map((row) => dateValue(row.lastSeenAt))
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime())[0] || null;

  return {
    steps: rows,
    verified,
    total: rows.length,
    trafficVerified,
    technicalEvidenceComplete: verified === rows.length,
    lastTrafficAt: lastTrafficAt ? lastTrafficAt.toISOString() : null,
  };
}

export function summarizeGygOptionMappings(tours = []) {
  const activeOptions = (tours || []).flatMap((tour) =>
    (tour?.gygProductOptions || [])
      .filter((option) => option?.active !== false)
      .map((option) => ({ tour, option })),
  );

  const mapped = activeOptions.filter(({ option }) =>
    Boolean(String(option?.gygOptionId || "").trim()),
  );

  const mappedTourIds = new Set(
    activeOptions
      .filter(({ option }) => Boolean(String(option?.gygOptionId || "").trim()))
      .map(({ tour }) => tour.id),
  );

  return {
    mappedTours: mappedTourIds.size,
    activeOptions: activeOptions.length,
    mappedOptions: mapped.length,
    optionMappingMissing: Math.max(0, activeOptions.length - mapped.length),
  };
}

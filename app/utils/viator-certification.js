export const VIATOR_CERTIFICATION_STEPS = [
  { key: "tourlist", label: "Tour List", direction: "INBOUND", required: true },
  { key: "availability-check", label: "Availability Check", direction: "INBOUND", required: true },
  { key: "availability-calendar", label: "Calendar", direction: "INBOUND", required: true },
  { key: "reserve", label: "Reserve", direction: "INBOUND", required: true },
  { key: "booking", label: "Booking", direction: "INBOUND", required: true },
  { key: "booking-cancellation", label: "Booking Cancellation", direction: "INBOUND", required: true },
  { key: "booking-amendment", label: "Booking Amendment", direction: "INBOUND", required: false },
];

function dateValue(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function eventPassed(event) {
  if (!event) return false;
  const status = String(event.status || "").toUpperCase();
  return ["RECEIVED", "PROCESSED"].includes(status);
}

export function buildViatorCertificationEvidence(events = []) {
  const steps = VIATOR_CERTIFICATION_STEPS.map((step) => {
    const matching = (events || [])
      .filter(
        (event) =>
          String(event?.provider || "").toUpperCase() === "VIATOR" &&
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

    const last = matching[0] || null;
    return {
      ...step,
      verified: eventPassed(last),
      status: last?.status || null,
      lastSeenAt:
        last?.processedAt ||
        last?.receivedAt ||
        last?.updatedAt ||
        null,
      error: last?.error || null,
    };
  });

  const required = steps.filter((step) => step.required);
  const verifiedRequired = required.filter((step) => step.verified).length;
  const verifiedTotal = steps.filter((step) => step.verified).length;
  const trafficDates = (events || [])
    .filter((event) => String(event?.provider || "").toUpperCase() === "VIATOR")
    .map(
      (event) =>
        dateValue(event?.processedAt) ||
        dateValue(event?.receivedAt) ||
        dateValue(event?.updatedAt),
    )
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime());

  return {
    steps,
    verifiedRequired,
    requiredTotal: required.length,
    verifiedTotal,
    total: steps.length,
    trafficVerified: trafficDates.length > 0,
    technicalEvidenceComplete:
      required.length > 0 && verifiedRequired === required.length,
    lastTrafficAt: trafficDates[0]?.toISOString() || null,
  };
}

export function summarizeViatorMappings(tours = []) {
  const activeTours = (tours || []).filter(
    (tour) => String(tour?.shopifyStatus || "").toUpperCase() !== "INACTIVE",
  );
  const mappedTours = activeTours.filter((tour) =>
    Boolean(String(tour?.viatorProductCode || "").trim()),
  );
  const fullyMappedTours = mappedTours.filter((tour) =>
    Boolean(String(tour?.viatorTourGradeCode || "").trim()),
  );
  const readyTours = activeTours.filter((tour) => {
    const scheduleReady =
      Array.isArray(tour?.scheduleSlots) && tour.scheduleSlots.length > 0;
    const hasSellableVariant = (tour?.variants || []).some(
      (variant) =>
        variant?.active !== false &&
        ["ADULT", "CHILD", "YOUTH", "SENIOR"].includes(
          String(variant?.passengerCategory || "").toUpperCase(),
        ),
    );
    return (
      scheduleReady &&
      hasSellableVariant &&
      Boolean(String(tour?.viatorProductCode || "").trim())
    );
  });

  return {
    activeTours: activeTours.length,
    mappedTours: mappedTours.length,
    fullyMappedTours: fullyMappedTours.length,
    readyTours: readyTours.length,
    mappingMissing: Math.max(0, activeTours.length - mappedTours.length),
    optionMappingMissing: Math.max(
      0,
      mappedTours.length - fullyMappedTours.length,
    ),
  };
}

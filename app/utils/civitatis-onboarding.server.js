import crypto from "node:crypto";
import {
  civitatisPickupsConfigured,
  civitatisPricingConfigured,
} from "./civitatis.server";
import {
  getIntegrationCredentials,
  getSafeIntegrationSecretStatus,
} from "./integration-secrets.server";

const PROVIDER = "CIVITATIS";
const INDIVIDUAL_CATEGORIES = new Set(["ADULT", "CHILD", "YOUTH", "SENIOR"]);

function clean(value) {
  return String(value ?? "").trim();
}

function categoriesForTour(tour) {
  return [
    ...new Set(
      (tour?.variants || [])
        .filter((variant) => variant?.active !== false)
        .map((variant) => clean(variant?.passengerCategory).toUpperCase())
        .filter((value) => INDIVIDUAL_CATEGORIES.has(value)),
    ),
  ];
}

function groupOnlyTour(tour) {
  const categories = new Set(
    (tour?.variants || [])
      .filter((variant) => variant?.active !== false)
      .map((variant) => clean(variant?.passengerCategory).toUpperCase())
      .filter(Boolean),
  );
  return categories.has("GROUP") &&
    ![...INDIVIDUAL_CATEGORIES].some((item) => categories.has(item));
}

function tourIsReady(tour) {
  return Boolean(
    tour &&
      tour.shopifyStatus !== "INACTIVE" &&
      Array.isArray(tour.scheduleSlots) &&
      tour.scheduleSlots.length > 0 &&
      Number.isInteger(tour.durationMinutes) &&
      tour.durationMinutes > 0 &&
      !groupOnlyTour(tour) &&
      categoriesForTour(tour).length > 0,
  );
}

export async function recordCivitatisEvidence(prisma, topic, payload = null) {
  try {
    await prisma.integrationEvent.create({
      data: {
        provider: PROVIDER,
        externalEventId:
          "civitatis:" +
          String(topic || "event").toLowerCase() +
          ":" +
          crypto.randomUUID(),
        topic: String(topic || "EVENT").toUpperCase(),
        status: "PROCESSED",
        payload: payload && typeof payload === "object" ? payload : null,
        processedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[CIVITATIS] evidence audit failed", topic, error);
  }
}

async function credentialSnapshot(prisma) {
  const safe = await getSafeIntegrationSecretStatus(prisma, PROVIDER).catch(() => null);
  let stored = null;
  try {
    stored = await getIntegrationCredentials(prisma, PROVIDER);
  } catch {
    stored = null;
  }

  return {
    safe,
    tokenConfigured: Boolean(clean(stored?.credentials?.token)),
    environment:
      clean(stored?.credentials?.environment || stored?.record?.environment || "test").toLowerCase() || "test",
  };
}

export async function buildCivitatisOnboardingStatus(prisma, requestUrl) {
  const [credential, tours, bookings, events] = await Promise.all([
    credentialSnapshot(prisma),
    prisma.tour.findMany({
      where: { shopifyStatus: { not: "INACTIVE" } },
      include: { variants: true },
      orderBy: { title: "asc" },
    }),
    prisma.booking.findMany({
      where: { platform: PROVIDER },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.integrationEvent.findMany({
      where: { provider: PROVIDER },
      orderBy: { receivedAt: "desc" },
      take: 120,
    }),
  ]);

  const readyTours = tours.filter(tourIsReady);
  const eventTopics = new Set(
    events.map((item) => clean(item.topic).toUpperCase()),
  );

  const bookingCounts = bookings.reduce(
    (acc, booking) => {
      const status = clean(booking?.status).toUpperCase();
      if (status === "PENDING") acc.pending += 1;
      else if (status === "CONFIRMED") acc.confirmed += 1;
      else if (["CANCELED", "CANCELLED"].includes(status)) acc.canceled += 1;
      return acc;
    },
    { pending: 0, confirmed: 0, canceled: 0 },
  );

  const base =
    clean(process.env.SHOPIFY_APP_URL) ||
    (() => {
      try {
        return new URL(requestUrl).origin;
      } catch {
        return "";
      }
    })();

  const endpoints = [
    { key: "PRODUCTS", label: "Products", method: "GET", path: "/products" },
    { key: "PRODUCT", label: "Product", method: "GET", path: "/product/{id}" },
    { key: "AVAILABILITY", label: "Availability", method: "POST", path: "/availability" },
    { key: "BOOKING_CREATE", label: "Create Booking", method: "POST", path: "/bookings" },
    { key: "BOOKING_CONFIRM", label: "Confirm Booking", method: "POST", path: "/bookings/{uuid}/confirm" },
    { key: "BOOKING_GET", label: "Get Booking", method: "GET", path: "/bookings/{uuid}" },
    { key: "BOOKING_CANCEL", label: "Cancel Booking", method: "DELETE", path: "/bookings/{uuid}" },
    { key: "HEALTHCHECK", label: "Healthcheck", method: "GET", path: "/healthcheck" },
  ].map((endpoint) => ({
    ...endpoint,
    url: base.replace(/\/+$/, "") + endpoint.path,
    verified: eventTopics.has(endpoint.key),
  }));

  const evidence = {
    credentials: credential.tokenConfigured,
    testEnvironment:
      credential.tokenConfigured && credential.environment === "test",
    authenticatedTraffic: credential.safe?.status === "CONNECTED",
    products: eventTopics.has("PRODUCTS") || eventTopics.has("PRODUCT"),
    availability: eventTopics.has("AVAILABILITY"),
    reserve:
      eventTopics.has("BOOKING_CREATE") ||
      bookingCounts.pending > 0 ||
      bookingCounts.confirmed > 0,
    confirm:
      eventTopics.has("BOOKING_CONFIRM") ||
      bookingCounts.confirmed > 0,
    cancel:
      eventTopics.has("BOOKING_CANCEL") ||
      bookingCounts.canceled > 0,
    pricing: civitatisPricingConfigured(),
    pickups: civitatisPickupsConfigured(),
  };

  return {
    credentialsConfigured: credential.tokenConfigured,
    environment: credential.environment,
    connectionStatus: credential.safe?.status || null,
    trafficVerified: credential.safe?.status === "CONNECTED",
    lastValidatedAt: credential.safe?.lastValidatedAt || null,
    pricingConfigured: civitatisPricingConfigured(),
    pickupsConfigured: civitatisPickupsConfigured(),
    activeTours: tours.length,
    readyTours: readyTours.length,
    bookingCounts,
    localProducts: tours.map((tour) => ({
      id: tour.id,
      title: tour.title,
      civitatisId: tour.civitatisId || null,
      ready: tourIsReady(tour),
      scheduleSlots: tour.scheduleSlots || [],
      durationMinutes: tour.durationMinutes || null,
      categories: categoriesForTour(tour),
      optionId: "STANDARD",
    })),
    endpoints,
    evidence,
  };
}

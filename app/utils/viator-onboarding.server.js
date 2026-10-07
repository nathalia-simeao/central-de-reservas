import crypto from "node:crypto";
import {
  getIntegrationCredentials,
  getSafeIntegrationSecretStatus,
} from "./integration-secrets.server";

const PROVIDER = "VIATOR";
const DEFAULT_API_BASE = "https://api.viator.com";
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

function tourIsReady(tour) {
  return Boolean(
    tour &&
      tour.shopifyStatus !== "INACTIVE" &&
      Array.isArray(tour.scheduleSlots) &&
      tour.scheduleSlots.length > 0 &&
      categoriesForTour(tour).length > 0,
  );
}

async function credentialsForViator(prisma) {
  let stored = null;
  try {
    stored = await getIntegrationCredentials(prisma, PROVIDER);
  } catch {
    stored = null;
  }

  const apiKey =
    clean(stored?.credentials?.apiKey) ||
    clean(process.env.VIATOR_API_KEY);
  const supplierIdRaw =
    clean(stored?.credentials?.supplierId) ||
    clean(process.env.VIATOR_SUPPLIER_ID);
  const supplierId = /^\d+$/.test(supplierIdRaw)
    ? Number(supplierIdRaw)
    : null;

  return {
    apiKey,
    supplierId,
    source: stored?.credentials?.apiKey
      ? "INTEGRATION_SECRET"
      : apiKey
        ? "ENV"
        : "NONE",
  };
}

async function parseViatorResponse(response) {
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text || "Resposta não JSON da Viator." };
  }

  if (!response.ok) {
    const code =
      payload?.code ||
      payload?.error ||
      payload?.errors?.[0]?.code ||
      `HTTP_${response.status}`;
    const message =
      payload?.message ||
      payload?.errors?.[0]?.message ||
      payload?.errorMessage ||
      `Viator respondeu com HTTP ${response.status}.`;
    const error = new Error(`${code}: ${message}`);
    error.status = response.status;
    error.code = code;
    error.payload = payload;
    error.retryAfter = response.headers.get("retry-after") || null;
    throw error;
  }

  return payload;
}

async function viatorRemoteRequest(prisma, path, body) {
  const credentials = await credentialsForViator(prisma);
  if (!credentials.apiKey || !credentials.supplierId) {
    const error = new Error(
      "API Key e Supplier ID da Viator precisam estar configurados antes desta operação.",
    );
    error.status = 409;
    error.code = "VIATOR_CREDENTIALS_REQUIRED";
    throw error;
  }

  const base = clean(process.env.VIATOR_API_BASE) || DEFAULT_API_BASE;
  const response = await fetch(`${base.replace(/\/+$/, "")}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Api-Key": credentials.apiKey,
    },
    body: JSON.stringify({
      supplierId: credentials.supplierId,
      ...body,
    }),
  });

  return parseViatorResponse(response);
}

export async function recordViatorEvidence(prisma, topic, payload = null) {
  try {
    await prisma.integrationEvent.create({
      data: {
        provider: PROVIDER,
        externalEventId: `viator:${String(topic || "event").toLowerCase()}:${crypto.randomUUID()}`,
        topic: String(topic || "EVENT").toUpperCase(),
        status: "PROCESSED",
        payload: payload && typeof payload === "object" ? payload : null,
        processedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[VIATOR] evidence audit failed", topic, error);
  }
}

export async function buildViatorOnboardingStatus(prisma, requestUrl) {
  const [credentialStatus, credentials, tours, bookings, events] =
    await Promise.all([
      getSafeIntegrationSecretStatus(prisma, PROVIDER).catch(() => null),
      credentialsForViator(prisma),
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
  const operations = new Set(
    bookings
      .map((booking) =>
        clean(booking?.rawPayload?.viatorOperation).toUpperCase(),
      )
      .filter(Boolean),
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
    {
      key: "TOUR_LIST",
      label: "Tour List",
      method: "POST",
      path: "/tourlist",
      version: "v1 JSON",
    },
    {
      key: "CALENDAR",
      label: "Calendar",
      method: "POST",
      path: "/v2/availability/calendar",
      version: "v2",
    },
    {
      key: "AVAILABILITY_CHECK",
      label: "Availability Check",
      method: "POST",
      path: "/v2/availability/check",
      version: "v2",
    },
    {
      key: "RESERVE",
      label: "Reserve",
      method: "POST",
      path: "/v2/reserve",
      version: "v2",
    },
    {
      key: "BOOKING",
      label: "Booking",
      method: "POST",
      path: "/booking",
      version: "v1 JSON",
    },
    {
      key: "BOOKING_AMENDMENT",
      label: "Booking Amendment",
      method: "POST",
      path: "/booking-amendment",
      version: "v1 JSON",
    },
    {
      key: "BOOKING_CANCELLATION",
      label: "Booking Cancellation",
      method: "POST",
      path: "/booking-cancellation",
      version: "v1 JSON",
    },
  ].map((endpoint) => ({
    ...endpoint,
    url: `${base.replace(/\/+$/, "")}${endpoint.path}`,
    verified: eventTopics.has(endpoint.key),
  }));

  const evidence = {
    credentials: Boolean(credentials.apiKey && credentials.supplierId),
    authenticatedTraffic: credentialStatus?.status === "CONNECTED",
    tourList: eventTopics.has("TOUR_LIST"),
    calendar: eventTopics.has("CALENDAR"),
    availabilityCheck: eventTopics.has("AVAILABILITY_CHECK"),
    reserve:
      eventTopics.has("RESERVE") ||
      bookingCounts.pending > 0 ||
      bookingCounts.confirmed > 0,
    booking:
      eventTopics.has("BOOKING") ||
      bookingCounts.confirmed > 0 ||
      bookingCounts.canceled > 0,
    amendment:
      eventTopics.has("BOOKING_AMENDMENT") ||
      operations.has("BOOKING-AMENDMENT"),
    cancellation:
      eventTopics.has("BOOKING_CANCELLATION") ||
      bookingCounts.canceled > 0 ||
      operations.has("BOOKING-CANCELLATION"),
  };

  return {
    credentialsConfigured: Boolean(
      credentials.apiKey && credentials.supplierId,
    ),
    credentialSource: credentials.source,
    supplierId: credentials.supplierId,
    connectionStatus: credentialStatus?.status || null,
    trafficVerified: credentialStatus?.status === "CONNECTED",
    lastValidatedAt: credentialStatus?.lastValidatedAt || null,
    localTours: tours.map((tour) => ({
      id: tour.id,
      title: tour.title,
      viatorProductCode: tour.viatorProductCode || null,
      ready: tourIsReady(tour),
      scheduleSlots: tour.scheduleSlots || [],
      categories: categoriesForTour(tour),
    })),
    activeTours: tours.length,
    readyTours: readyTours.length,
    localMappedTours: tours.filter((tour) =>
      Boolean(clean(tour.viatorProductCode)),
    ).length,
    bookingCounts,
    endpoints,
    evidence,
  };
}

export async function fetchViatorMappingCatalog(prisma, filters = {}) {
  const body = {};
  const cleanFilters = {};

  if (clean(filters.productCode)) {
    cleanFilters.productCode = clean(filters.productCode);
  }
  if (clean(filters.productOptionId)) {
    cleanFilters.productOptionId = clean(filters.productOptionId);
  }
  if (Array.isArray(filters.productStatus) && filters.productStatus.length) {
    cleanFilters.productStatus = filters.productStatus.map(clean).filter(Boolean);
  }
  if (Object.keys(cleanFilters).length) body.filters = cleanFilters;

  const payload = await viatorRemoteRequest(
    prisma,
    "/v2/mappings/catalog",
    body,
  );
  await recordViatorEvidence(prisma, "MAPPING_CATALOG", {
    returned: Number(payload?.pagination?.returned || 0),
    totalProducts: Number(payload?.pagination?.totalProducts || 0),
  });
  return payload;
}

export async function connectViatorMapping(
  prisma,
  { productOptionId, productCode, tourGradeCode },
) {
  const localTour = await prisma.tour.findUnique({
    where: { id: clean(productOptionId) },
    include: { variants: true },
  });

  if (!tourIsReady(localTour)) {
    const error = new Error(
      "O tour PMY precisa ter horários e categorias de passageiros válidas antes de ser mapeado na Viator.",
    );
    error.status = 422;
    error.code = "LOCAL_PRODUCT_NOT_READY";
    throw error;
  }

  const cleanProductCode = clean(productCode);
  const cleanTourGradeCode = clean(tourGradeCode);
  if (!cleanProductCode || !cleanTourGradeCode) {
    const error = new Error(
      "Product Code e Tour Grade Code da Viator são obrigatórios.",
    );
    error.status = 400;
    error.code = "VIATOR_MAPPING_REQUIRED";
    throw error;
  }

  const payload = await viatorRemoteRequest(
    prisma,
    "/v2/mappings/connect",
    {
      mappings: [
        {
          productOptionId: localTour.id,
          viatorReferences: {
            productCode: cleanProductCode,
            tourGradeCode: cleanTourGradeCode,
          },
        },
      ],
    },
  );

  const currentOwner = await prisma.tour.findFirst({
    where: {
      viatorProductCode: cleanProductCode,
      id: { not: localTour.id },
    },
    select: { id: true },
  });

  if (!currentOwner) {
    await prisma.tour.update({
      where: { id: localTour.id },
      data: { viatorProductCode: cleanProductCode },
    });
  }

  await recordViatorEvidence(prisma, "MAPPING_CONNECTED", {
    productOptionId: localTour.id,
    productCode: cleanProductCode,
    tourGradeCode: cleanTourGradeCode,
  });

  return payload;
}

export async function disconnectViatorMapping(
  prisma,
  { productOptionId, productCode, tourGradeCode },
) {
  const cleanProductOptionId = clean(productOptionId);
  const cleanProductCode = clean(productCode);
  const cleanTourGradeCode = clean(tourGradeCode);

  if (!cleanProductOptionId || !cleanProductCode || !cleanTourGradeCode) {
    const error = new Error(
      "productOptionId, Product Code e Tour Grade Code são obrigatórios.",
    );
    error.status = 400;
    error.code = "VIATOR_MAPPING_REQUIRED";
    throw error;
  }

  const payload = await viatorRemoteRequest(
    prisma,
    "/v2/mappings/disconnect",
    {
      mappings: [
        {
          productOptionId: cleanProductOptionId,
          viatorReferences: {
            productCode: cleanProductCode,
            tourGradeCode: cleanTourGradeCode,
          },
        },
      ],
    },
  );

  await recordViatorEvidence(prisma, "MAPPING_DISCONNECTED", {
    productOptionId: cleanProductOptionId,
    productCode: cleanProductCode,
    tourGradeCode: cleanTourGradeCode,
  });

  return payload;
}

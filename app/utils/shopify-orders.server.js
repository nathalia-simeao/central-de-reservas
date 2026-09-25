import { createBookingWithCapacityGuard, getCentralAvailability } from "./capacity.server";

const SHOPIFY_PLATFORM = "SHOPIFY";

function asString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function stripGid(value) {
  const raw = asString(value);
  if (!raw) return "";
  return raw.split("/").pop() || raw;
}

function shopifyGid(type, value) {
  const raw = asString(value);
  if (!raw) return null;
  if (raw.startsWith("gid://shopify/")) return raw;
  return `gid://shopify/${type}/${raw}`;
}

function normalizeKey(value) {
  return asString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function attributesToMap(values) {
  const map = new Map();

  for (const entry of Array.isArray(values) ? values : []) {
    const key = normalizeKey(entry?.name ?? entry?.key);
    const value = asString(entry?.value);
    if (key && value && !map.has(key)) map.set(key, value);
  }

  return map;
}

function firstAttribute(maps, keys) {
  const normalizedKeys = keys.map(normalizeKey);
  for (const map of maps) {
    for (const key of normalizedKeys) {
      const value = map.get(key);
      if (value) return value;
    }
  }
  return null;
}

const DATE_KEYS = [
  "date",
  "data",
  "tour date",
  "booking date",
  "reservation date",
  "experience date",
  "datum",
  "fecha",
  "date du tour",
];

const TIME_KEYS = [
  "time",
  "hora",
  "horario",
  "tour time",
  "start time",
  "booking time",
  "experience time",
  "heure",
  "zeit",
];

const LANGUAGE_KEYS = [
  "language",
  "idioma",
  "lang",
  "lingua",
  "língua",
  "sprache",
  "langue",
];

const EMAIL_KEYS = ["email", "e-mail"];
const PHONE_KEYS = ["phone", "telefone", "telephone", "whatsapp", "mobile"];

function normalizeDateKey(value) {
  const raw = asString(value);
  if (!raw) return null;

  const iso = raw.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  }

  const european = raw.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})\b/);
  if (european) {
    return `${european[3]}-${european[2].padStart(2, "0")}-${european[1].padStart(2, "0")}`;
  }

  return null;
}

function normalizeTimeKey(value) {
  const raw = asString(value);
  if (!raw) return null;

  const match = raw.match(/\b([01]?\d|2[0-3])[:hH](\d{2})\b/);
  if (!match) return null;

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function timezoneParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number.parseInt(part.value, 10)]),
  );
}

export function lisbonLocalDateTimeToUtc(dateKey, timeKey) {
  const dateMatch = asString(dateKey).match(/^(20\d{2})-(\d{2})-(\d{2})$/);
  const timeMatch = asString(timeKey).match(/^([01]\d|2[0-3]):([0-5]\d)$/);

  if (!dateMatch || !timeMatch) return null;

  const targetUtc = Date.UTC(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    0,
    0,
  );

  let guess = targetUtc;

  // Two passes safely resolve normal DST offsets for Europe/Lisbon.
  for (let i = 0; i < 2; i += 1) {
    const parts = timezoneParts(new Date(guess), "Europe/Lisbon");
    const renderedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      0,
    );
    guess -= renderedAsUtc - targetUtc;
  }

  const resolved = new Date(guess);
  return Number.isNaN(resolved.getTime()) ? null : resolved;
}

function passengerCategory(lineItem) {
  const haystack = [
    lineItem?.variant_title,
    lineItem?.variantTitle,
    lineItem?.title,
    lineItem?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\b(senior|seniors|over\s*64|65\+|idoso|idosa)\b/.test(haystack)) {
    return "seniors";
  }
  if (/\b(child|children|kid|kids|crianca|criança|nino|niño)\b/.test(haystack)) {
    return "children";
  }
  if (/\b(youth|young|junior|jovem|teen)\b/.test(haystack)) {
    return "youths";
  }
  if (/\b(adult|adults|adulto|adulta)\b/.test(haystack)) {
    return "adults";
  }

  return null;
}

function orderCustomer(payload, orderAttrs) {
  const firstName =
    asString(payload?.customer?.first_name) ||
    asString(payload?.billing_address?.first_name) ||
    asString(payload?.shipping_address?.first_name);

  const lastName =
    asString(payload?.customer?.last_name) ||
    asString(payload?.billing_address?.last_name) ||
    asString(payload?.shipping_address?.last_name);

  const customerName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    asString(payload?.billing_address?.name) ||
    asString(payload?.shipping_address?.name) ||
    asString(payload?.name) ||
    "Shopify Customer";

  return {
    customerName,
    customerEmail:
      asString(payload?.email) ||
      asString(payload?.customer?.email) ||
      firstAttribute([orderAttrs], EMAIL_KEYS) ||
      null,
    customerPhone:
      asString(payload?.phone) ||
      asString(payload?.customer?.phone) ||
      asString(payload?.billing_address?.phone) ||
      asString(payload?.shipping_address?.phone) ||
      firstAttribute([orderAttrs], PHONE_KEYS) ||
      null,
  };
}

function orderStatus(payload, topic) {
  if (
    topic === "ORDERS_CANCELLED" ||
    payload?.cancelled_at ||
    payload?.cancel_reason === "cancelled"
  ) {
    return "CANCELED";
  }

  const financial = asString(payload?.financial_status).toLowerCase();
  if (["paid", "partially_paid"].includes(financial)) return "CONFIRMED";

  // An active Shopify order still reserves capacity while payment settles.
  return "PENDING";
}

function lineItemPrice(lineItem) {
  const raw =
    lineItem?.price ??
    lineItem?.price_set?.shop_money?.amount ??
    lineItem?.original_price ??
    0;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function externalOrderId(payload) {
  return (
    asString(payload?.admin_graphql_api_id) ||
    shopifyGid("Order", payload?.id) ||
    asString(payload?.id)
  );
}

function externalLineItemId(lineItem) {
  return (
    asString(lineItem?.admin_graphql_api_id) ||
    shopifyGid("LineItem", lineItem?.id) ||
    asString(lineItem?.id)
  );
}

function safeDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function buildShopifyBookingGroups(prisma, payload) {
  const orderAttrs = attributesToMap(
    payload?.note_attributes || payload?.customAttributes || [],
  );
  const customer = orderCustomer(payload, orderAttrs);
  const orderId = externalOrderId(payload);
  const orderName = asString(payload?.name) || orderId;
  const currency = asString(payload?.currency).toUpperCase().slice(0, 3) || null;
  const lineItems = Array.isArray(payload?.line_items)
    ? payload.line_items
    : Array.isArray(payload?.lineItems)
      ? payload.lineItems
      : [];

  const tours = await prisma.tour.findMany({
    where: { shopifyProductId: { not: null } },
  });
  const toursByShopifyProduct = new Map(
    tours
      .filter((tour) => tour.shopifyProductId)
      .map((tour) => [tour.shopifyProductId, tour]),
  );

  const groups = new Map();
  const issues = [];
  const ignored = [];

  for (const lineItem of lineItems) {
    const productId = shopifyGid(
      "Product",
      lineItem?.product_id ?? lineItem?.product?.id,
    );

    const tour = productId ? toursByShopifyProduct.get(productId) : null;
    if (!tour) {
      ignored.push({
        lineItemId: externalLineItemId(lineItem),
        title: asString(lineItem?.title ?? lineItem?.name),
        reason: "NOT_A_MASTER_TOUR",
      });
      continue;
    }

    const lineAttrs = attributesToMap(
      lineItem?.properties || lineItem?.customAttributes || [],
    );

    const dateKey = normalizeDateKey(
      firstAttribute([lineAttrs, orderAttrs], DATE_KEYS),
    );

    const timeKey =
      normalizeTimeKey(firstAttribute([lineAttrs, orderAttrs], TIME_KEYS)) ||
      normalizeTimeKey(lineItem?.variant_title) ||
      normalizeTimeKey(lineItem?.variantTitle) ||
      normalizeTimeKey(lineItem?.name) ||
      normalizeTimeKey(lineItem?.title);

    const language =
      firstAttribute([lineAttrs, orderAttrs], LANGUAGE_KEYS) || null;

    if (!dateKey || !timeKey) {
      issues.push({
        lineItemId: externalLineItemId(lineItem),
        productId,
        tourId: tour.id,
        title: asString(lineItem?.title ?? lineItem?.name),
        missing: [
          ...(dateKey ? [] : ["date"]),
          ...(timeKey ? [] : ["time"]),
        ],
      });
      continue;
    }

    const startTime = lisbonLocalDateTimeToUtc(dateKey, timeKey);
    if (!startTime) {
      issues.push({
        lineItemId: externalLineItemId(lineItem),
        productId,
        tourId: tour.id,
        title: asString(lineItem?.title ?? lineItem?.name),
        missing: ["valid_start_time"],
      });
      continue;
    }

    const quantity = Math.max(1, Number.parseInt(lineItem?.quantity ?? 1, 10) || 1);
    const groupKey = `${tour.id}|${dateKey}|${timeKey}`;
    const lineId = externalLineItemId(lineItem);
    const variantId = shopifyGid(
      "ProductVariant",
      lineItem?.variant_id ?? lineItem?.variant?.id,
    );

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        tour,
        dateKey,
        timeKey,
        startTime,
        language,
        externalOrderId: orderId,
        bookingRef: orderName,
        externalLineItemIds: [],
        externalVariantIds: new Set(),
        adults: 0,
        children: 0,
        youths: 0,
        seniors: 0,
        totalParticipants: 0,
        totalPrice: 0,
        currency,
        customer,
      });
    }

    const group = groups.get(groupKey);
    if (!group.language && language) group.language = language;
    if (lineId) group.externalLineItemIds.push(lineId);
    if (variantId) group.externalVariantIds.add(variantId);

    const category = passengerCategory(lineItem);
    if (category) group[category] += quantity;

    group.totalParticipants += quantity;
    group.totalPrice += lineItemPrice(lineItem) * quantity;
  }

  const preparedGroups = [...groups.values()].map((group) => {
    const orderKey = stripGid(group.externalOrderId) || "order";
    const externalBookingId =
      `shopify:${orderKey}:${group.tour.id}:${group.dateKey}:${group.timeKey}`;

    const variants = [...group.externalVariantIds];

    return {
      ...group,
      externalBookingId,
      externalVariantId: variants.length === 1 ? variants[0] : null,
      totalPrice: group.totalPrice.toFixed(2),
      externalVariantIds: undefined,
    };
  });

  return {
    orderId,
    orderName,
    groups: preparedGroups,
    issues,
    ignored,
  };
}

async function createForcedShopifyBooking(prisma, group, payload, status, syncStatus) {
  try {
    return await prisma.booking.create({
      data: {
        tourId: group.tour.id,
        customerName: group.customer.customerName,
        customerEmail: group.customer.customerEmail,
        customerPhone: group.customer.customerPhone,
        language: group.language,
        startTime: group.startTime,
        platform: SHOPIFY_PLATFORM,
        status,
        bookingRef: group.bookingRef,
        externalBookingId: group.externalBookingId,
        externalOrderId: group.externalOrderId,
        externalLineItemIds: group.externalLineItemIds,
        externalProductId: group.tour.shopifyProductId,
        externalVariantId: group.externalVariantId,
        adults: group.adults,
        children: group.children,
        youths: group.youths,
        seniors: group.seniors,
        totalParticipants: group.totalParticipants,
        totalPrice: group.totalPrice,
        currency: group.currency,
        syncStatus,
        lastSyncedAt: new Date(),
        externalCreatedAt: safeDate(payload?.created_at),
        externalUpdatedAt: safeDate(payload?.updated_at),
        rawPayload: payload,
      },
    });
  } catch (error) {
    if (error?.code === "P2002") {
      return prisma.booking.findFirst({
        where: {
          platform: SHOPIFY_PLATFORM,
          externalBookingId: group.externalBookingId,
        },
      });
    }
    throw error;
  }
}

async function upsertShopifyBookingGroup(prisma, group, payload, status) {
  const existing = await prisma.booking.findFirst({
    where: {
      platform: SHOPIFY_PLATFORM,
      externalBookingId: group.externalBookingId,
    },
  });

  if (existing) {
    const availability = await getCentralAvailability(prisma, {
      tourId: group.tour.id,
      startTime: group.startTime,
      platform: SHOPIFY_PLATFORM,
      requestedSeats: group.totalParticipants,
      excludeBookingId: existing.id,
    });

    const syncStatus = availability.canAccept
      ? "SYNCED"
      : availability.blocked
        ? "SHOPIFY_ORDER_ON_BLOCKED_SLOT"
        : "OVERBOOKED";

    const booking = await prisma.booking.update({
      where: { id: existing.id },
      data: {
        customerName: group.customer.customerName,
        customerEmail: group.customer.customerEmail,
        customerPhone: group.customer.customerPhone,
        language: group.language,
        startTime: group.startTime,
        status,
        bookingRef: group.bookingRef,
        externalOrderId: group.externalOrderId,
        externalLineItemIds: group.externalLineItemIds,
        externalProductId: group.tour.shopifyProductId,
        externalVariantId: group.externalVariantId,
        adults: group.adults,
        children: group.children,
        youths: group.youths,
        seniors: group.seniors,
        totalParticipants: group.totalParticipants,
        totalPrice: group.totalPrice,
        currency: group.currency,
        syncStatus,
        lastSyncedAt: new Date(),
        externalUpdatedAt: safeDate(payload?.updated_at) || new Date(),
        rawPayload: payload,
      },
    });

    return { booking, syncStatus, updated: true };
  }

  const guarded = await createBookingWithCapacityGuard(prisma, {
    tourId: group.tour.id,
    startTime: group.startTime,
    platform: SHOPIFY_PLATFORM,
    externalBookingId: group.externalBookingId,
    requestedSeats: group.totalParticipants,
    bookingData: {
      customerName: group.customer.customerName,
      customerEmail: group.customer.customerEmail,
      customerPhone: group.customer.customerPhone,
      language: group.language,
      status,
      bookingRef: group.bookingRef,
      externalBookingId: group.externalBookingId,
      externalOrderId: group.externalOrderId,
      externalLineItemIds: group.externalLineItemIds,
      externalProductId: group.tour.shopifyProductId,
      externalVariantId: group.externalVariantId,
      adults: group.adults,
      children: group.children,
      youths: group.youths,
      seniors: group.seniors,
      totalPrice: group.totalPrice,
      currency: group.currency,
      syncStatus: "SYNCED",
      lastSyncedAt: new Date(),
      externalCreatedAt: safeDate(payload?.created_at),
      externalUpdatedAt: safeDate(payload?.updated_at),
      rawPayload: payload,
    },
  });

  if (guarded.accepted) {
    return {
      booking: guarded.booking,
      syncStatus: guarded.idempotent ? guarded.booking.syncStatus : "SYNCED",
      updated: false,
    };
  }

  // Shopify has already accepted this order. Never drop a real customer booking
  // just because another channel consumed capacity milliseconds earlier.
  const syncStatus =
    guarded.reason === "BLOCKED_BY_AGENDA"
      ? "SHOPIFY_ORDER_ON_BLOCKED_SLOT"
      : "OVERBOOKED";

  const booking = await createForcedShopifyBooking(
    prisma,
    group,
    payload,
    status,
    syncStatus,
  );

  return { booking, syncStatus, updated: false };
}

export async function processShopifyOrderWebhook(prisma, { payload, topic }) {
  const status = orderStatus(payload, topic);
  const orderId = externalOrderId(payload);
  const orderName = asString(payload?.name) || orderId;

  if (!orderId) {
    throw new Error("Shopify order payload is missing an order ID.");
  }

  if (topic === "ORDERS_CANCELLED" || status === "CANCELED") {
    const result = await prisma.booking.updateMany({
      where: {
        platform: SHOPIFY_PLATFORM,
        OR: [
          { externalOrderId: orderId },
          ...(orderName ? [{ bookingRef: orderName }] : []),
        ],
        status: { not: "CANCELED" },
      },
      data: {
        status: "CANCELED",
        syncStatus: "SYNCED",
        cancelReason: asString(payload?.cancel_reason) || "shopify_order_cancelled",
        lastSyncedAt: new Date(),
        externalUpdatedAt: safeDate(payload?.updated_at) || new Date(),
        rawPayload: payload,
      },
    });

    return {
      orderId,
      orderName,
      cancelledBookings: result.count,
      bookings: [],
      issues: [],
      ignored: [],
    };
  }

  const built = await buildShopifyBookingGroups(prisma, payload);
  const expectedBookingIds = new Set();
  const bookings = [];

  for (const group of built.groups) {
    expectedBookingIds.add(group.externalBookingId);
    const result = await upsertShopifyBookingGroup(prisma, group, payload, status);
    bookings.push({
      id: result.booking?.id,
      externalBookingId: group.externalBookingId,
      tourId: group.tour.id,
      status: result.booking?.status || status,
      syncStatus: result.syncStatus,
      totalParticipants: group.totalParticipants,
    });
  }

  // If an order was edited and a tour line disappeared, release its old seats.
  const previous = await prisma.booking.findMany({
    where: {
      platform: SHOPIFY_PLATFORM,
      externalOrderId: orderId,
      status: { not: "CANCELED" },
    },
    select: { id: true, externalBookingId: true },
  });

  const removed = previous.filter(
    (booking) =>
      booking.externalBookingId &&
      !expectedBookingIds.has(booking.externalBookingId),
  );

  if (removed.length) {
    await prisma.booking.updateMany({
      where: { id: { in: removed.map((booking) => booking.id) } },
      data: {
        status: "CANCELED",
        syncStatus: "ORDER_EDIT_REMOVED",
        cancelReason: "shopify_order_line_removed",
        lastSyncedAt: new Date(),
        externalUpdatedAt: safeDate(payload?.updated_at) || new Date(),
      },
    });
  }

  return {
    orderId,
    orderName,
    bookings,
    cancelledRemovedBookings: removed.length,
    issues: built.issues,
    ignored: built.ignored,
  };
}

export async function processShopifyWebhookEvent(
  prisma,
  { payload, topic, shop, webhookId },
) {
  const fallbackId =
    `${topic}:${externalOrderId(payload) || "unknown"}:${asString(payload?.updated_at) || asString(payload?.created_at) || "event"}`;
  const eventId = asString(webhookId) || fallbackId;

  const existing = await prisma.integrationEvent.findUnique({
    where: {
      provider_externalEventId: {
        provider: SHOPIFY_PLATFORM,
        externalEventId: eventId,
      },
    },
  });

  if (existing?.status === "PROCESSED") {
    return { duplicate: true, result: existing.result || null };
  }

  await prisma.integrationEvent.upsert({
    where: {
      provider_externalEventId: {
        provider: SHOPIFY_PLATFORM,
        externalEventId: eventId,
      },
    },
    create: {
      provider: SHOPIFY_PLATFORM,
      externalEventId: eventId,
      topic,
      shop,
      status: "PROCESSING",
      payload,
    },
    update: {
      topic,
      shop,
      status: "PROCESSING",
      payload,
      error: null,
    },
  });

  try {
    const result = await processShopifyOrderWebhook(prisma, { payload, topic });
    const status = result.issues?.length ? "NEEDS_REVIEW" : "PROCESSED";

    await prisma.integrationEvent.update({
      where: {
        provider_externalEventId: {
          provider: SHOPIFY_PLATFORM,
          externalEventId: eventId,
        },
      },
      data: {
        status,
        result,
        error: result.issues?.length
          ? `${result.issues.length} tour line(s) could not be converted because date/time was missing.`
          : null,
        processedAt: new Date(),
      },
    });

    return { duplicate: false, status, result };
  } catch (error) {
    await prisma.integrationEvent.update({
      where: {
        provider_externalEventId: {
          provider: SHOPIFY_PLATFORM,
          externalEventId: eventId,
        },
      },
      data: {
        status: "FAILED",
        error: error?.message || String(error),
      },
    });

    throw error;
  }
}

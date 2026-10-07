import { data } from "react-router";
import {
  beginStorefrontRequest,
  completeStorefrontRequest,
  consumeStorefrontRateLimit,
  failStorefrontRequest,
  storefrontClientKey,
  storefrontReserveFingerprint,
} from "../utils/storefront-security.server";
import db from "../db.server";
import {
  createBookingWithCapacityGuard,
  releaseBookingHold,
} from "../utils/capacity.server";
import { classifyCommercialSource } from "../utils/commercial-source.server";
import { enqueueAvailabilitySync } from "../utils/sync-queue.server";
import { resolveTourByPlatformId } from "../utils/tour-passport.server";
import { lisbonLocalDateTimeToUtc } from "../utils/shopify-orders.server";
import { minimizeCheckoutHoldPayload } from "../utils/privacy.server";

const HOLD_MINUTES = 15;
const MAX_GROUPS = 10;
const MAX_SEATS_PER_GROUP = 100;

const ALLOWED_ORIGINS = new Set([
  "https://portugalmeandyou.com",
  "https://www.portugalmeandyou.com",
  "https://1b653e-4b.myshopify.com",
]);

function clean(value, max = 255) {
  return String(value ?? "").trim().slice(0, max);
}

function stripShopifyId(value) {
  const raw = clean(value);
  return raw ? raw.split("/").pop() || raw : "";
}

function shopifyGid(type, value) {
  const raw = clean(value);
  if (!raw) return null;
  if (raw.startsWith("gid://shopify/")) return raw;
  const id = stripShopifyId(raw);
  return /^\d+$/.test(id) ? `gid://shopify/${type}/${id}` : null;
}

function normalizeDate(value) {
  const raw = clean(value, 32);
  return /^20\d{2}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function normalizeTime(value) {
  const match = clean(value, 32).match(/^([01]?\d|2[0-3])[:hH]([0-5]\d)$/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function requestHeaders(request) {
  const origin = request.headers.get("origin") || "";
  const headers = {
    "Cache-Control": "no-store, max-age=0",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };

  if (ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function json(request, body, status = 200, extraHeaders = {}) {
  return data(body, {
    status,
    headers: {
      ...requestHeaders(request),
      ...extraHeaders,
    },
  });
}

function assertStorefrontOrigin(request) {
  const origin = request.headers.get("origin") || "";
  if (!ALLOWED_ORIGINS.has(origin)) {
    const error = new Error("Storefront origin is not authorized.");
    error.status = 403;
    error.code = "STOREFRONT_ORIGIN_NOT_ALLOWED";
    throw error;
  }
}

function passengerCounts(items, variantsById) {
  const counts = {
    adults: 0,
    children: 0,
    youths: 0,
    seniors: 0,
  };

  for (const item of items) {
    const variant = variantsById.get(stripShopifyId(item.variantId));
    const category = clean(variant?.passengerCategory, 32).toUpperCase();
    const quantity = Number(item.quantity || 0);

    if (category === "ADULT") counts.adults += quantity;
    else if (category === "CHILD") counts.children += quantity;
    else if (category === "YOUTH") counts.youths += quantity;
    else if (category === "SENIOR") counts.seniors += quantity;
  }

  return counts;
}

async function notifyAvailability(booking, reason) {
  if (!booking?.id || !booking?.tourId || !booking?.startTime) return;

  try {
    await enqueueAvailabilitySync(db, {
      eventId: `storefront-hold:${reason}:${booking.id}`,
      tourId: booking.tourId,
      startTime: booking.startTime,
      sourcePlatform: "SHOPIFY",
      aggregateType: "BOOKING",
      aggregateId: booking.id,
      force: true,
      payload: {
        reason,
        holdId: booking.id,
        holdExpiresAt: booking.holdExpiresAt || null,
        source: "PMY_STOREFRONT",
      },
    });
  } catch (error) {
    console.error("[PMY] storefront hold availability sync failed:", error);
  }
}

async function releaseHolds(holdIds, reason) {
  const released = [];

  for (const holdId of [...new Set(holdIds.map((id) => clean(id)).filter(Boolean))]) {
    const existing = await db.booking.findUnique({
      where: { id: holdId },
      select: {
        id: true,
        status: true,
        syncStatus: true,
        rawPayload: true,
      },
    });

    const kind =
      existing?.rawPayload &&
      typeof existing.rawPayload === "object" &&
      !Array.isArray(existing.rawPayload)
        ? String(existing.rawPayload.kind || "")
        : "";

    if (
      !existing ||
      existing.status !== "PENDING" ||
      (existing.syncStatus !== "STOREFRONT_HOLD" &&
        kind !== "STOREFRONT_CHECKOUT_HOLD")
    ) {
      continue;
    }

    const result = await releaseBookingHold(db, holdId, reason);
    if (result.released && result.booking) {
      released.push(result.booking.id);
      await notifyAvailability(result.booking, "STOREFRONT_HOLD_RELEASED");
    }
  }

  return released;
}

function parseBody(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Invalid JSON payload.");
    error.status = 400;
    error.code = "INVALID_JSON";
    throw error;
  }
}

function validateGroup(group, index) {
  const key = clean(group?.key, 180) || `group-${index + 1}`;
  const productId = shopifyGid("Product", group?.productId);
  const date = normalizeDate(group?.date);
  const time = normalizeTime(group?.time);
  const language = clean(group?.language, 80) || null;
  const rawItems = Array.isArray(group?.items) ? group.items : [];

  if (!date || !time) {
    const error = new Error("A valid tour date and time are required before checkout.");
    error.status = 400;
    error.code = "INVALID_TOUR_DATETIME";
    throw error;
  }
  if (!rawItems.length) {
    const error = new Error("Select at least one traveler before checkout.");
    error.status = 400;
    error.code = "EMPTY_BOOKING_GROUP";
    throw error;
  }

  const items = rawItems.map((item) => {
    const variantId = shopifyGid("ProductVariant", item?.variantId);
    const quantity = Number.parseInt(item?.quantity, 10);

    if (!variantId) {
      const error = new Error("A selected Shopify variant is invalid.");
      error.status = 400;
      error.code = "INVALID_VARIANT_ID";
      throw error;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_SEATS_PER_GROUP) {
      const error = new Error("Traveler quantity is invalid.");
      error.status = 400;
      error.code = "INVALID_PARTICIPANT_COUNT";
      throw error;
    }

    return { variantId, quantity };
  });

  const requestedSeats = items.reduce((total, item) => total + item.quantity, 0);
  if (requestedSeats < 1 || requestedSeats > MAX_SEATS_PER_GROUP) {
    const error = new Error("Traveler quantity is outside the supported range.");
    error.status = 400;
    error.code = "INVALID_PARTICIPANT_COUNT";
    throw error;
  }

  return { key, productId, date, time, language, items, requestedSeats };
}

async function resolveMasterTour(group) {
  if (group.productId) {
    const byProduct = await resolveTourByPlatformId(
      db,
      "SHOPIFY",
      group.productId,
    );
    if (byProduct) return byProduct;
  }

  const firstVariantId = group.items?.[0]?.variantId;
  if (!firstVariantId) return null;

  const gid = shopifyGid("ProductVariant", firstVariantId);
  const numericId = stripShopifyId(firstVariantId);
  const mappedVariant = await db.tourVariant.findFirst({
    where: {
      OR: [
        ...(gid ? [{ shopifyVariantId: gid }] : []),
        ...(numericId ? [{ shopifyVariantId: numericId }] : []),
      ],
    },
    include: {
      tour: {
        include: { variants: true },
      },
    },
  });

  return mappedVariant?.tour || null;
}

async function canonicalizeGroups(groups) {
  const merged = new Map();

  for (const group of groups) {
    const masterTour = await resolveMasterTour(group);
    if (!masterTour) {
      const error = new Error(
        "This experience is not mapped to PMY Central capacity and cannot start checkout.",
      );
      error.status = 409;
      error.code = "TOUR_CAPACITY_NOT_CONFIGURED";
      throw error;
    }

    const canonicalKey = `${masterTour.id}|${group.date}|${group.time}`;
    if (!merged.has(canonicalKey)) {
      merged.set(canonicalKey, {
        ...group,
        masterTour,
        keys: [],
        items: [],
        productId:
          shopifyGid("Product", masterTour.shopifyProductId) ||
          masterTour.shopifyProductId ||
          group.productId ||
          null,
      });
    }

    const canonical = merged.get(canonicalKey);
    canonical.keys.push(group.key);
    canonical.items.push(...group.items);
    if (!canonical.language && group.language) canonical.language = group.language;
  }

  return [...merged.values()].map((group) => {
    const requestedSeats = group.items.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0,
    );

    if (requestedSeats < 1 || requestedSeats > MAX_SEATS_PER_GROUP) {
      const error = new Error("Traveler quantity is outside the supported range.");
      error.status = 400;
      error.code = "INVALID_PARTICIPANT_COUNT";
      throw error;
    }

    return {
      ...group,
      keys: [...new Set(group.keys)],
      requestedSeats,
    };
  });
}

async function reserveGroup({
  group,
  requestId,
  customer,
  attribution,
  holdExpiresAt,
}) {
  const masterTour = group.masterTour;
  if (!masterTour) {
    const error = new Error("PMY Central tour mapping is missing.");
    error.status = 409;
    error.code = "TOUR_CAPACITY_NOT_CONFIGURED";
    throw error;
  }

  const mappedVariants = (masterTour.variants || []).filter(
    (variant) => variant.shopifyVariantId,
  );
  const variantsById = new Map(
    mappedVariants.map((variant) => [
      stripShopifyId(variant.shopifyVariantId),
      variant,
    ]),
  );

  if (mappedVariants.length) {
    for (const item of group.items) {
      const variant = variantsById.get(stripShopifyId(item.variantId));
      if (!variant || variant.active === false) {
        const error = new Error(
          "A selected ticket is not mapped or active in PMY Central.",
        );
        error.status = 409;
        error.code = "TOUR_VARIANT_NOT_MAPPED";
        throw error;
      }

      const variantTime = normalizeTime(variant.startTimeSlot);
      if (variantTime && variantTime !== group.time) {
        const error = new Error(
          `The selected ticket belongs to ${variantTime}, not ${group.time}.`,
        );
        error.status = 409;
        error.code = "VARIANT_TIME_MISMATCH";
        throw error;
      }
    }
  }

  const startTime = lisbonLocalDateTimeToUtc(group.date, group.time);
  if (!startTime) {
    const error = new Error("The selected date/time could not be converted.");
    error.status = 400;
    error.code = "INVALID_TOUR_DATETIME";
    throw error;
  }

  const counts = passengerCounts(group.items, variantsById);
  const commercialSource = classifyCommercialSource({
    platform: "SHOPIFY",
    commercialSource: attribution?.commercialSource,
    attribution,
    source: attribution?.source,
    medium: attribution?.medium,
    channel: attribution?.channel,
    name: attribution?.name,
  });
  const externalBookingId =
    `storefront:${requestId}:${masterTour.id}:${group.date}:${group.time}`;

  const result = await createBookingWithCapacityGuard(db, {
    tourId: masterTour.id,
    startTime,
    platform: "SHOPIFY",
    externalBookingId,
    requestedSeats: group.requestedSeats,
    bookingData: {
      customerName: clean(customer?.name, 180) || "PMY Website Customer",
      customerEmail: clean(customer?.email, 254) || null,
      customerPhone: clean(customer?.phone, 80) || null,
      language: group.language,
      commercialSource,
      status: "PENDING",
      bookingRef: null,
      externalBookingId,
      externalProductId:
        shopifyGid("Product", masterTour.shopifyProductId) ||
        masterTour.shopifyProductId ||
        group.productId ||
        null,
      externalVariantId:
        group.items.length === 1 ? group.items[0].variantId : null,
      ...counts,
      totalParticipants: group.requestedSeats,
      syncStatus: "STOREFRONT_HOLD",
      holdExpiresAt,
      rawPayload: minimizeCheckoutHoldPayload({
        kind: "STOREFRONT_CHECKOUT_HOLD",
        requestId,
        groupKeys: group.keys,
        date: group.date,
        time: group.time,
        language: group.language,
        productId:
          shopifyGid("Product", masterTour.shopifyProductId) ||
          masterTour.shopifyProductId ||
          group.productId ||
          null,
        lineItems: group.items,
        attribution: attribution || {},
      }),
    },
  });

  if (!result.accepted) {
    const error = new Error(
      result.reason === "BLOCKED_BY_AGENDA"
        ? "This departure is blocked and cannot be booked."
        : `There are not enough seats for this departure. ${result.availability?.remainingSeats ?? 0} seat(s) remain.`,
    );
    error.status = 409;
    error.code =
      result.reason === "BLOCKED_BY_AGENDA"
        ? "SLOT_BLOCKED"
        : "INSUFFICIENT_CAPACITY";
    error.availability = result.availability || null;
    throw error;
  }

  const booking = result.booking;
  if (booking.status !== "PENDING") {
    const error = new Error("The storefront hold is no longer active.");
    error.status = 409;
    error.code = "STOREFRONT_HOLD_NOT_ACTIVE";
    throw error;
  }

  await notifyAvailability(booking, "STOREFRONT_HOLD_CREATED");

  return {
    key: group.keys[0],
    keys: group.keys,
    holdId: booking.id,
    expiresAt: booking.holdExpiresAt?.toISOString?.() || holdExpiresAt.toISOString(),
    productId:
      shopifyGid("Product", masterTour.shopifyProductId) ||
      masterTour.shopifyProductId ||
      group.productId ||
      null,
    tourId: masterTour.id,
    date: group.date,
    time: group.time,
    requestedSeats: group.requestedSeats,
    remainingSeats:
      result.availabilityAfter?.remainingSeats ??
      result.availability?.remainingSeats ??
      null,
  };
}

export const loader = async ({ request }) => {
  return json(
    request,
    {
      success: false,
      error: "Use POST from the PMY storefront.",
      code: "METHOD_NOT_ALLOWED",
    },
    405,
  );
};

export async function handleStorefrontHoldAction(
  request,
  { authenticatedProxy = false, shop = null } = {},
) {
  try {
    if (!authenticatedProxy) {
      const error = new Error("Storefront mutations must use the signed Shopify App Proxy.");
      error.status = 403;
      error.code = "APP_PROXY_REQUIRED";
      throw error;
    }

    if (request.method.toUpperCase() !== "POST") {
      return json(
        request,
        { success: false, error: "Method not allowed.", code: "METHOD_NOT_ALLOWED" },
        405,
      );
    }

    const contentLength = Number.parseInt(
      request.headers.get("content-length") || "0",
      10,
    );
    if (Number.isFinite(contentLength) && contentLength > 65536) {
      return json(
        request,
        {
          success: false,
          error: "Request payload is too large.",
          code: "PAYLOAD_TOO_LARGE",
        },
        413,
      );
    }

    const payload = parseBody(await request.text());
    const action = clean(payload?.action, 32).toLowerCase() || "reserve";
    const clientKey = storefrontClientKey(request, shop);
    const rate = consumeStorefrontRateLimit({
      key: clientKey,
      action,
    });

    if (!rate.allowed) {
      return json(
        request,
        {
          success: false,
          error: "Too many checkout attempts. Please wait a moment and try again.",
          code: "STOREFRONT_RATE_LIMITED",
          retryAfterSeconds: rate.retryAfterSeconds,
        },
        429,
        {
          "Retry-After": String(rate.retryAfterSeconds),
          "X-RateLimit-Limit": String(rate.limit),
          "X-RateLimit-Remaining": "0",
        },
      );
    }

    if (action === "release") {
      const holdIds = Array.isArray(payload?.holdIds) ? payload.holdIds : [];
      const released = await releaseHolds(
        holdIds.slice(0, MAX_GROUPS),
        "storefront_checkout_failed",
      );
      return json(request, { success: true, released });
    }

    if (action !== "reserve") {
      return json(
        request,
        { success: false, error: "Unsupported action.", code: "INVALID_ACTION" },
        400,
      );
    }

    const requestId = clean(payload?.requestId, 120);
    const rawGroups = Array.isArray(payload?.groups) ? payload.groups : [];

    if (!/^[A-Za-z0-9._:-]{8,120}$/.test(requestId)) {
      return json(
        request,
        {
          success: false,
          error: "A valid checkout request ID is required.",
          code: "INVALID_REQUEST_ID",
        },
        400,
      );
    }

    if (!rawGroups.length || rawGroups.length > MAX_GROUPS) {
      return json(
        request,
        {
          success: false,
          error: "Checkout contains an invalid number of booking groups.",
          code: "INVALID_GROUP_COUNT",
        },
        400,
      );
    }

    const validatedGroups = rawGroups.map(validateGroup);
    const fingerprint = storefrontReserveFingerprint({
      requestId,
      groups: validatedGroups,
    });
    const requestState = await beginStorefrontRequest(db, {
      requestId,
      fingerprint,
      clientKey,
      shop,
    });

    if (requestState.state === "REPLAY") {
      const replay = requestState.event?.result || {};
      const replayHolds = Array.isArray(replay?.holds) ? replay.holds : [];
      const replayHoldIds = replayHolds
        .map((item) => clean(item?.holdId))
        .filter(Boolean);
      const expiresAt = replay?.expiresAt ? new Date(replay.expiresAt) : null;

      if (
        replayHoldIds.length &&
        expiresAt &&
        !Number.isNaN(expiresAt.getTime()) &&
        expiresAt > new Date()
      ) {
        const active = await db.booking.count({
          where: {
            id: { in: replayHoldIds },
            status: "PENDING",
            holdExpiresAt: { gt: new Date() },
          },
        });

        if (active === replayHoldIds.length) {
          return json(request, {
            success: true,
            idempotent: true,
            holdMinutes: HOLD_MINUTES,
            holds: replayHolds,
          });
        }
      }

      return json(
        request,
        {
          success: false,
          error: "This checkout request ID has already been used and its hold is no longer active. Start a new checkout.",
          code: "REQUEST_ID_EXPIRED",
        },
        409,
      );
    }

    const groups = await canonicalizeGroups(validatedGroups);
    const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
    const holds = [];

    try {
      for (const group of groups) {
        const hold = await reserveGroup({
          group,
          requestId,
          customer: payload?.customer || {},
          attribution: payload?.attribution || {},
          holdExpiresAt,
        });
        holds.push(hold);
      }
    } catch (error) {
      await releaseHolds(
        holds.map((hold) => hold.holdId),
        "storefront_group_reservation_rolled_back",
      );
      await failStorefrontRequest(db, {
        requestId,
        error: error?.message || "Storefront hold failed.",
      }).catch(() => null);
      throw error;
    }

    const resultPayload = {
      success: true,
      holdMinutes: HOLD_MINUTES,
      holds,
    };

    await completeStorefrontRequest(db, {
      requestId,
      result: {
        holds,
        expiresAt: holdExpiresAt.toISOString(),
      },
    });

    return json(request, resultPayload);
  } catch (error) {
    const parsedRequestId =
      typeof error?.requestId === "string" ? error.requestId : null;
    if (parsedRequestId) {
      await failStorefrontRequest(db, {
        requestId: parsedRequestId,
        error: error?.message || "Storefront hold failed.",
      }).catch(() => null);
    }
    console.error("[PMY] storefront capacity guard failed:", error);
    return json(
      request,
      {
        success: false,
        error: error?.message || "Could not reserve availability for checkout.",
        code: error?.code || "STOREFRONT_HOLD_FAILED",
        availability: error?.availability || null,
      },
      Number(error?.status) || 500,
    );
  }
}

export const action = async ({ request }) => {
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    const origin = request.headers.get("origin") || "";
    if (!ALLOWED_ORIGINS.has(origin)) {
      return new Response(null, { status: 403 });
    }

    return new Response(null, {
      status: 204,
      headers: {
        ...requestHeaders(request),
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "600",
      },
    });
  }

  try {
    assertStorefrontOrigin(request);
  } catch (error) {
    return json(
      request,
      {
        success: false,
        error: error?.message || "Storefront origin is not authorized.",
        code: error?.code || "STOREFRONT_ORIGIN_NOT_ALLOWED",
      },
      Number(error?.status) || 403,
    );
  }

  if (method !== "POST") {
    return json(
      request,
      {
        success: false,
        error: "Method not allowed.",
        code: "METHOD_NOT_ALLOWED",
      },
      405,
    );
  }

  const origin = request.headers.get("origin");
  const proxyUrl = new URL("/apps/pmy-central/hold", origin);

  return new Response(null, {
    status: 307,
    headers: {
      ...requestHeaders(request),
      Location: proxyUrl.toString(),
      "X-PMY-Security-Upgrade": "shopify-app-proxy",
    },
  });
};

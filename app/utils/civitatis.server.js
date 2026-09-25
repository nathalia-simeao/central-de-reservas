import crypto from "node:crypto";
import db from "../db.server";
import {
  calculateAvailabilityForCalendarSlotFromLoaded,
  createBookingWithCapacityGuard,
  getCentralAvailability,
} from "./capacity.server";
import { getActiveAvailabilityBlocks } from "./availability.server";
import { localSlotToInstant } from "./gyg-v1.server";

const prisma = db;
const PLATFORM = "CIVITATIS";
const OPTION_ID = "STANDARD";
const INDIVIDUAL_CATEGORIES = ["ADULT", "CHILD", "YOUTH", "SENIOR"];
const DEFAULT_HOLD_MINUTES = 30;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function errorResponse(status, code, message) {
  return json({ error: code, message }, status);
}

function configuredToken() {
  return String(
    process.env.CIVITATIS_OCTO_TOKEN ||
      process.env.CIVITATIS_API_KEY ||
      "",
  ).trim();
}

function constantTimeEqual(leftValue, rightValue) {
  const left = Buffer.from(String(leftValue || ""));
  const right = Buffer.from(String(rightValue || ""));
  return (
    left.length > 0 &&
    left.length === right.length &&
    crypto.timingSafeEqual(left, right)
  );
}

function requestEnvironment(request) {
  return String(request.headers.get("Env") || "").trim().toLowerCase();
}

function configuredEnvironment() {
  return String(process.env.CIVITATIS_ENV || "test").trim().toLowerCase();
}

export function requireCivitatisAuth(request) {
  const token = configuredToken();
  const authorization = String(request.headers.get("Authorization") || "").trim();
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const supplied = match?.[1]?.trim() || "";

  if (!token || !constantTimeEqual(token, supplied)) {
    return errorResponse(401, "UNAUTHORIZED", "Invalid Bearer token.");
  }

  const env = requestEnvironment(request);
  if (!["test", "live"].includes(env)) {
    return errorResponse(400, "INVALID_ENV", "Env header must be test or live.");
  }

  const configured = configuredEnvironment();
  if (configured && env !== configured) {
    return errorResponse(
      403,
      "ENV_NOT_ALLOWED",
      `This server is configured for the ${configured} environment.`,
    );
  }

  return null;
}

export function civitatisCapabilities(request) {
  return new Set(
    String(request.headers.get("Capabilities") || "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function pricingRate() {
  const raw = String(process.env.CIVITATIS_NET_RATE || "").trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 && value <= 1 ? value : null;
}

export function validateCivitatisCapabilities(request) {
  const capabilities = civitatisCapabilities(request);

  if (capabilities.has("pickups")) {
    return errorResponse(
      501,
      "CAPABILITY_NOT_IMPLEMENTED",
      "The pickups capability is not configured for PMY yet.",
    );
  }

  if (capabilities.has("pricing") && !pricingRate()) {
    return errorResponse(
      501,
      "PRICING_NOT_CONFIGURED",
      "Pricing capability requires CIVITATIS_NET_RATE to be configured after commercial onboarding.",
    );
  }

  return null;
}

export async function readCivitatisJson(request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("JSON object required");
    }
    return { data: body };
  } catch {
    return {
      error: errorResponse(
        400,
        "BAD_REQUEST",
        "Request body must be a valid JSON object.",
      ),
    };
  }
}

function normalizeDate(value) {
  const raw = String(value || "").trim();
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : raw;
}

function normalizeTime(value) {
  const match = String(value || "")
    .trim()
    .match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function nextDateKey(dateKey) {
  const [year, month, day] = String(dateKey).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1, 12))
    .toISOString()
    .slice(0, 10);
}

function dateRangeDays(startDate, endDate) {
  return (
    Math.round(
      (new Date(`${endDate}T12:00:00.000Z`) -
        new Date(`${startDate}T12:00:00.000Z`)) /
        86400000,
    ) + 1
  );
}

function category(value) {
  return String(value || "").trim().toUpperCase();
}

function categoriesForTour(tour) {
  return [
    ...new Set(
      (tour?.variants || [])
        .filter(
          (variant) =>
            variant.active !== false &&
            INDIVIDUAL_CATEGORIES.includes(category(variant.passengerCategory)),
        )
        .map((variant) => category(variant.passengerCategory)),
    ),
  ];
}

function isGroupOnlyTour(tour) {
  const categories = new Set(
    (tour?.variants || [])
      .filter((variant) => variant.active !== false && variant.passengerCategory)
      .map((variant) => category(variant.passengerCategory)),
  );

  return (
    categories.has("GROUP") &&
    !INDIVIDUAL_CATEGORIES.some((item) => categories.has(item))
  );
}

function eligibleTour(tour) {
  return Boolean(
    tour &&
      tour.shopifyStatus !== "INACTIVE" &&
      Array.isArray(tour.scheduleSlots) &&
      tour.scheduleSlots.length > 0 &&
      Number.isInteger(tour.durationMinutes) &&
      tour.durationMinutes > 0 &&
      !isGroupOnlyTour(tour) &&
      categoriesForTour(tour).length > 0,
  );
}

function tourCurrency(tour) {
  const values = [
    ...new Set(
      (tour?.variants || [])
        .filter((variant) => variant.active !== false && variant.currency)
        .map((variant) => String(variant.currency).toUpperCase().slice(0, 3)),
    ),
  ];
  return values.length === 1 ? values[0] : "EUR";
}

function priceForCategoryAndTime(tour, unitId, timeKey) {
  const unit = category(unitId);
  const matching = (tour?.variants || []).filter(
    (variant) =>
      variant.active !== false &&
      category(variant.passengerCategory) === unit &&
      variant.price != null,
  );

  const exact =
    matching.find((variant) => normalizeTime(variant.startTimeSlot) === timeKey) ||
    matching.find((variant) => !variant.startTimeSlot) ||
    matching[0];

  const value = Number(exact?.price);
  return Number.isFinite(value) ? value : null;
}

function unitPricingForAvailability(tour, timeKey, requestedUnits) {
  const rate = pricingRate();
  if (!rate) return null;

  const requestedIds = new Set(
    (requestedUnits || []).map((item) => category(item?.id)).filter(Boolean),
  );

  const ids =
    requestedIds.size > 0
      ? [...requestedIds]
      : categoriesForTour(tour);

  const currency = tourCurrency(tour);
  const result = [];

  for (const id of ids) {
    const retail = priceForCategoryAndTime(tour, id, timeKey);
    if (retail == null) continue;
    result.push({
      id,
      original: retail,
      retail,
      net: Number((retail * rate).toFixed(2)),
      currency,
      currencyPrecision: 2,
    });
  }

  return result;
}

function pricingTotal(unitPricing, units) {
  if (!Array.isArray(unitPricing) || unitPricing.length === 0) return null;

  const byId = new Map(unitPricing.map((item) => [category(item.id), item]));
  let original = 0;
  let retail = 0;
  let net = 0;

  for (const requested of units || []) {
    const item = byId.get(category(requested?.id));
    const quantity = Number.parseInt(requested?.quantity, 10);
    if (!item || !Number.isInteger(quantity) || quantity <= 0) continue;
    original += item.original * quantity;
    retail += item.retail * quantity;
    net += item.net * quantity;
  }

  const currency = unitPricing[0]?.currency || "EUR";
  return {
    id: "TOTAL",
    original: Number(original.toFixed(2)),
    retail: Number(retail.toFixed(2)),
    net: Number(net.toFixed(2)),
    currency,
    currencyPrecision: 2,
  };
}

function tourUnits(tour) {
  return categoriesForTour(tour).map((id) => ({
    id,
    internalName: id,
    restrictions: [
      {
        minQuantity: 0,
        maxQuantity: Math.max(1, Number(tour.maxCapacity || 20)),
        paxCount: 1,
      },
    ],
    requiredContactFields: [],
  }));
}

function productSummary(tour) {
  return {
    id: String(tour.id),
    internalName: tour.title,
  };
}

function productDetails(tour) {
  const currency = tourCurrency(tour);
  return {
    id: String(tour.id),
    internalName: tour.title,
    options: [
      {
        id: OPTION_ID,
        internalName: "Standard",
        pickupAvailable: false,
        pickupRequired: false,
        units: tourUnits(tour),
        requiredContactFields: [
          "fullName",
          "emailAddress",
          "phoneNumber",
        ],
      },
    ],
    availableCurrencies: [currency],
    defaultCurrency: currency,
    deliveryFormats: [],
  };
}

async function findTour(productId) {
  const id = String(productId || "").trim();
  if (!id) return null;

  const tour = await prisma.tour.findFirst({
    where: {
      OR: [{ id }, { civitatisId: id }],
    },
    include: { variants: true },
  });

  return eligibleTour(tour) ? tour : null;
}

function validateOption(optionId) {
  return String(optionId || "").trim().toUpperCase() === OPTION_ID;
}

function requestedSeatsFromUnits(tour, units) {
  if (!Array.isArray(units)) {
    return { error: "units must be an array." };
  }

  const supported = new Set(categoriesForTour(tour));
  const counts = { ADULT: 0, CHILD: 0, YOUTH: 0, SENIOR: 0 };

  for (const item of units) {
    const id = category(item?.id);
    const quantity = Number.parseInt(item?.quantity, 10);

    if (!supported.has(id)) {
      return { error: `Unsupported unit id: ${id || "empty"}.` };
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
      return { error: `Invalid quantity for unit ${id}.` };
    }

    counts[id] += quantity;
  }

  const totalParticipants = Object.values(counts).reduce(
    (total, value) => total + value,
    0,
  );

  return {
    adults: counts.ADULT,
    children: counts.CHILD,
    youths: counts.YOUTH,
    seniors: counts.SENIOR,
    totalParticipants,
  };
}

function countsFromUnitItems(tour, unitItems) {
  if (!Array.isArray(unitItems)) {
    return { error: "unitItems must be an array." };
  }

  const supported = new Set(categoriesForTour(tour));
  const counts = { ADULT: 0, CHILD: 0, YOUTH: 0, SENIOR: 0 };

  for (const item of unitItems) {
    const id = category(item?.unitId);
    if (!supported.has(id)) {
      return { error: `Unsupported unit id: ${id || "empty"}.` };
    }
    counts[id] += 1;
  }

  const totalParticipants = Object.values(counts).reduce(
    (total, value) => total + value,
    0,
  );

  return {
    adults: counts.ADULT,
    children: counts.CHILD,
    youths: counts.YOUTH,
    seniors: counts.SENIOR,
    totalParticipants,
  };
}

function holdMinutes() {
  const parsed = Number.parseInt(process.env.CIVITATIS_HOLD_MINUTES || "", 10);
  return Number.isInteger(parsed) && parsed >= 5 && parsed <= 120
    ? parsed
    : DEFAULT_HOLD_MINUTES;
}

function availabilityId({ productId, dateKey, timeKey }) {
  return Buffer.from(
    JSON.stringify({ p: productId, d: dateKey, t: timeKey }),
    "utf8",
  ).toString("base64url");
}

function parseAvailabilityId(value) {
  try {
    const parsed = JSON.parse(
      Buffer.from(String(value || ""), "base64url").toString("utf8"),
    );
    const dateKey = normalizeDate(parsed?.d);
    const timeKey = normalizeTime(parsed?.t);
    const productId = String(parsed?.p || "").trim();
    if (!productId || !dateKey || !timeKey) return null;
    return { productId, dateKey, timeKey };
  } catch {
    return null;
  }
}

function availabilityStatus(availability) {
  if (!availability.canAccept || availability.remainingSeats <= 0) {
    return "SOLD_OUT";
  }
  if (availability.remainingSeats < availability.capacity) {
    return "LIMITED";
  }
  return "AVAILABLE";
}

function cutoffAt(tour, instant) {
  const seconds = Number.isInteger(tour?.bookingCutoffSeconds)
    ? Math.max(0, tour.bookingCutoffSeconds)
    : 0;
  return new Date(instant.getTime() - seconds * 1000);
}

function availabilityResponse({
  tour,
  dateKey,
  timeKey,
  instant,
  availability,
  units,
  includePricing,
}) {
  const end = new Date(
    instant.getTime() + Number(tour.durationMinutes) * 60 * 1000,
  );
  const status = availabilityStatus(availability);
  const item = {
    id: availabilityId({
      productId: tour.id,
      dateKey,
      timeKey,
    }),
    localDateTimeStart: instant.toISOString(),
    localDateTimeEnd: end.toISOString(),
    allDay: false,
    status,
    available: status === "AVAILABLE" || status === "LIMITED",
    vacancies: availability.remainingSeats,
    capacity: availability.capacity,
    maxUnits: availability.remainingSeats,
    openingHours: [],
  };

  const cutoff = cutoffAt(tour, instant);
  if (cutoff > new Date()) {
    item.utcCutoffAt = cutoff.toISOString();
  }

  if (includePricing) {
    const unitPricing = unitPricingForAvailability(tour, timeKey, units) || [];
    item.unitPricing = unitPricing;
    item.pricing = pricingTotal(unitPricing, units);
  }

  return item;
}

function contactName(contact) {
  const full = String(contact?.fullName || "").trim();
  if (full) return full;
  const joined = [contact?.firstName, contact?.lastName]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");
  return joined || "Civitatis Customer";
}

function contactEmail(contact) {
  return String(contact?.emailAddress || "").trim() || null;
}

function contactPhone(contact) {
  return String(contact?.phoneNumber || "").trim() || null;
}

function contactLanguage(contact) {
  const locales = Array.isArray(contact?.locales) ? contact.locales : [];
  return locales.length ? String(locales[0]) : null;
}

function safePayload(value) {
  return value && typeof value === "object" ? structuredClone(value) : value;
}

function bookingStatus(booking) {
  if (booking.status === "CONFIRMED") return "CONFIRMED";
  if (booking.status === "CANCELED") return "CANCELLED";
  if (
    booking.status === "PENDING" &&
    booking.holdExpiresAt &&
    new Date(booking.holdExpiresAt) <= new Date()
  ) {
    return "EXPIRED";
  }
  return "ON_HOLD";
}

function supplierReference(booking) {
  return `PMY-${String(booking.id).slice(0, 12).toUpperCase()}`;
}

function rawCivitatisRequest(booking) {
  const raw = booking?.rawPayload;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw.civitatisRequest || {};
}

function bookingUnitItems(booking) {
  const raw = rawCivitatisRequest(booking);
  const original = Array.isArray(raw.unitItems) ? raw.unitItems : [];

  if (original.length > 0) {
    return original.map((item, index) => ({
      unitId: category(item?.unitId),
      ticket: null,
      contact: item?.contact || {
        fullName: booking.customerName,
        emailAddress: booking.customerEmail,
        phoneNumber: booking.customerPhone,
        locales: booking.language ? [booking.language] : [],
      },
      supplierReference: `${supplierReference(booking)}-${index + 1}`,
    }));
  }

  const fallback = [];
  const push = (unitId, count) => {
    for (let i = 0; i < Number(count || 0); i += 1) {
      fallback.push({
        unitId,
        ticket: null,
        contact: {
          fullName: booking.customerName,
          emailAddress: booking.customerEmail,
          phoneNumber: booking.customerPhone,
          locales: booking.language ? [booking.language] : [],
        },
        supplierReference: `${supplierReference(booking)}-${fallback.length + 1}`,
      });
    }
  };

  push("ADULT", booking.adults);
  push("CHILD", booking.children);
  push("YOUTH", booking.youths);
  push("SENIOR", booking.seniors);
  return fallback;
}

function detailedBookingResponse(booking) {
  return {
    uuid: booking.id,
    resellerReference: booking.externalBookingId || booking.bookingRef || null,
    supplierReference: supplierReference(booking),
    status: bookingStatus(booking),
    utcCreatedAt: new Date(booking.createdAt).toISOString(),
    utcUpdatedAt: new Date(booking.updatedAt).toISOString(),
    utcExpiresAt:
      booking.holdExpiresAt && booking.status === "PENDING"
        ? new Date(booking.holdExpiresAt).toISOString()
        : null,
    utcConfirmedAt:
      booking.status === "CONFIRMED"
        ? new Date(booking.externalUpdatedAt || booking.updatedAt).toISOString()
        : null,
    cancellable: !["CANCELLED", "EXPIRED"].includes(bookingStatus(booking)),
    productId: booking.tourId,
    optionId: OPTION_ID,
    availabilityId: rawCivitatisRequest(booking)?.availabilityId || null,
    contact: {
      fullName: booking.customerName,
      emailAddress: booking.customerEmail,
      phoneNumber: booking.customerPhone,
      locales: booking.language ? [booking.language] : [],
    },
    notes: rawCivitatisRequest(booking)?.notes || null,
    deliveryMethods: ["VOUCHER"],
    voucher: {
      deliveryOptions: [],
      redemptionMethod: "MANIFEST",
    },
    unitItems: bookingUnitItems(booking),
  };
}

export async function civitatisProducts() {
  const tours = await prisma.tour.findMany({
    where: { shopifyStatus: { not: "INACTIVE" } },
    include: { variants: true },
    orderBy: { title: "asc" },
  });

  return json(tours.filter(eligibleTour).map(productSummary));
}

export async function civitatisProduct(productId) {
  const tour = await findTour(productId);
  if (!tour) {
    return errorResponse(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }
  return json(productDetails(tour));
}

export async function civitatisAvailability(request, body) {
  const tour = await findTour(body?.productId);
  if (!tour) {
    return errorResponse(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }

  if (!validateOption(body?.optionId)) {
    return errorResponse(400, "INVALID_OPTION", "Invalid optionId.");
  }

  const startDate = normalizeDate(body?.localDateStart);
  const endDate = normalizeDate(body?.localDateEnd);
  if (!startDate || !endDate || startDate > endDate) {
    return errorResponse(
      400,
      "INVALID_DATE_RANGE",
      "localDateStart and localDateEnd must be valid ISO dates.",
    );
  }

  const days = dateRangeDays(startDate, endDate);
  if (!Number.isInteger(days) || days < 1 || days > 366) {
    return errorResponse(
      400,
      "INVALID_DATE_RANGE",
      "Availability range must contain between 1 and 366 days.",
    );
  }

  const counts = requestedSeatsFromUnits(tour, body?.units || []);
  if (counts.error) {
    return errorResponse(400, "INVALID_UNITS", counts.error);
  }

  const includePricing = civitatisCapabilities(request).has("pricing");
  const firstInstant = localSlotToInstant(
    startDate,
    "00:00",
    tour.timezone || "Europe/Lisbon",
  );
  const afterEnd = localSlotToInstant(
    nextDateKey(endDate),
    "00:00",
    tour.timezone || "Europe/Lisbon",
  );

  try {
    const [bookings, blocks] = await Promise.all([
      prisma.booking.findMany({
        where: {
          tourId: tour.id,
          status: { in: ["CONFIRMED", "PENDING"] },
          startTime: {
            gte: new Date(firstInstant.getTime() - 86400000),
            lt: new Date(afterEnd.getTime() + 86400000),
          },
        },
      }),
      getActiveAvailabilityBlocks(prisma, tour.id),
    ]);

    const response = [];
    let dateKey = startDate;

    while (dateKey <= endDate) {
      for (const rawTime of [...new Set(tour.scheduleSlots || [])].sort()) {
        const timeKey = normalizeTime(rawTime);
        if (!timeKey) continue;

        const instant = localSlotToInstant(
          dateKey,
          timeKey,
          tour.timezone || "Europe/Lisbon",
        );
        if (!instant) continue;

        const cutoff = cutoffAt(tour, instant);
        if (instant <= new Date() || cutoff <= new Date()) continue;

        const availability = calculateAvailabilityForCalendarSlotFromLoaded({
          tour,
          bookings,
          blocks,
          dateKey,
          timeKey,
          platform: PLATFORM,
          requestedSeats: counts.totalParticipants,
        });

        response.push(
          availabilityResponse({
            tour,
            dateKey,
            timeKey,
            instant,
            availability,
            units: body?.units || [],
            includePricing,
          }),
        );
      }

      dateKey = nextDateKey(dateKey);
    }

    return json(response);
  } catch (error) {
    console.error("[CIVITATIS] availability failed", error);
    return errorResponse(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unexpected availability failure.",
    );
  }
}

export async function civitatisCreateBooking(request, body) {
  const tour = await findTour(body?.productId);
  if (!tour) {
    return errorResponse(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }

  if (!validateOption(body?.optionId)) {
    return errorResponse(400, "INVALID_OPTION", "Invalid optionId.");
  }

  const parsedAvailability = parseAvailabilityId(body?.availabilityId);
  if (
    !parsedAvailability ||
    parsedAvailability.productId !== tour.id ||
    !(tour.scheduleSlots || []).includes(parsedAvailability.timeKey)
  ) {
    return errorResponse(
      400,
      "INVALID_AVAILABILITY",
      "availabilityId is invalid for this product.",
    );
  }

  if (body?.pickupRequested) {
    return errorResponse(
      501,
      "PICKUPS_NOT_IMPLEMENTED",
      "Pickup requests are not configured for PMY yet.",
    );
  }

  const counts = countsFromUnitItems(tour, body?.unitItems);
  if (counts.error || counts.totalParticipants < 1) {
    return errorResponse(
      400,
      "INVALID_UNITS",
      counts.error || "At least one unit item is required.",
    );
  }

  const instant = localSlotToInstant(
    parsedAvailability.dateKey,
    parsedAvailability.timeKey,
    tour.timezone || "Europe/Lisbon",
  );

  if (!instant || instant <= new Date() || cutoffAt(tour, instant) <= new Date()) {
    return errorResponse(
      400,
      "AVAILABILITY_EXPIRED",
      "The selected availability is no longer bookable.",
    );
  }

  const holdExpiresAt = new Date(
    Date.now() + holdMinutes() * 60 * 1000,
  );

  const leadContact =
    (body.unitItems || []).find((item) => item?.contact)?.contact || {};

  try {
    const guarded = await createBookingWithCapacityGuard(prisma, {
      tourId: tour.id,
      startTime: instant,
      platform: PLATFORM,
      requestedSeats: counts.totalParticipants,
      bookingData: {
        customerName: contactName(leadContact),
        customerEmail: contactEmail(leadContact),
        customerPhone: contactPhone(leadContact),
        language: contactLanguage(leadContact),
        startTime: instant,
        platform: PLATFORM,
        status: "PENDING",
        externalProductId: tour.id,
        externalVariantId: OPTION_ID,
        adults: counts.adults,
        children: counts.children,
        youths: counts.youths,
        seniors: counts.seniors,
        holdExpiresAt,
        syncStatus: "ON_HOLD",
        lastSyncedAt: new Date(),
        rawPayload: {
          civitatisEnvironment: requestEnvironment(request),
          civitatisRequest: safePayload(body),
        },
      },
    });

    if (!guarded.accepted) {
      return errorResponse(
        400,
        "AVAILABILITY_UNAVAILABLE",
        guarded.message || "The selected availability is no longer available.",
      );
    }

    return json({
      uuid: guarded.booking.id,
      utcCreatedAt: new Date(guarded.booking.createdAt).toISOString(),
      utcExpiresAt: new Date(
        guarded.booking.holdExpiresAt || holdExpiresAt,
      ).toISOString(),
      status: "ON_HOLD",
      cancellable: true,
    });
  } catch (error) {
    console.error("[CIVITATIS] create booking failed", error);
    return errorResponse(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unexpected booking reservation failure.",
    );
  }
}

export async function civitatisConfirmBooking(request, uuid, body) {
  const resellerReference = String(body?.resellerReference || "").trim();
  if (!resellerReference) {
    return errorResponse(
      400,
      "RESELLER_REFERENCE_REQUIRED",
      "resellerReference is required.",
    );
  }

  try {
    const booking = await prisma.booking.findFirst({
      where: { id: uuid, platform: PLATFORM },
    });

    if (!booking) {
      return errorResponse(404, "BOOKING_NOT_FOUND", "Booking not found.");
    }

    const status = bookingStatus(booking);
    if (status === "CANCELLED") {
      return errorResponse(
        400,
        "BOOKING_CANCELLED",
        "The booking has already been cancelled.",
      );
    }

    if (status === "EXPIRED") {
      if (booking.status === "PENDING") {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: "CANCELED",
            cancelReason: "civitatis_hold_expired",
            syncStatus: "EXPIRED",
            lastSyncedAt: new Date(),
          },
        });
      }
      return errorResponse(
        400,
        "BOOKING_EXPIRED",
        "The booking hold has expired.",
      );
    }

    if (booking.status === "CONFIRMED") {
      if (
        booking.externalBookingId &&
        booking.externalBookingId !== resellerReference
      ) {
        return errorResponse(
          400,
          "REFERENCE_MISMATCH",
          "The booking is already confirmed with a different reseller reference.",
        );
      }
      return json(detailedBookingResponse(booking));
    }

    const duplicate = await prisma.booking.findFirst({
      where: {
        platform: PLATFORM,
        externalBookingId: resellerReference,
        id: { not: booking.id },
      },
    });

    if (duplicate) {
      return json(detailedBookingResponse(duplicate));
    }

    const contact = body?.contact || {};
    const raw = rawCivitatisRequest(booking);
    const includePricing = civitatisCapabilities(request).has("pricing");
    let totalPrice = null;
    let currency = null;

    if (includePricing) {
      const tour = await prisma.tour.findUnique({
        where: { id: booking.tourId },
        include: { variants: true },
      });
      const timeKey = new Intl.DateTimeFormat("en-GB", {
        timeZone: tour?.timezone || "Europe/Lisbon",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(booking.startTime));

      const unitPricing =
        unitPricingForAvailability(
          tour,
          timeKey,
          (raw.unitItems || []).map((item) => ({
            id: item.unitId,
            quantity: 1,
          })),
        ) || [];

      const pricing = pricingTotal(
        unitPricing,
        (raw.unitItems || []).reduce((items, item) => {
          const id = category(item?.unitId);
          const existing = items.find((entry) => entry.id === id);
          if (existing) existing.quantity += 1;
          else items.push({ id, quantity: 1 });
          return items;
        }, []),
      );

      if (pricing) {
        totalPrice = pricing.retail.toFixed(2);
        currency = pricing.currency;
      }
    }

    const confirmed = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CONFIRMED",
        customerName: contactName(contact),
        customerEmail: contactEmail(contact) || booking.customerEmail,
        customerPhone: contactPhone(contact) || booking.customerPhone,
        language: contactLanguage(contact) || booking.language,
        bookingRef: resellerReference,
        externalBookingId: resellerReference,
        externalOrderId: resellerReference,
        totalPrice,
        currency,
        syncStatus: "SYNCED",
        lastSyncedAt: new Date(),
        externalUpdatedAt: new Date(),
        holdExpiresAt: null,
        rawPayload: {
          ...safePayload(booking.rawPayload || {}),
          civitatisConfirmation: safePayload(body),
          civitatisEnvironment: requestEnvironment(request),
        },
      },
    });

    return json(detailedBookingResponse(confirmed));
  } catch (error) {
    console.error("[CIVITATIS] confirm booking failed", error);
    return errorResponse(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unexpected booking confirmation failure.",
    );
  }
}

export async function civitatisGetBooking(uuid) {
  const booking = await prisma.booking.findFirst({
    where: { id: uuid, platform: PLATFORM },
  });

  if (!booking) {
    return errorResponse(404, "BOOKING_NOT_FOUND", "Booking not found.");
  }

  return json(detailedBookingResponse(booking));
}

export async function civitatisCancelBooking(uuid) {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: uuid, platform: PLATFORM },
    });

    if (!booking) {
      return errorResponse(404, "BOOKING_NOT_FOUND", "Booking not found.");
    }

    if (booking.status === "CANCELED") {
      return json(detailedBookingResponse(booking));
    }

    const canceled = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELED",
        cancelReason: "civitatis_booking_cancelled",
        syncStatus: "SYNCED",
        lastSyncedAt: new Date(),
        externalUpdatedAt: new Date(),
        holdExpiresAt: null,
      },
    });

    return json(detailedBookingResponse(canceled));
  } catch (error) {
    console.error("[CIVITATIS] cancel booking failed", error);
    return errorResponse(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unexpected booking cancellation failure.",
    );
  }
}

export function civitatisHealthcheck() {
  return json({ status: "OK" });
}

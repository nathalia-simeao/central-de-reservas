import db from "../db.server";
import {
  calculateAvailabilityForCalendarSlotFromLoaded,
  createBookingWithCapacityGuard,
  getCentralAvailability,
} from "./capacity.server";
import { getActiveAvailabilityBlocks, getDatePartsInTimeZone } from "./availability.server";
import { checkGygBasicAuth } from "./gyg.server";
import { resolveTourByPlatformId } from "./tour-passport.server";
import {
  enqueueBookingSync,
  SYNC_EVENT_TYPES,
} from "./sync-queue.server";

const prisma = db;
const GYG_PLATFORM = "GETYOURGUIDE";
const HOLD_MINUTES = 60;
const INDIVIDUAL_CATEGORIES = ["ADULT", "CHILD", "YOUTH", "SENIOR"];

function json(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function gygV1Success(data = {}) {
  return json({ data });
}

export function gygV1Error(errorCode, errorMessage, extra = {}) {
  return json({ errorCode, errorMessage, ...extra });
}

export function requireGygAuth(request) {
  return checkGygBasicAuth(request)
    ? null
    : gygV1Error(
        "AUTHORIZATION_FAILURE",
        "The provided authentication credentials are not valid.",
      );
}

export async function readGygBody(request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || !body.data || typeof body.data !== "object") {
      return {
        error: gygV1Error(
          "VALIDATION_FAILURE",
          "Request body must contain a JSON data object.",
        ),
      };
    }
    return { data: body.data };
  } catch {
    return {
      error: gygV1Error(
        "VALIDATION_FAILURE",
        "Request body is not valid JSON.",
      ),
    };
  }
}

function dateKeyFromInstant(date, timeZone = "Europe/Lisbon") {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function timezoneOffsetForInstant(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    timeZoneName: "longOffset",
    hour: "2-digit",
  }).formatToParts(date);

  const value = parts.find((part) => part.type === "timeZoneName")?.value || "GMT+00:00";
  const match = value.match(/GMT([+-]\d{2}:\d{2})/);
  return match?.[1] || "+00:00";
}

function timeZoneParts(date, timeZone) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number.parseInt(part.value, 10)]),
  );
}

export function localSlotToInstant(dateKey, timeKey, timeZone = "Europe/Lisbon") {
  const dateMatch = String(dateKey || "").match(/^(20\d{2})-(\d{2})-(\d{2})$/);
  const timeMatch = String(timeKey || "").match(/^([01]\d|2[0-3]):([0-5]\d)$/);
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
  for (let i = 0; i < 3; i += 1) {
    const parts = timeZoneParts(new Date(guess), timeZone);
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

  const result = new Date(guess);
  return Number.isNaN(result.getTime()) ? null : result;
}

function slotIso(dateKey, timeKey, timeZone = "Europe/Lisbon") {
  const instant = localSlotToInstant(dateKey, timeKey, timeZone);
  if (!instant) return null;
  return `${dateKey}T${timeKey}:00${timezoneOffsetForInstant(instant, timeZone)}`;
}

function nextDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0));
  return next.toISOString().slice(0, 10);
}

function cents(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

function normalizeCategory(value) {
  return String(value || "").trim().toUpperCase();
}

function categoriesForTour(tour) {
  return new Set(
    (tour?.variants || [])
      .filter((variant) => variant.active !== false && variant.passengerCategory)
      .map((variant) => normalizeCategory(variant.passengerCategory)),
  );
}

function isGroupOnlyTour(tour) {
  const categories = categoriesForTour(tour);
  return (
    categories.has("GROUP") &&
    !INDIVIDUAL_CATEGORIES.some((category) => categories.has(category))
  );
}

function pricingForSlot(tour, timeKey) {
  const matching = (tour?.variants || []).filter((variant) => {
    if (variant.active === false || !variant.passengerCategory || variant.price == null) {
      return false;
    }
    return !variant.startTimeSlot || variant.startTimeSlot === timeKey;
  });

  const perCategory = new Map();
  let currency = null;
  let ambiguous = false;

  for (const variant of matching) {
    const category = normalizeCategory(variant.passengerCategory);
    if (!INDIVIDUAL_CATEGORIES.includes(category)) continue;

    const price = cents(variant.price);
    if (price == null) continue;

    const variantCurrency = String(variant.currency || "EUR").toUpperCase();
    if (!currency) currency = variantCurrency;
    if (currency !== variantCurrency) ambiguous = true;

    if (!perCategory.has(category)) {
      perCategory.set(category, price);
    } else if (perCategory.get(category) !== price) {
      // Multiple Shopify sub-options share the same time/category with different
      // prices. Do not guess which GYG option should receive which price.
      ambiguous = true;
    }
  }

  if (ambiguous || perCategory.size === 0) {
    return { currency: null, retailPrices: null, ambiguous };
  }

  return {
    currency: currency || "EUR",
    retailPrices: [...perCategory.entries()].map(([category, price]) => ({
      category,
      price,
    })),
    ambiguous: false,
  };
}

function participantCounts(bookingItems) {
  const counts = { adults: 0, children: 0, youths: 0, seniors: 0 };
  let total = 0;

  for (const item of Array.isArray(bookingItems) ? bookingItems : []) {
    const category = normalizeCategory(item?.category);
    const count = Number.parseInt(item?.count ?? 0, 10);
    if (!Number.isInteger(count) || count < 0) {
      return { error: "Booking item count must be a non-negative integer." };
    }
    if (count === 0) continue;

    if (category === "ADULT") counts.adults += count;
    else if (category === "CHILD") counts.children += count;
    else if (category === "YOUTH") counts.youths += count;
    else if (category === "SENIOR") counts.seniors += count;
    else return { invalidCategory: category || "UNKNOWN" };

    total += count;
  }

  return { ...counts, totalParticipants: total };
}

function totalRetailPrice(bookingItems) {
  let total = 0;
  let found = false;

  for (const item of Array.isArray(bookingItems) ? bookingItems : []) {
    const count = Number.parseInt(item?.count ?? 0, 10);
    const unit = Number(item?.retailPrice);
    if (!Number.isInteger(count) || count < 0 || !Number.isFinite(unit)) continue;
    total += count * unit;
    found = true;
  }

  return found ? (total / 100).toFixed(2) : null;
}

function safeInstant(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function responseBookingReference(booking) {
  return booking?.id || null;
}

function ticketsForBooking() {
  // PMY currently uses GetYourGuide's voucher. We therefore return no
  // supplier-generated ticket codes until PMY introduces its own QR/barcode flow.
  return [];
}

export async function getGygAvailabilities({ productId, fromDateTime, toDateTime }) {
  if (!productId || !fromDateTime || !toDateTime) {
    return gygV1Error(
      "VALIDATION_FAILURE",
      "productId, fromDateTime and toDateTime are required.",
    );
  }

  const from = safeInstant(fromDateTime);
  const to = safeInstant(toDateTime);
  if (!from || !to || from > to) {
    return gygV1Error("VALIDATION_FAILURE", "Invalid availability date range.");
  }

  try {
    const tour = await resolveTourByPlatformId(prisma, GYG_PLATFORM, productId);
    if (!tour) {
      return gygV1Error("INVALID_PRODUCT", "The requested product does not exist.");
    }

    const timeZone = tour.timezone || "Europe/Lisbon";
    const scheduleSlots = [...new Set(tour.scheduleSlots || [])].sort();

    // Group/private inventory has different vacancy semantics in GYG (groups,
    // not individual seats). Keep those options offline until that model is
    // explicitly configured instead of accidentally overselling.
    if (isGroupOnlyTour(tour)) {
      return gygV1Success({ availabilities: [] });
    }

    // Never invent availability. Products without a configured PMY schedule
    // return an empty list until the schedule is supplied by the source catalog.
    if (scheduleSlots.length === 0) {
      return gygV1Success({ availabilities: [] });
    }

    const queryWindowStart = new Date(from.getTime() - 24 * 60 * 60 * 1000);
    const queryWindowEnd = new Date(to.getTime() + 24 * 60 * 60 * 1000);

    const [bookings, blocks] = await Promise.all([
      prisma.booking.findMany({
        where: {
          tourId: tour.id,
          status: { in: ["CONFIRMED", "PENDING"] },
          startTime: { gte: queryWindowStart, lte: queryWindowEnd },
        },
      }),
      getActiveAvailabilityBlocks(prisma, tour.id),
    ]);

    const availabilities = [];
    let dateKey = dateKeyFromInstant(from, timeZone);
    const endDateKey = dateKeyFromInstant(to, timeZone);
    const now = new Date();

    while (dateKey && endDateKey && dateKey <= endDateKey) {
      for (const timeKey of scheduleSlots) {
        const instant = localSlotToInstant(dateKey, timeKey, timeZone);
        if (!instant || instant < from || instant > to) continue;

        const availability = calculateAvailabilityForCalendarSlotFromLoaded({
          tour,
          bookings,
          blocks,
          dateKey,
          timeKey,
          platform: "getyourguide",
          now,
        });

        const price = tour.gygPriceOverApi
          ? pricingForSlot(tour, timeKey)
          : { currency: null, retailPrices: null, ambiguous: false };
        const entry = {
          dateTime: slotIso(dateKey, timeKey, timeZone),
          productId: String(productId),
          vacancies: availability.remainingSeats,
        };

        if (Number.isInteger(tour.bookingCutoffSeconds) && tour.bookingCutoffSeconds >= 0) {
          entry.cutoffSeconds = tour.bookingCutoffSeconds;
        }

        if (price.retailPrices) {
          entry.currency = price.currency;
          entry.pricesByCategory = { retailPrices: price.retailPrices };
        }

        availabilities.push(entry);
      }

      dateKey = nextDateKey(dateKey);
    }

    return gygV1Success({ availabilities });
  } catch (error) {
    console.error("[GYG v1] get-availabilities failed", error);
    return gygV1Error(
      "INTERNAL_SYSTEM_FAILURE",
      error?.message || "Unexpected availability failure.",
    );
  }
}

export async function reserveGyg(data) {
  const productId = data?.productId;
  const gygBookingReference = data?.gygBookingReference;
  const startTime = safeInstant(data?.dateTime);
  const counts = participantCounts(data?.bookingItems);

  if (!productId || !gygBookingReference || !startTime) {
    return gygV1Error(
      "VALIDATION_FAILURE",
      "productId, dateTime and gygBookingReference are required.",
    );
  }
  if (counts.error) return gygV1Error("VALIDATION_FAILURE", counts.error);
  if (counts.invalidCategory) {
    return gygV1Error(
      "INVALID_TICKET_CATEGORY",
      `The ticket category ${counts.invalidCategory} is not supported.`,
    );
  }
  if (counts.totalParticipants < 1) {
    return gygV1Error(
      "VALIDATION_FAILURE",
      "At least one booking item is required.",
    );
  }

  try {
    const existingBooking = await prisma.booking.findFirst({
      where: {
        platform: GYG_PLATFORM,
        externalBookingId: gygBookingReference,
      },
    });

    if (existingBooking) {
      if (existingBooking.status === "CANCELED") {
        return gygV1Error(
          "INVALID_RESERVATION",
          "This GetYourGuide booking reference was already cancelled.",
        );
      }

      return gygV1Success({
        reservationReference: responseBookingReference(existingBooking),
        reservationExpiration: existingBooking.holdExpiresAt
          ? new Date(existingBooking.holdExpiresAt).toISOString()
          : new Date(Date.now() + HOLD_MINUTES * 60 * 1000).toISOString(),
      });
    }

    const tour = await resolveTourByPlatformId(prisma, GYG_PLATFORM, productId);
    if (!tour) return gygV1Error("INVALID_PRODUCT", "The requested product does not exist.");

    if (isGroupOnlyTour(tour)) {
      return gygV1Error(
        "INVALID_TICKET_CATEGORY",
        "This PMY product uses group/private pricing and is not enabled for GYG individual inventory yet.",
      );
    }

    const now = new Date();
    const cutoffSeconds = Number.isInteger(tour.bookingCutoffSeconds)
      ? Math.max(0, tour.bookingCutoffSeconds)
      : 0;

    if (
      startTime <= now ||
      startTime.getTime() - now.getTime() < cutoffSeconds * 1000
    ) {
      return gygV1Error(
        "NO_AVAILABILITY",
        "The requested timeslot is inside the booking cutoff or already in the past.",
      );
    }

    const slot = getDatePartsInTimeZone(
      startTime,
      tour.timezone || "Europe/Lisbon",
    );
    const supported = categoriesForTour(tour);
    for (const item of data.bookingItems || []) {
      const category = normalizeCategory(item?.category);
      if (category && !supported.has(category)) {
        return gygV1Error(
          "INVALID_TICKET_CATEGORY",
          `The ticket category ${category} is not configured for this product.`,
        );
      }
    }

    if (!slot || !(tour.scheduleSlots || []).includes(slot.timeKey)) {
      return gygV1Error(
        "NO_AVAILABILITY",
        "The requested timeslot is not available for this product.",
      );
    }

    const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
    const guarded = await createBookingWithCapacityGuard(prisma, {
      tourId: tour.id,
      startTime,
      platform: GYG_PLATFORM,
      externalBookingId: gygBookingReference,
      requestedSeats: counts.totalParticipants,
      bookingData: {
        customerName: "GetYourGuide Customer",
        startTime,
        platform: GYG_PLATFORM,
        status: "PENDING",
        bookingRef: gygBookingReference,
        externalBookingId: gygBookingReference,
        externalProductId: String(productId),
        adults: counts.adults,
        children: counts.children,
        youths: counts.youths,
        seniors: counts.seniors,
        syncStatus: "RESERVED",
        lastSyncedAt: new Date(),
        holdExpiresAt,
        rawPayload: { data },
      },
    });

    if (!guarded.accepted) {
      return gygV1Error(
        "NO_AVAILABILITY",
        guarded.message || "The requested timeslot is sold out.",
      );
    }

    const booking = guarded.booking;
    const expiration = booking.holdExpiresAt || holdExpiresAt;

    await enqueueBookingSync(prisma, {
      eventId: `gyg-reserve:${booking.id}`,
      eventType: SYNC_EVENT_TYPES.BOOKING_CREATED,
      booking,
      sourcePlatform: GYG_PLATFORM,
      payload: { origin: "GYG_RESERVE" },
    });

    return gygV1Success({
      reservationReference: responseBookingReference(booking),
      reservationExpiration: expiration.toISOString(),
    });
  } catch (error) {
    console.error("[GYG v1] reserve failed", error);
    return gygV1Error(
      "INTERNAL_SYSTEM_FAILURE",
      error?.message || "Unexpected reservation failure.",
    );
  }
}

export async function cancelGygReservation(data) {
  const reservationReference = data?.reservationReference;
  const gygBookingReference = data?.gygBookingReference;

  if (!reservationReference && !gygBookingReference) {
    return gygV1Error(
      "VALIDATION_FAILURE",
      "reservationReference or gygBookingReference is required.",
    );
  }

  try {
    const booking = await prisma.booking.findFirst({
      where: {
        platform: GYG_PLATFORM,
        OR: [
          ...(reservationReference ? [{ id: reservationReference }] : []),
          ...(gygBookingReference
            ? [
                { externalBookingId: gygBookingReference },
                { bookingRef: gygBookingReference },
              ]
            : []),
        ],
      },
    });

    if (!booking || booking.status === "CANCELED") {
      return gygV1Success({});
    }

    if (booking.status !== "PENDING") {
      return gygV1Error(
        "INVALID_RESERVATION",
        "The reservation is not in a cancellable state.",
      );
    }

    const canceled = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELED",
        cancelReason: "gyg_reservation_cancelled",
        syncStatus: "SYNCED",
        lastSyncedAt: new Date(),
        holdExpiresAt: null,
        rawPayload: { data },
      },
    });

    await enqueueBookingSync(prisma, {
      eventId: `gyg-cancel-reservation:${canceled.id}`,
      eventType: SYNC_EVENT_TYPES.BOOKING_CANCELLED,
      booking: canceled,
      sourcePlatform: GYG_PLATFORM,
      force: true,
      payload: { reason: "gyg_reservation_cancelled" },
    });

    return gygV1Success({});
  } catch (error) {
    console.error("[GYG v1] cancel-reservation failed", error);
    return gygV1Error(
      "INTERNAL_SYSTEM_FAILURE",
      error?.message || "Unexpected reservation cancellation failure.",
    );
  }
}

export async function bookGyg(data) {
  const reservationReference = data?.reservationReference;
  const gygBookingReference = data?.gygBookingReference;

  if (!reservationReference || !gygBookingReference) {
    return gygV1Error(
      "VALIDATION_FAILURE",
      "reservationReference and gygBookingReference are required.",
    );
  }

  try {
    const booking = await prisma.booking.findFirst({
      where: {
        platform: GYG_PLATFORM,
        id: reservationReference,
        OR: [
          { externalBookingId: gygBookingReference },
          { bookingRef: gygBookingReference },
        ],
      },
    });

    if (!booking) {
      return gygV1Error(
        "INVALID_RESERVATION",
        "The reservation does not exist.",
      );
    }

    const requestedTour = data?.productId
      ? await resolveTourByPlatformId(prisma, GYG_PLATFORM, data.productId)
      : null;

    if (!requestedTour || requestedTour.id !== booking.tourId) {
      return gygV1Error(
        "INVALID_RESERVATION",
        "productId does not match the reserved PMY tour.",
      );
    }

    const requestedStartTime = safeInstant(data?.dateTime);
    if (
      !requestedStartTime ||
      requestedStartTime.getTime() !== new Date(booking.startTime).getTime()
    ) {
      return gygV1Error(
        "INVALID_RESERVATION",
        "dateTime does not match the reserved timeslot.",
      );
    }

    const confirmedCounts = participantCounts(data?.bookingItems || []);
    if (confirmedCounts.error) {
      return gygV1Error("VALIDATION_FAILURE", confirmedCounts.error);
    }
    if (confirmedCounts.invalidCategory) {
      return gygV1Error(
        "INVALID_TICKET_CATEGORY",
        `The ticket category ${confirmedCounts.invalidCategory} is not supported.`,
      );
    }
    if (
      confirmedCounts.totalParticipants < 1 ||
      confirmedCounts.totalParticipants !== booking.totalParticipants ||
      confirmedCounts.adults !== booking.adults ||
      confirmedCounts.children !== booking.children ||
      confirmedCounts.youths !== booking.youths ||
      confirmedCounts.seniors !== booking.seniors
    ) {
      return gygV1Error(
        "VALIDATION_FAILURE",
        "bookingItems do not match the quantities held by the reservation.",
      );
    }

    if (booking.status === "CONFIRMED") {
      return gygV1Success({
        bookingReference: responseBookingReference(booking),
        tickets: ticketsForBooking(booking),
      });
    }

    if (
      booking.status !== "PENDING" ||
      (booking.holdExpiresAt && new Date(booking.holdExpiresAt) <= new Date())
    ) {
      return gygV1Error(
        "INVALID_RESERVATION",
        "The reservation has expired or is not valid.",
      );
    }

    const counts = confirmedCounts;

    const traveler = Array.isArray(data?.travelers) ? data.travelers[0] : null;
    const customerName =
      [traveler?.firstName, traveler?.lastName].filter(Boolean).join(" ").trim() ||
      booking.customerName ||
      "GetYourGuide Customer";

    const update = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CONFIRMED",
        customerName,
        customerEmail: traveler?.email || booking.customerEmail,
        customerPhone: traveler?.phoneNumber || booking.customerPhone,
        adults: counts.totalParticipants > 0 ? counts.adults : booking.adults,
        children: counts.totalParticipants > 0 ? counts.children : booking.children,
        youths: counts.totalParticipants > 0 ? counts.youths : booking.youths,
        seniors: counts.totalParticipants > 0 ? counts.seniors : booking.seniors,
        totalParticipants:
          counts.totalParticipants > 0
            ? counts.totalParticipants
            : booking.totalParticipants,
        totalPrice: totalRetailPrice(data?.bookingItems) || booking.totalPrice,
        currency: String(data?.currency || booking.currency || "")
          .toUpperCase()
          .slice(0, 3) || null,
        bookingRef: gygBookingReference,
        externalBookingId: gygBookingReference,
        externalProductId: data?.productId || booking.externalProductId,
        syncStatus: "SYNCED",
        lastSyncedAt: new Date(),
        holdExpiresAt: null,
        externalUpdatedAt: new Date(),
        rawPayload: { data },
      },
    });

    await enqueueBookingSync(prisma, {
      eventId: `gyg-book:${update.id}:${gygBookingReference}`,
      eventType: SYNC_EVENT_TYPES.BOOKING_UPDATED,
      booking: update,
      sourcePlatform: GYG_PLATFORM,
      payload: { origin: "GYG_BOOK" },
    });

    return gygV1Success({
      bookingReference: responseBookingReference(update),
      tickets: ticketsForBooking(update),
    });
  } catch (error) {
    console.error("[GYG v1] book failed", error);
    return gygV1Error(
      "INTERNAL_SYSTEM_FAILURE",
      error?.message || "Unexpected booking failure.",
    );
  }
}

export async function cancelGygBooking(data) {
  const bookingReference = data?.bookingReference;
  const gygBookingReference = data?.gygBookingReference;

  if (!bookingReference && !gygBookingReference) {
    return gygV1Error(
      "VALIDATION_FAILURE",
      "bookingReference or gygBookingReference is required.",
    );
  }

  try {
    const booking = await prisma.booking.findFirst({
      where: {
        platform: GYG_PLATFORM,
        OR: [
          ...(bookingReference ? [{ id: bookingReference }] : []),
          ...(gygBookingReference
            ? [
                { externalBookingId: gygBookingReference },
                { bookingRef: gygBookingReference },
              ]
            : []),
        ],
      },
    });

    if (!booking) {
      return gygV1Error(
        "INVALID_BOOKING",
        "The booking does not exist.",
      );
    }

    if (data?.productId) {
      const requestedTour = await resolveTourByPlatformId(
        prisma,
        GYG_PLATFORM,
        data.productId,
      );
      if (!requestedTour || requestedTour.id !== booking.tourId) {
        return gygV1Error(
          "INVALID_BOOKING",
          "productId does not match the confirmed PMY booking.",
        );
      }
    }

    if (booking.status === "CANCELED") {
      return gygV1Success({});
    }

    const canceled = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELED",
        cancelReason: "gyg_booking_cancelled",
        syncStatus: "SYNCED",
        lastSyncedAt: new Date(),
        holdExpiresAt: null,
        externalUpdatedAt: new Date(),
        rawPayload: { data },
      },
    });

    await enqueueBookingSync(prisma, {
      eventId: `gyg-cancel-booking:${canceled.id}`,
      eventType: SYNC_EVENT_TYPES.BOOKING_CANCELLED,
      booking: canceled,
      sourcePlatform: GYG_PLATFORM,
      force: true,
      payload: { reason: "gyg_booking_cancelled" },
    });

    return gygV1Success({});
  } catch (error) {
    console.error("[GYG v1] cancel-booking failed", error);
    return gygV1Error(
      "INTERNAL_SYSTEM_FAILURE",
      error?.message || "Unexpected booking cancellation failure.",
    );
  }
}

export async function notifyGygAvailabilityUpdate({ productId, availabilities }) {
  const baseUrl = String(process.env.GYG_API_BASE || "").replace(/\/+$/, "");
  const user = process.env.GYG_OUTGOING_USER;
  const pass = process.env.GYG_OUTGOING_PASS;

  if (!baseUrl || !user || !pass) {
    return {
      sent: false,
      reason: "OUTGOING_GYG_NOT_CONFIGURED",
    };
  }

  const notifyUrl = /\/1$/i.test(baseUrl)
    ? `${baseUrl}/notify-availability-update`
    : `${baseUrl}/1/notify-availability-update`;

  const response = await fetch(notifyUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        productId: String(productId),
        availabilities,
      },
    }),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return {
    sent: response.status === 202,
    status: response.status,
    payload,
  };
}


export async function notifyGygTourAvailabilityWindow({
  tourId,
  days = 30,
}) {
  try {
    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
      include: { variants: true },
    });

    if (!tour?.gygActivityId) {
      return { sent: false, reason: "TOUR_NOT_MAPPED_TO_GYG" };
    }

    const scheduleSlots = [...new Set(tour.scheduleSlots || [])].sort();
    if (scheduleSlots.length === 0) {
      return { sent: false, reason: "TOUR_SCHEDULE_NOT_CONFIGURED" };
    }

    const timeZone = tour.timezone || "Europe/Lisbon";
    const from = new Date();
    const to = new Date(from.getTime() + Math.max(1, days) * 24 * 60 * 60 * 1000);
    const queryWindowStart = new Date(from.getTime() - 24 * 60 * 60 * 1000);
    const queryWindowEnd = new Date(to.getTime() + 24 * 60 * 60 * 1000);

    const [bookings, blocks] = await Promise.all([
      prisma.booking.findMany({
        where: {
          tourId: tour.id,
          status: { in: ["CONFIRMED", "PENDING"] },
          startTime: { gte: queryWindowStart, lte: queryWindowEnd },
        },
      }),
      getActiveAvailabilityBlocks(prisma, tour.id),
    ]);

    const updates = [];
    let dateKey = dateKeyFromInstant(from, timeZone);
    const endDateKey = dateKeyFromInstant(to, timeZone);
    const now = new Date();

    while (dateKey && endDateKey && dateKey <= endDateKey) {
      for (const timeKey of scheduleSlots) {
        const instant = localSlotToInstant(dateKey, timeKey, timeZone);
        if (!instant || instant < from || instant > to) continue;

        const availability = calculateAvailabilityForCalendarSlotFromLoaded({
          tour,
          bookings,
          blocks,
          dateKey,
          timeKey,
          platform: "getyourguide",
          now,
        });

        updates.push({
          dateTime: slotIso(dateKey, timeKey, timeZone),
          vacancies: availability.remainingSeats,
        });
      }

      dateKey = nextDateKey(dateKey);
    }

    if (updates.length === 0) {
      return { sent: false, reason: "NO_FUTURE_SLOTS" };
    }

    return notifyGygAvailabilityUpdate({
      productId: tour.id,
      availabilities: updates,
    });
  } catch (error) {
    console.error("[GYG v1] notify tour availability window failed", error);
    return {
      sent: false,
      reason: "NOTIFY_FAILED",
      error: error?.message || String(error),
    };
  }
}

export async function notifyGygSlotAvailability({
  tourId,
  startTime,
  force = false,
}) {
  try {
    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
      include: { variants: true },
    });

    // gygActivityId acts as the marker that this PMY Tour has been mapped
    // to a GetYourGuide option. The supplier productId remains the PMY Tour ID.
    if (!tour?.gygActivityId) {
      return { sent: false, reason: "TOUR_NOT_MAPPED_TO_GYG" };
    }

    const parts = getDatePartsInTimeZone(
      startTime,
      tour.timezone || "Europe/Lisbon",
    );
    if (!parts) {
      return { sent: false, reason: "INVALID_START_TIME" };
    }

    const availability = await getCentralAvailability(prisma, {
      tourId: tour.id,
      startTime,
      platform: "getyourguide",
    });

    if (!force && availability.remainingSeats > 0) {
      return {
        sent: false,
        reason: "PUSH_NOT_REQUIRED",
        remainingSeats: availability.remainingSeats,
      };
    }

    const dateTime = slotIso(
      parts.dateKey,
      parts.timeKey,
      tour.timezone || "Europe/Lisbon",
    );

    if (!dateTime) {
      return { sent: false, reason: "INVALID_SLOT" };
    }

    return notifyGygAvailabilityUpdate({
      productId: tour.id,
      availabilities: [
        {
          dateTime,
          vacancies: availability.remainingSeats,
        },
      ],
    });
  } catch (error) {
    console.error("[GYG v1] notify slot availability failed", error);
    return {
      sent: false,
      reason: "NOTIFY_FAILED",
      error: error?.message || String(error),
    };
  }
}

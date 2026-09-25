/**
 * Legacy compatibility route for GetYourGuide Supplier API.
 *
 * Preferred endpoints:
 *   GET  /api/gyg/get-availabilities
 *   POST /api/gyg/reserve
 *   POST /api/gyg/cancel-reservation
 *   POST /api/gyg/book
 *   POST /api/gyg/cancel-booking
 *
 * This route keeps the older /api/gyg?action=... contract working while
 * sharing the same multichannel Booking schema.
 */
import db from "../db.server";
import {
  bookingLookupWhere,
  bookingOccupancy,
  checkGygBasicAuth,
  getMoneyFields,
  getParticipantCounts,
  gygResponse,
  parseOptionalDate,
} from "../utils/gyg.server";

const prisma = db;

export const loader = async ({ request }) => {
  if (!checkGygBasicAuth(request)) {
    return gygResponse({ error: "Unauthorized" });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("action") !== "get-availabilities") {
    return gygResponse({ error: "Unknown action" });
  }

  return handleGetAvailabilities(url);
};

export const action = async ({ request }) => {
  if (!checkGygBasicAuth(request)) {
    return gygResponse({ error: "Unauthorized" });
  }

  const url = new URL(request.url);
  const actionName = url.searchParams.get("action");

  let body;
  try {
    body = await request.json();
  } catch {
    return gygResponse({ error: "Invalid JSON body" });
  }

  switch (actionName) {
    case "reserve":
      return handleReserve(body);
    case "cancel-reservation":
      return handleCancelReservation(body);
    case "book":
      return handleBook(body);
    case "cancel-booking":
      return handleCancelBooking(body);
    default:
      return gygResponse({ error: "Unknown action" });
  }
};

async function handleGetAvailabilities(url) {
  try {
    const activityId = url.searchParams.get("activity_id");
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");

    if (!activityId) {
      return gygResponse({ error: "activity_id is required", availabilities: [] });
    }

    const tour = await prisma.tour.findFirst({ where: { id: activityId } });
    if (!tour) {
      return gygResponse({ availabilities: [], message: "Tour not found" });
    }

    const from = dateFrom ? new Date(dateFrom) : new Date();
    const to = dateTo
      ? new Date(dateTo + "T23:59:59")
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return gygResponse({ error: "Invalid date range", availabilities: [] });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        tourId: tour.id,
        status: { in: ["CONFIRMED", "PENDING"] },
        startTime: { gte: from, lte: to },
      },
    });

    const MAX_CAPACITY = 20;
    const DEFAULT_TIMES = ["09:00", "14:00"];
    const availabilities = [];
    const cursor = new Date(from);
    const now = new Date();

    while (cursor <= to) {
      const dateStr = cursor.toISOString().split("T")[0];

      for (const time of DEFAULT_TIMES) {
        const [hh, mm] = time.split(":").map(Number);
        const slotStart = new Date(cursor);
        slotStart.setHours(hh, mm, 0, 0);

        const occupied = bookings.reduce((total, booking) => {
          const bookingTime = new Date(booking.startTime);
          const sameSlot =
            bookingTime.toISOString().startsWith(dateStr) &&
            bookingTime.getHours() === hh &&
            bookingTime.getMinutes() === mm;

          return sameSlot ? total + bookingOccupancy(booking, now) : total;
        }, 0);

        const available = Math.max(0, MAX_CAPACITY - occupied);
        if (available > 0) {
          availabilities.push({
            datetime: slotStart.toISOString().replace("Z", "+00:00"),
            vacancies: available,
            pricing: [
              { category: "ADULT", price: { amount: 50, currency: "EUR" } },
              { category: "YOUTH", price: { amount: 35, currency: "EUR" } },
            ],
          });
        }
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return gygResponse({ availabilities });
  } catch (err) {
    console.error("[GYG] get-availabilities error:", err);
    return gygResponse({ error: err.message, availabilities: [] });
  }
}

async function handleReserve(body) {
  try {
    const {
      bookingId,
      activityId,
      timeslot,
      participants,
      customer,
      languageCode,
    } = body;

    if (!bookingId || !activityId || !timeslot?.startTime) {
      return gygResponse({
        success: false,
        error: "Missing required fields: bookingId, activityId, timeslot.startTime",
      });
    }

    const startTime = new Date(timeslot.startTime);
    if (Number.isNaN(startTime.getTime())) {
      return gygResponse({ success: false, error: "Invalid timeslot.startTime" });
    }

    const existing = await prisma.booking.findFirst({
      where: {
        platform: "GETYOURGUIDE",
        OR: [
          { externalBookingId: bookingId },
          { bookingRef: bookingId },
        ],
      },
    });

    if (existing) {
      return gygResponse({
        success: true,
        reservationId: existing.id,
        holdUntil: existing.holdExpiresAt
          ? existing.holdExpiresAt.toISOString().replace("Z", "+00:00")
          : undefined,
        message: "Already reserved",
      });
    }

    const tour = await prisma.tour.findFirst({ where: { id: activityId } });
    if (!tour) {
      return gygResponse({ success: false, error: "Tour not found" });
    }

    const counts = getParticipantCounts(participants);
    const money = getMoneyFields(body);
    const holdExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const now = new Date();

    const reservation = await prisma.booking.create({
      data: {
        tourId: tour.id,
        customerName:
          `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() ||
          "GYG Customer",
        customerEmail: customer?.email || null,
        customerPhone: customer?.phone || null,
        language: languageCode || null,
        startTime,
        platform: "GETYOURGUIDE",
        status: "PENDING",
        bookingRef: bookingId,
        externalBookingId: bookingId,
        externalProductId: activityId,
        externalVariantId: timeslot?.id || body?.variantId || null,
        ...counts,
        ...money,
        syncStatus: "RECEIVED",
        lastSyncedAt: now,
        externalCreatedAt: parseOptionalDate(body?.createdAt || body?.bookingDate),
        externalUpdatedAt: parseOptionalDate(body?.updatedAt),
        holdExpiresAt,
        rawPayload: body,
      },
    });

    return gygResponse({
      success: true,
      reservationId: reservation.id,
      holdUntil: holdExpiresAt.toISOString().replace("Z", "+00:00"),
    });
  } catch (err) {
    console.error("[GYG] reserve error:", err);
    return gygResponse({ success: false, error: err.message });
  }
}

async function handleCancelReservation(body) {
  const { reservationId, bookingId, reason } = body;
  const lookup = bookingLookupWhere({ reservationId, bookingId });

  if (!lookup) {
    return gygResponse({
      success: false,
      error: "reservationId or bookingId is required",
    });
  }

  try {
    const booking = await prisma.booking.findFirst({
      where: { platform: "GETYOURGUIDE", ...lookup },
    });

    if (!booking || booking.status === "CANCELED") {
      return gygResponse({ success: true, message: "Already released" });
    }

    if (booking.status !== "PENDING") {
      return gygResponse({
        success: false,
        error: `Cannot cancel reservation with status: ${booking.status}`,
      });
    }

    const now = new Date();
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELED",
        cancelReason: reason || "reservation_cancelled",
        syncStatus: "SYNCED",
        lastSyncedAt: now,
        externalUpdatedAt: parseOptionalDate(body?.updatedAt) || now,
        holdExpiresAt: null,
        rawPayload: body,
      },
    });

    return gygResponse({ success: true });
  } catch (err) {
    console.error("[GYG] cancel-reservation error:", err);
    return gygResponse({ success: false, error: err.message });
  }
}

async function handleBook(body) {
  const { reservationId, bookingId, voucher } = body;
  const lookup = bookingLookupWhere({ reservationId, bookingId });

  if (!lookup) {
    return gygResponse({
      success: false,
      error: "reservationId or bookingId is required",
    });
  }

  try {
    const booking = await prisma.booking.findFirst({
      where: { platform: "GETYOURGUIDE", ...lookup },
    });

    if (!booking) {
      return gygResponse({ success: false, error: "Reservation not found" });
    }

    const now = new Date();
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CONFIRMED",
        bookingRef: booking.bookingRef || bookingId || null,
        externalBookingId: booking.externalBookingId || bookingId || null,
        voucherCode: voucher?.barcode || booking.voucherCode || null,
        voucherFormat: voucher?.barcodeFormat || booking.voucherFormat || null,
        syncStatus: "SYNCED",
        lastSyncedAt: now,
        externalUpdatedAt: parseOptionalDate(body?.updatedAt) || now,
        holdExpiresAt: null,
        rawPayload: body,
      },
    });

    return gygResponse({
      success: true,
      message: booking.status === "CONFIRMED" ? "Already confirmed" : "Confirmed",
    });
  } catch (err) {
    console.error("[GYG] book error:", err);
    return gygResponse({ success: false, error: err.message });
  }
}

async function handleCancelBooking(body) {
  const { bookingId, reason } = body;

  if (!bookingId) {
    return gygResponse({ success: false, error: "bookingId is required" });
  }

  try {
    const booking = await prisma.booking.findFirst({
      where: {
        platform: "GETYOURGUIDE",
        OR: [
          { externalBookingId: bookingId },
          { bookingRef: bookingId },
        ],
      },
    });

    if (!booking || booking.status === "CANCELED") {
      return gygResponse({ success: true, message: "Already canceled" });
    }

    const now = new Date();
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELED",
        cancelReason: reason || "booking_cancelled",
        syncStatus: "SYNCED",
        lastSyncedAt: now,
        externalUpdatedAt: parseOptionalDate(body?.updatedAt) || now,
        holdExpiresAt: null,
        rawPayload: body,
      },
    });

    return gygResponse({ success: true });
  } catch (err) {
    console.error("[GYG] cancel-booking error:", err);
    return gygResponse({ success: false, error: err.message });
  }
}

export async function notifyGYGAvailabilityUpdate(activityId) {
  const baseUrl = process.env.GYG_API_BASE || "https://api.getyourguide.com";
  const user = process.env.GYG_OUTGOING_USER;
  const pass = process.env.GYG_OUTGOING_PASS;

  if (!user || !pass) {
    console.warn("[GYG] outgoing credentials are not configured");
    return null;
  }

  const basicAuth = Buffer.from(`${user}:${pass}`).toString("base64");

  try {
    const res = await fetch(`${baseUrl}/1/notify-availability-update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({ activityId }),
    });

    const data = await res.json();
    console.log("[GYG] notify-availability-update →", data);
    return data;
  } catch (err) {
    console.error("[GYG] notify-availability-update error:", err);
    return null;
  }
}

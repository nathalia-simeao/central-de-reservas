/**
 * POST /api/gyg/reserve
 * GYG solicita pré-reserva (hold de vagas por 60 min).
 */
import db from "../db.server";
import {
  checkGygBasicAuth,
  getMoneyFields,
  getParticipantCounts,
  gygResponse,
  parseOptionalDate,
} from "../utils/gyg.server";
import { resolveTourByPlatformId } from "../utils/tour-passport.server";
import { createBookingWithCapacityGuard } from "../utils/capacity.server";

const prisma = db;

export const action = async ({ request }) => {
  if (!checkGygBasicAuth(request)) {
    return gygResponse({ error: "Unauthorized" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return gygResponse({ error: "Invalid JSON" });
  }

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

  try {
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

    const tour = await resolveTourByPlatformId(prisma, "GETYOURGUIDE", activityId);
    if (!tour) {
      return gygResponse({ success: false, error: "Tour not found" });
    }

    const counts = getParticipantCounts(participants);
    const money = getMoneyFields(body);
    const holdExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const now = new Date();

    if (counts.totalParticipants < 1) {
      return gygResponse({
        success: false,
        error: "Invalid participants",
        reason: "At least one participant is required",
      });
    }

    const guardedReservation = await createBookingWithCapacityGuard(prisma, {
      tourId: tour.id,
      startTime,
      platform: "GETYOURGUIDE",
      externalBookingId: bookingId,
      requestedSeats: counts.totalParticipants,
      bookingData: {
        customerName:
          `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() ||
          "GYG Customer",
        customerEmail: customer?.email || null,
        customerPhone: customer?.phone || null,
        language: languageCode || null,
        status: "PENDING",
        bookingRef: bookingId,
        externalBookingId: bookingId,
        externalProductId: activityId,
        externalVariantId: timeslot?.id || body?.variantId || null,
        adults: counts.adults,
        children: counts.children,
        youths: counts.youths,
        seniors: counts.seniors,
        ...money,
        syncStatus: "RECEIVED",
        lastSyncedAt: now,
        externalCreatedAt: parseOptionalDate(body?.createdAt || body?.bookingDate),
        externalUpdatedAt: parseOptionalDate(body?.updatedAt),
        holdExpiresAt,
        rawPayload: body,
      },
    });

    if (!guardedReservation.accepted) {
      return gygResponse({
        success: false,
        error: "Timeslot unavailable",
        reason: guardedReservation.reason,
        vacancies: guardedReservation.availability?.remainingSeats ?? 0,
      });
    }

    return gygResponse({
      success: true,
      reservationId: guardedReservation.booking.id,
      holdUntil: guardedReservation.booking.holdExpiresAt
        ? guardedReservation.booking.holdExpiresAt
            .toISOString()
            .replace("Z", "+00:00")
        : holdExpiresAt.toISOString().replace("Z", "+00:00"),
      vacancies: guardedReservation.availabilityAfter?.remainingSeats ?? null,
      message: guardedReservation.idempotent ? "Already reserved" : undefined,
    });
  } catch (err) {
    console.error("[GYG] reserve error:", err);
    return gygResponse({ success: false, error: err.message });
  }
};

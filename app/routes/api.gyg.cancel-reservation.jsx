/**
 * POST /api/gyg/cancel-reservation
 * GYG cancela uma pré-reserva (PENDING).
 */
import db from "../db.server";
import {
  bookingLookupWhere,
  checkGygBasicAuth,
  gygResponse,
  parseOptionalDate,
} from "../utils/gyg.server";

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
      where: {
        platform: "GETYOURGUIDE",
        ...lookup,
      },
    });

    if (!booking) {
      return gygResponse({ success: true, message: "Already released" });
    }

    if (booking.status === "CANCELED") {
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
};

/**
 * POST /api/gyg/cancel-booking
 * GYG cancela uma reserva confirmada.
 */
import db from "../db.server";
import {
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

    if (!booking) {
      return gygResponse({
        success: true,
        message: "Booking not found — treated as already canceled",
      });
    }

    if (booking.status === "CANCELED") {
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
};

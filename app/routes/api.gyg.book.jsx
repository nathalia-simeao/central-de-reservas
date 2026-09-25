/**
 * POST /api/gyg/book
 * GYG confirma a reserva (PENDING → CONFIRMED).
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
      where: {
        platform: "GETYOURGUIDE",
        ...lookup,
      },
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
};

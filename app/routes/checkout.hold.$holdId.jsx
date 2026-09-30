import db from "../db.server";
import { releaseBookingHold } from "../utils/capacity.server";
import { enqueueAvailabilitySync } from "../utils/sync-queue.server";

function expiredResponse() {
  return new Response(
    "Este link de checkout expirou e as vagas foram liberadas. Gere um novo checkout na Central PMY.",
    {
      status: 410,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

async function notifyAvailability(booking, reason) {
  if (!booking?.tourId || !booking?.startTime) return;

  try {
    await enqueueAvailabilitySync(db, {
      eventId: `checkout-hold:${reason}:${booking.id}`,
      tourId: booking.tourId,
      startTime: booking.startTime,
      sourcePlatform: "CENTRAL",
      aggregateType: "BOOKING",
      aggregateId: booking.id,
      force: true,
      payload: {
        reason,
        holdId: booking.id,
        holdExpiresAt: booking.holdExpiresAt || null,
      },
    });
  } catch (error) {
    console.error("[PMY] secure checkout availability sync failed:", error);
  }
}

export const loader = async ({ params }) => {
  const holdId = String(params.holdId || "").trim();
  if (!holdId) return expiredResponse();

  const hold = await db.booking.findUnique({
    where: { id: holdId },
  });

  if (!hold || hold.status !== "PENDING") {
    return expiredResponse();
  }

  const expiresAt = hold.holdExpiresAt ? new Date(hold.holdExpiresAt) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    const released = await releaseBookingHold(
      db,
      hold.id,
      "checkout_link_expired",
    );
    if (released.released && released.booking) {
      await notifyAvailability(released.booking, "CHECKOUT_HOLD_EXPIRED");
    }
    return expiredResponse();
  }

  const invoiceUrl =
    hold.rawPayload &&
    typeof hold.rawPayload === "object" &&
    !Array.isArray(hold.rawPayload)
      ? String(hold.rawPayload.invoiceUrl || "")
      : "";

  if (!/^https:\/\//i.test(invoiceUrl)) {
    return new Response("Checkout indisponível. Gere um novo link na Central PMY.", {
      status: 409,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: invoiceUrl,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
};

/**
 * POST /api/gyg/reserve
 * GYG solicita pré-reserva (hold de vagas por 60 min)
 */
import db from "../db.server";

const prisma = db;

function checkBasicAuth(request) {
  const authHeader = request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Basic ")) return false;
  const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
  const [user, pass] = decoded.split(":");
  return user === (process.env.GYG_INCOMING_USER || "pmy-api") &&
         pass === (process.env.GYG_INCOMING_PASS || "");
}

function gygResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export const action = async ({ request }) => {
  if (!checkBasicAuth(request)) {
    return gygResponse({ error: "Unauthorized" });
  }

  let body;
  try { body = await request.json(); }
  catch { return gygResponse({ error: "Invalid JSON" }); }

  const { bookingId, activityId, timeslot, participants, customer } = body;

  if (!bookingId || !activityId || !timeslot?.startTime) {
    return gygResponse({ success: false, error: "Missing required fields" });
  }

  try {
    const existing = await prisma.booking.findFirst({ where: { bookingRef: bookingId } });
    if (existing) {
      return gygResponse({ success: true, reservationId: existing.id });
    }

    const tour = await prisma.tour.findFirst({ where: { id: activityId } });
    if (!tour) return gygResponse({ success: false, error: "Tour not found" });

    const reservation = await prisma.booking.create({
      data: {
        tourId:       tour.id,
        customerName: `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() || "GYG Customer",
        startTime:    new Date(timeslot.startTime),
        platform:     "GETYOURGUIDE",
        status:       "PENDING",
        bookingRef:   bookingId,
      },
    });

    return gygResponse({
      success:       true,
      reservationId: reservation.id,
      holdUntil:     new Date(Date.now() + 60 * 60 * 1000).toISOString().replace("Z", "+00:00"),
    });
  } catch (err) {
    console.error("[GYG] reserve error:", err);
    return gygResponse({ success: false, error: err.message });
  }
};
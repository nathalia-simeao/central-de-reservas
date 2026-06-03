/**
 * POST /api/gyg/book
 * GYG confirma a reserva (PENDING → CONFIRMED)
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

  const { reservationId, bookingId } = body;

  try {
    const booking = await prisma.booking.findFirst({
      where: { OR: [{ id: reservationId }, { bookingRef: bookingId }] },
    });

    if (!booking) return gygResponse({ success: false, error: "Reservation not found" });
    if (booking.status === "CONFIRMED") return gygResponse({ success: true, message: "Already confirmed" });

    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED" } });
    return gygResponse({ success: true });
  } catch (err) {
    console.error("[GYG] book error:", err);
    return gygResponse({ success: false, error: err.message });
  }
};
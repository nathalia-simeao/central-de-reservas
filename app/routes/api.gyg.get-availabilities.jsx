/**
 * GET /api/gyg/get-availabilities
 * GYG consulta disponibilidade do tour
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

export const loader = async ({ request }) => {
  if (!checkBasicAuth(request)) {
    return gygResponse({ error: "Unauthorized" });
  }

  const url = new URL(request.url);
  const activityId = url.searchParams.get("activity_id");
  const dateFrom   = url.searchParams.get("date_from");
  const dateTo     = url.searchParams.get("date_to");

  if (!activityId) {
    return gygResponse({ error: "activity_id is required", availabilities: [] });
  }

  try {
    const tour = await prisma.tour.findFirst({
      where: { id: activityId },
    });

    if (!tour) {
      return gygResponse({ availabilities: [] });
    }

    const from = dateFrom ? new Date(dateFrom) : new Date();
    const to   = dateTo   ? new Date(dateTo + "T23:59:59") : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const confirmedBookings = await prisma.booking.findMany({
      where: {
        tourId: tour.id,
        status: "CONFIRMED",
        startTime: { gte: from, lte: to },
      },
    });

    const MAX_CAPACITY = 20;
    const DEFAULT_TIMES = ["09:00", "14:00"];
    const availabilities = [];
    const cursor = new Date(from);

    while (cursor <= to) {
      const dateStr = cursor.toISOString().split("T")[0];
      for (const time of DEFAULT_TIMES) {
        const [hh, mm] = time.split(":").map(Number);
        const slotStart = new Date(cursor);
        slotStart.setHours(hh, mm, 0, 0);

        const occupied = confirmedBookings.filter(b => {
          const bt = new Date(b.startTime);
          return bt.toISOString().startsWith(dateStr) &&
                 bt.getHours() === hh && bt.getMinutes() === mm;
        }).length;

        const available = MAX_CAPACITY - occupied;
        if (available > 0) {
          availabilities.push({
            datetime: slotStart.toISOString().replace("Z", "+00:00"),
            vacancies: available,
            pricing: [
              { category: "ADULT",  price: { amount: 50, currency: "EUR" } },
              { category: "YOUTH",  price: { amount: 35, currency: "EUR" } },
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
};
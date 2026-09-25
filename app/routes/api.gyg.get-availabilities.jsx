/**
 * GET /api/gyg/get-availabilities
 * GYG consulta disponibilidade do tour.
 */
import db from "../db.server";
import {
  bookingOccupancy,
  checkGygBasicAuth,
  gygResponse,
} from "../utils/gyg.server";
import { resolveTourByPlatformId } from "../utils/tour-passport.server";
import { blockMatchesCalendarSlot, getActiveAvailabilityBlocks } from "../utils/availability.server";

const prisma = db;

export const loader = async ({ request }) => {
  if (!checkGygBasicAuth(request)) {
    return gygResponse({ error: "Unauthorized" });
  }

  const url = new URL(request.url);
  const activityId = url.searchParams.get("activity_id");
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");

  if (!activityId) {
    return gygResponse({ error: "activity_id is required", availabilities: [] });
  }

  try {
    const tour = await resolveTourByPlatformId(prisma, "GETYOURGUIDE", activityId);

    if (!tour) {
      return gygResponse({ availabilities: [] });
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

    const availabilityBlocks = await getActiveAvailabilityBlocks(prisma, tour.id);

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

        const blocked = availabilityBlocks.some((block) =>
          blockMatchesCalendarSlot(block, {
            tourId: tour.id,
            dateKey: dateStr,
            timeKey: time,
            platform: "getyourguide",
          }),
        );

        if (blocked) continue;

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
};

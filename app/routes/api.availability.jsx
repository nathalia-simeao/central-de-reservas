/**
 * Central availability API.
 *
 * This is the single read endpoint that storefront/channel adapters can consult
 * before offering a PMY tour slot.
 *
 * GET /api/availability?platform=shopify&product_id=<external-id>&date=YYYY-MM-DD&time=HH:MM&quantity=4
 */
import db from "../db.server";
import { getActiveAvailabilityBlocks, normalizePlatform } from "../utils/availability.server";
import { calculateAvailabilityForCalendarSlotFromLoaded, getCentralAvailability } from "../utils/capacity.server";
import { resolveTourByPlatformId } from "../utils/tour-passport.server";

const prisma = db;

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const platform = normalizePlatform(url.searchParams.get("platform") || "shopify");
  const productId =
    url.searchParams.get("product_id") ||
    url.searchParams.get("activity_id") ||
    url.searchParams.get("tour_id");
  const datetime = url.searchParams.get("datetime");
  const dateKey = url.searchParams.get("date");
  const timeKey = url.searchParams.get("time");

  if (!productId || (!datetime && !(dateKey && timeKey))) {
    return response(
      {
        available: false,
        error: "product_id/tour_id plus datetime or date+time are required",
      },
      400,
    );
  }

  let startTime = null;
  if (datetime) {
    startTime = new Date(datetime);
    if (Number.isNaN(startTime.getTime())) {
      return response({ available: false, error: "Invalid datetime" }, 400);
    }
  }

  try {
    const tour = await resolveTourByPlatformId(prisma, platform, productId);
    if (!tour) {
      return response({ available: false, error: "Tour not found" }, 404);
    }

    const requestedSeats = Math.max(
      0,
      Number.parseInt(url.searchParams.get("quantity") || "0", 10) || 0,
    );

    let availability;
    if (startTime) {
      availability = await getCentralAvailability(prisma, {
        tourId: tour.id,
        startTime,
        platform,
        requestedSeats,
      });
    } else {
      const dayStart = new Date(`${dateKey}T00:00:00.000Z`);
      if (Number.isNaN(dayStart.getTime()) || !/^\d{1,2}:\d{2}$/.test(timeKey || "")) {
        return response({ available: false, error: "Invalid date or time" }, 400);
      }

      const bookings = await prisma.booking.findMany({
        where: {
          tourId: tour.id,
          status: { in: ["CONFIRMED", "PENDING"] },
          startTime: {
            gte: new Date(dayStart.getTime() - 3 * 60 * 60 * 1000),
            lte: new Date(dayStart.getTime() + 27 * 60 * 60 * 1000),
          },
        },
      });
      const blocks = await getActiveAvailabilityBlocks(prisma, tour.id);

      availability = calculateAvailabilityForCalendarSlotFromLoaded({
        tour,
        bookings,
        blocks,
        dateKey,
        timeKey,
        platform,
        requestedSeats,
      });
    }

    const blockingRule = availability.blockingRule;

    return response({
      available: availability.available,
      canAccept: availability.canAccept,
      blocked: availability.blocked,
      tourId: tour.id,
      platform,
      datetime: startTime ? startTime.toISOString() : null,
      date: availability.date,
      time: availability.time,
      capacity: availability.capacity,
      occupiedSeats: availability.occupiedSeats,
      remainingSeats: availability.remainingSeats,
      requestedSeats: availability.requestedSeats,
      block: blockingRule
        ? {
            id: blockingRule.id,
            timeSlot: blockingRule.timeSlot,
            date: blockingRule.date,
            dayOfWeek: blockingRule.dayOfWeek,
            reason: blockingRule.reason,
          }
        : null,
    });
  } catch (error) {
    console.error("[PMY] central availability error:", error);
    return response({ available: false, error: "Availability check failed" }, 500);
  }
};

export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  return response({ error: "Method not allowed" }, 405);
};

/**
 * Central availability API.
 *
 * This is the single read endpoint that storefront/channel adapters can consult
 * before offering a PMY tour slot.
 *
 * GET /api/availability?platform=shopify&product_id=<external-id>&datetime=<ISO-8601>
 */
import db from "../db.server";
import { findBlockingRule, normalizePlatform } from "../utils/availability.server";
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

  if (!productId || !datetime) {
    return response(
      {
        available: false,
        error: "product_id/tour_id and datetime are required",
      },
      400,
    );
  }

  const startTime = new Date(datetime);
  if (Number.isNaN(startTime.getTime())) {
    return response({ available: false, error: "Invalid datetime" }, 400);
  }

  try {
    const tour = await resolveTourByPlatformId(prisma, platform, productId);
    if (!tour) {
      return response({ available: false, error: "Tour not found" }, 404);
    }

    const blockingRule = await findBlockingRule(prisma, {
      tourId: tour.id,
      startTime,
      platform,
    });

    return response({
      available: !blockingRule,
      blocked: Boolean(blockingRule),
      tourId: tour.id,
      platform,
      datetime: startTime.toISOString(),
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

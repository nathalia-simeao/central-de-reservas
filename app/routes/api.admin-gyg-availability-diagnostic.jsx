import { authenticate } from "../shopify.server";
import db from "../db.server";
import { resolveGygProduct, gygProductScheduleSlots } from "../utils/gyg-product-options.server";
import { getActiveAvailabilityBlocks, blockMatchesCalendarSlot } from "../utils/availability.server";
import { calculateAvailabilityForCalendarSlotFromLoaded } from "../utils/capacity.server";
import { getGygAvailabilities } from "../utils/gyg-v1.server";

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

// Admin-only, read-only diagnosis. No secrets, customer data or booking IDs returned.
export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const params = new URL(request.url).searchParams;
  const productId = params.get("productId");
  const date = params.get("date");
  if (!productId || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date || "")) {
    return json({ error: "Provide productId and date=YYYY-MM-DD" }, 400);
  }
  const product = await resolveGygProduct(db, productId);
  if (!product) return json({ error: "Unknown product" }, 404);
  const tour = product.tour;
  const slots = gygProductScheduleSlots(product);
  const timezone = tour.timezone || "Europe/Lisbon";
  const blocks = await getActiveAvailabilityBlocks(db, tour.id);
  const start = new Date(date + "T00:00:00Z");
  const end = new Date(new Date(date + "T00:00:00Z").getTime() + 2 * 86400000);
  const bookings = await db.booking.findMany({
    where: { tourId: tour.id, status: { in: ["CONFIRMED", "PENDING"] }, startTime: { gte: start, lte: end } },
  });
  const slotResults = slots.map(timeKey => {
    const ruleMatches = blocks.filter(block => blockMatchesCalendarSlot(block, {
      tourId: tour.id, dateKey: date, timeKey, platform: "getyourguide",
    }));
    const calculation = calculateAvailabilityForCalendarSlotFromLoaded({
      tour, bookings, blocks, dateKey: date, timeKey, platform: "getyourguide",
    });
    return { timeKey, matchingBlockIds: ruleMatches.map(r => r.id), blocked: calculation.blocked, remainingSeats: calculation.remainingSeats };
  });
  // Execute the same business handler as GET /1/get-availabilities, without HTTP auth bypass:
  // only this Shopify-authenticated administrator can call the diagnostic.
  const response = await getGygAvailabilities({
    productId,
    fromDateTime: date + "T00:00:00+00:00",
    toDateTime: date + "T23:59:59+00:00",
  });
  const payload = await response.json();
  return json({
    productId, tourId: tour.id, timezone, date, slots: slotResults,
    apiResponse: payload?.data?.availabilities?.map(a => ({
      dateTime: a.dateTime, vacancies: a.vacancies, productId: a.productId,
    })) || [],
    apiError: payload.errorCode || null,
  });
};

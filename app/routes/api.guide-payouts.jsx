import { excludeTestBookingsWhere } from "../utils/test-bookings.js";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { requireCentralAdmin } from "../utils/central-access.server.js";
import { computeGuidePayouts, lisbonMonthRange } from "../utils/guide-payouts.js";

// Fechamento mensal dos guias (só administradores).
export const loader = async ({ request }) => {
  const { auth } = await requireCentralAdmin(db, authenticate, request);
  const month = new URL(request.url).searchParams.get("month") || "";
  const range = lisbonMonthRange(month);
  if (!range) return Response.json({ success: false, error: "Mês inválido (use AAAA-MM)." }, { status: 400 });

  const assignments = await db.guideAssignment.findMany({
    where: { status: "ASSIGNED", startTime: { gte: range.start, lt: range.end } },
    include: { tour: { select: { title: true } }, guide: { select: { id: true, name: true } } },
    orderBy: { startTime: "asc" },
  });
  const tourIds = [...new Set(assignments.map((a) => a.tourId))];
  const [bookings, departures, settings] = await Promise.all([
    tourIds.length
      ? db.booking.findMany({
          where: { tourId: { in: tourIds }, status: "CONFIRMED", startTime: { gte: range.start, lt: range.end }, AND: [excludeTestBookingsWhere()] },
          select: {
            tourId: true, startTime: true, status: true, language: true, groupGuideId: true, attendanceStatus: true,
            adults: true, children: true, youths: true, seniors: true, totalParticipants: true,
          },
        })
      : [],
    tourIds.length
      ? db.tourDeparture.findMany({
          where: { tourId: { in: tourIds }, startTime: { gte: range.start, lt: range.end } },
          select: { tourId: true, startTime: true, checkEndAt: true },
        })
      : [],
    auth.session?.shop
      ? db.businessSetting.findUnique({ where: { shop: auth.session.shop }, select: { costSettings: true } })
      : null,
  ]);

  const ended = new Map(departures.map((d) => [`${d.tourId}|${d.startTime.toISOString()}`, d.checkEndAt]));
  const withChecks = assignments.map((a) => ({ ...a, checkEndAt: ended.get(`${a.tourId}|${a.startTime.toISOString()}`) || null }));
  const result = computeGuidePayouts({ assignments: withChecks, bookings, costSettings: settings?.costSettings || null });
  return Response.json({ success: true, month, ...result });
};

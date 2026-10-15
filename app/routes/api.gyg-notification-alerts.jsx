import { data } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const events = await db.integrationEvent.findMany({
    where: { provider: "GETYOURGUIDE", topic: "notify-product-deactivation" },
    orderBy: { processedAt: "desc" },
    take: 30,
    select: { id: true, processedAt: true, receivedAt: true, payload: true },
  });
  const productIds = [...new Set(events.map((event) => String(event.payload?.productId || "")).filter(Boolean))];
  const [options, tours] = await Promise.all([
    db.gygProductOption.findMany({
      where: { id: { in: productIds } },
      select: { id: true, tour: { select: { title: true } } },
    }),
    db.tour.findMany({
      where: { OR: [{ id: { in: productIds } }, { gygActivityId: { in: productIds } }] },
      select: { id: true, gygActivityId: true, title: true },
    }),
  ]);
  const names = new Map(options.map((item) => [item.id, item.tour.title]));
  for (const tour of tours) {
    names.set(tour.id, tour.title);
    if (tour.gygActivityId) names.set(tour.gygActivityId, tour.title);
  }
  return data({
    success: true,
    alerts: events.map((event) => ({
      id: event.id,
      productId: String(event.payload?.productId || ""),
      tourTitle: names.get(String(event.payload?.productId || "")) || null,
      receivedAt: event.processedAt || event.receivedAt,
      type: "PRODUCT_DEACTIVATION",
    })),
  });
};

import { data } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const events = await db.integrationEvent.findMany({
    where: { provider: "GETYOURGUIDE", topic: "notify-product-deactivation" },
    orderBy: { processedAt: "desc" },
    take: 30,
    select: { id: true, processedAt: true, receivedAt: true, payload: true, result: true },
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
    alerts: events.filter((event) => !event.result?.dismissedAt).map((event) => ({
      id: event.id,
      productId: String(event.payload?.productId || ""),
      tourTitle: names.get(String(event.payload?.productId || "")) || null,
      receivedAt: event.processedAt || event.receivedAt,
      type: "PRODUCT_DEACTIVATION",
      read: Boolean(event.result?.readAt),
    })),
  });
};

export const action = async ({ request }) => {
  await authenticate.admin(request);
  const form = await request.formData();
  const op = String(form.get("_action") || "");
  if (!["read", "dismiss"].includes(op)) return data({ success: false, error: "INVALID_ACTION" }, { status: 400 });
  const ids = String(form.get("ids") || "").split(",").map((id) => id.trim()).filter(Boolean).slice(0, 30);
  if (!ids.length || ids.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) return data({ success: false, error: "INVALID_IDS" }, { status: 400 });
  const records = await db.integrationEvent.findMany({
    where: { id: { in: ids }, provider: "GETYOURGUIDE", topic: "notify-product-deactivation" },
    select: { id: true, result: true },
  });
  const at = new Date().toISOString();
  await db.$transaction(records.map((item) => db.integrationEvent.update({
    where: { id: item.id },
    data: { result: { ...(item.result && typeof item.result === "object" && !Array.isArray(item.result) ? item.result : {}),
      ...(op === "read" ? { readAt: at } : { dismissedAt: at, readAt: at }) } },
  })));
  return data({ success: true, updated: records.length });
};

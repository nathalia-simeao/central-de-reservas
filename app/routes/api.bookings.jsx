import { data } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";

const json = (body, init) => data(body, init);

function parseDate(value, fallback) {
  const parsed = new Date(String(value || ""));
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  const url = new URL(request.url);
  const now = new Date();
  const fallbackStart = new Date(now);
  fallbackStart.setDate(fallbackStart.getDate() - 30);
  const fallbackEnd = new Date(now);
  fallbackEnd.setDate(fallbackEnd.getDate() + 30);

  const start = parseDate(url.searchParams.get("start"), fallbackStart);
  const end = parseDate(url.searchParams.get("end"), fallbackEnd);

  if (end < start) {
    return json(
      { success: false, error: "O período informado é inválido." },
      { status: 400 },
    );
  }

  const maxRangeMs = 370 * 24 * 60 * 60 * 1000;
  if (end.getTime() - start.getTime() > maxRangeMs) {
    return json(
      {
        success: false,
        error: "Consulte no máximo 370 dias por vez.",
      },
      { status: 400 },
    );
  }

  const page = Math.max(
    1,
    Number.parseInt(url.searchParams.get("page") || "1", 10) || 1,
  );
  const pageSize = Math.min(
    200,
    Math.max(
      25,
      Number.parseInt(url.searchParams.get("pageSize") || "100", 10) || 100,
    ),
  );

  // O dashboard também precisa das próximas saídas, independentemente do
  // período histórico selecionado.
  const upcomingEnd = new Date(now);
  upcomingEnd.setDate(upcomingEnd.getDate() + 30);

  const where = {
    OR: [
      { createdAt: { gte: start, lte: end } },
      { externalCreatedAt: { gte: start, lte: end } },
      { updatedAt: { gte: start, lte: end } },
      { externalUpdatedAt: { gte: start, lte: end } },
      { startTime: { gte: start, lte: end } },
      { startTime: { gte: now, lte: upcomingEnd } },
    ],
  };

  const [items, total] = await Promise.all([
    db.booking.findMany({
      where,
      orderBy: [{ startTime: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.booking.count({ where }),
  ]);

  return json({
    success: true,
    items,
    page: {
      current: page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
      start: start.toISOString(),
      end: end.toISOString(),
    },
  });
};

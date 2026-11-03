import db from "../db.server";
import { getGuideFromRequest, redirectTo } from "../utils/guide-portal.server";

// Download de um ingresso/arquivo da saída — só para o guia escalado nela.
export const loader = async ({ request, params }) => {
  const guide = await getGuideFromRequest(db, request);
  if (!guide) return redirectTo("/guia/login");

  const file = await db.departureAttachment.findUnique({
    where: { id: String(params.id || "") },
    include: { departure: { select: { tourId: true, startTime: true } } },
  });
  if (!file) return new Response("Arquivo não encontrado.", { status: 404 });

  const start = new Date(file.departure.startTime);
  const assigned = await db.guideAssignment.findFirst({
    where: {
      guideId: guide.id,
      status: "ASSIGNED",
      tourId: file.departure.tourId,
      startTime: { gte: new Date(start.getTime() - 60000), lte: new Date(start.getTime() + 60000) },
    },
    select: { id: true },
  });
  if (!assigned) return new Response("Sem acesso a este arquivo.", { status: 403 });

  return new Response(file.data, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.size),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
};

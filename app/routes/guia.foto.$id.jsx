// Foto que a pessoa escolheu no app (Perfil). Só para quem está logado no app.
import db from "../db.server";
import { getGuideFromRequest } from "../utils/guide-portal.server";

export const loader = async ({ request, params }) => {
  const viewer = await getGuideFromRequest(db, request).catch(() => null);
  if (!viewer) return new Response("Não autorizado.", { status: 401 });
  const row = await db.guide.findUnique({
    where: { id: String(params.id || "") },
    select: { portalPhoto: true, portalPhotoType: true },
    omit: { portalPhoto: false },
  });
  if (!row?.portalPhoto || !row.portalPhotoType) return new Response("Sem foto.", { status: 404 });
  return new Response(row.portalPhoto, {
    headers: {
      "Content-Type": row.portalPhotoType,
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
};

import db from "../db.server";
import { getGuideFromRequest } from "../utils/guide-portal.server";
import { authenticateCentral } from "../utils/central-auth.server";

// Arquivo de um "Documento de suporte" do Quadro (passe Jerónimos, voucher...).
// Guias logados no app baixam os documentos marcados como visíveis para guias;
// a equipe da Central (Shopify ou app de adm) baixa todos.
export const loader = async ({ request, params }) => {
  const file = await db.supportCardAttachment.findUnique({
    where: { id: String(params.id || "") },
    include: { card: { select: { visibleToGuides: true } } },
  });

  const guide = await getGuideFromRequest(db, request).catch(() => null);
  if (!guide) await authenticateCentral(request);
  if (!file) return new Response("Arquivo não encontrado.", { status: 404 });
  if (guide && !file.card.visibleToGuides) {
    // Adm logado pelo app também passa por aqui como "guia": confere o perfil.
    const { portalAdminFromRequest } = await import("../utils/central-auth.server");
    if (!(await portalAdminFromRequest(request))) return new Response("Sem acesso a este arquivo.", { status: 403 });
  }

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

import db from "../db.server";
import { authenticateCentral } from "../utils/central-auth.server";

// Abre um ingresso/arquivo da saída dentro da Central (Quadro e Agenda).
// Guias usam /guia/anexo/:id, que confere se estão escalados na saída.
export const loader = async ({ request, params }) => {
  await authenticateCentral(request);
  const file = await db.departureAttachment.findUnique({ where: { id: String(params.id || "") } });
  if (!file) return new Response("Arquivo não encontrado.", { status: 404 });
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

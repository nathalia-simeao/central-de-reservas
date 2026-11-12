import { Buffer } from "node:buffer";
import db from "../db.server";
import { checkImportToken } from "../utils/import-tokens.server";
import { ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES, safeFileName } from "../utils/guide-portal.server";
import { saveTrelloFile } from "../services/trello-files.server";

// Recebe um anexo baixado do Trello (o navegador da pessoa, logado no Trello,
// envia direto daqui do trello.com). Só aceita com o código de 30 minutos que
// um administrador gera na Central.
const ORIGIN = "https://trello.com";
const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "X-Import-Token",
  "Access-Control-Max-Age": "600",
  Vary: "Origin",
};
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

export const loader = async ({ request }) => (request.method === "OPTIONS" ? new Response(null, { status: 204, headers: cors }) : reply({ error: "Use POST." }, 405));

export const action = async ({ request }) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const entry = checkImportToken(request.headers.get("x-import-token"));
  if (!entry) return reply({ error: "Código de envio inválido ou vencido." }, 401);
  try {
    const form = await request.formData();
    const file = form.get("file");
    const trelloCardId = String(form.get("trelloCardId") || "").slice(0, 64);
    const url = String(form.get("url") || "").slice(0, 1000);
    const mimeType = String(form.get("mimeType") || file?.type || "").toLowerCase();
    if (!trelloCardId || !file || typeof file.arrayBuffer !== "function") return reply({ error: "Arquivo inválido." }, 400);
    if (!ALLOWED_ATTACHMENT_TYPES.has(mimeType)) return reply({ error: `Tipo não aceito: ${mimeType}` }, 400);
    if (!file.size || file.size > MAX_ATTACHMENT_BYTES) return reply({ error: "Arquivo vazio ou maior que 8 MB." }, 400);
    const result = await saveTrelloFile({
      prisma: db,
      trelloCardId,
      url,
      fileName: safeFileName(form.get("fileName") || file.name),
      mimeType,
      bytes: Buffer.from(await file.arrayBuffer()),
      by: entry.by || "Trello",
    });
    return reply({ success: true, ...result });
  } catch (e) {
    console.error("[PMY] trello-file error:", e);
    return reply({ error: "Não foi possível salvar o arquivo." }, 500);
  }
};

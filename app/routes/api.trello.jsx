import { data } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { requireCentralAdmin } from "../utils/central-access.server.js";
import {
  integrationEncryptionReady,
  removeIntegrationCredentials,
  storeIntegrationCredentials,
  updateIntegrationValidation,
  getSafeIntegrationSecretStatus,
} from "../utils/integration-secrets.server";
import { TRELLO_PROVIDER, downloadTrelloAttachment, fetchTrelloBoard, testTrello, trelloBoardId, trelloCredentials } from "../utils/trello-api.server";
import { ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES, safeFileName } from "../utils/guide-portal.server";
import { saveTrelloFile } from "../services/trello-files.server";

// Integrações → Trello: chave + token (criptografados), teste, leitura do
// quadro para a importação e download dos anexos para dentro da Central.
const json = (body, init) => data(body, init);
const clean = (v) => String(v ?? "").trim();

async function status() {
  const record = await getSafeIntegrationSecretStatus(db, TRELLO_PROVIDER).catch(() => null);
  return {
    encryptionReady: integrationEncryptionReady(),
    configured: Boolean(record?.hasCredential),
    boardUrl: record?.metadata?.boardUrl || null,
    member: record?.metadata?.member || null,
    boardName: record?.metadata?.boardName || null,
    lastMessage: record?.lastValidationMessage || null,
    lastStatus: record?.lastValidationStatus || null,
  };
}

/** Todos os anexos que ainda estão como link do Trello (documentos de suporte e observações das saídas). */
async function pendingLinks() {
  const out = [];
  const support = await db.supportCard.findMany({ where: { NOT: { trelloId: null } }, select: { trelloId: true, links: true } });
  for (const card of support) for (const link of Array.isArray(card.links) ? card.links : []) out.push({ trelloCardId: card.trelloId, url: link.url, name: link.name });
  const departures = await db.tourDeparture.findMany({ where: { startTime: { gte: new Date(Date.now() - 90 * 24 * 3600 * 1000) } }, select: { guideNotes: true } });
  for (const d of departures) {
    for (const n of Array.isArray(d.guideNotes) ? d.guideNotes : []) {
      if (n?.source !== "trello") continue;
      for (const line of String(n.text || "").split("\n")) {
        const m = line.match(/^• (.+?): (https:\/\/trello\.com\/\S+)$/);
        if (m) out.push({ trelloCardId: n.trelloId, url: m[2], name: m[1] });
      }
    }
  }
  const seen = new Set();
  return out.filter((l) => /^https:\/\/trello\.com\//.test(l.url) && !seen.has(`${l.trelloCardId}|${l.url}`) && seen.add(`${l.trelloCardId}|${l.url}`));
}

export const loader = async ({ request }) => {
  await requireCentralAdmin(db, authenticate, request);
  const url = new URL(request.url);
  if (url.searchParams.get("board") === "1") {
    const creds = await trelloCredentials(db);
    if (!creds) return json({ success: false, error: "Conecte o Trello em Integrações primeiro." }, { status: 409 });
    try {
      return json({ success: true, board: await fetchTrelloBoard(creds) });
    } catch (e) {
      return json({ success: false, error: e.message }, { status: 502 });
    }
  }
  return json({ success: true, ...(await status()), pending: (await pendingLinks()).length });
};

export const action = async ({ request }) => {
  const { user: centralUser } = await requireCentralAdmin(db, authenticate, request);
  const form = await request.formData();
  const intent = clean(form.get("intent"));

  if (intent === "remove") {
    await removeIntegrationCredentials(db, TRELLO_PROVIDER);
    return json({ success: true, ...(await status()) });
  }

  if (intent === "save") {
    if (!integrationEncryptionReady()) return json({ success: false, error: "Armazenamento criptografado não está pronto (INTEGRATION_ENCRYPTION_KEY)." }, { status: 503 });
    const current = await trelloCredentials(db);
    const apiKey = clean(form.get("apiKey")) || current?.apiKey || "";
    const token = clean(form.get("token")) || current?.token || "";
    const boardUrl = clean(form.get("boardUrl"));
    const boardId = trelloBoardId(boardUrl) || current?.boardId || null;
    if (!/^[a-f0-9]{32}$/i.test(apiKey)) return json({ success: false, error: "A API key do Trello tem 32 letras/números. Confira e cole de novo." }, { status: 400 });
    if (token.length < 32) return json({ success: false, error: "Cole o Token (código longo que aparece depois de clicar em Permitir)." }, { status: 400 });
    if (!boardId) return json({ success: false, error: "Cole o link do quadro (ex.: https://trello.com/b/TVDR11Il/...)." }, { status: 400 });
    let result;
    try {
      result = await testTrello({ apiKey, token, boardId });
    } catch (e) {
      return json({ success: false, error: e.message }, { status: 400 });
    }
    await storeIntegrationCredentials(db, {
      provider: TRELLO_PROVIDER,
      credentials: { apiKey, token, boardId },
      environment: "live",
      status: "CONNECTED",
      metadata: { boardUrl: boardUrl || `https://trello.com/b/${boardId}`, member: result.member, boardName: result.board, savedBy: centralUser?.name || null },
      validation: { status: "CONNECTED", message: `Conectado como ${result.member} · quadro "${result.board}".` },
    });
    return json({ success: true, ...(await status()) });
  }

  if (intent === "downloadFiles") {
    const creds = await trelloCredentials(db);
    if (!creds) return json({ success: false, error: "Conecte o Trello primeiro." }, { status: 409 });
    const links = await pendingLinks();
    const summary = { total: links.length, saved: 0, skipped: [], failed: [] };
    for (const link of links.slice(0, 80)) {
      try {
        const file = await downloadTrelloAttachment(creds, link.url, link.name);
        if (!ALLOWED_ATTACHMENT_TYPES.has(file.mimeType)) { summary.skipped.push(`${link.name}: tipo ${file.mimeType} não aceito`); continue; }
        if (file.bytes.length > MAX_ATTACHMENT_BYTES) { summary.skipped.push(`${link.name}: maior que 8 MB`); continue; }
        const r = await saveTrelloFile({ prisma: db, trelloCardId: link.trelloCardId, url: link.url, fileName: safeFileName(link.name || file.fileName), mimeType: file.mimeType, bytes: file.bytes, by: "Trello" });
        summary.saved += r.saved;
      } catch (e) {
        summary.failed.push(`${link.name}: ${e.message}`);
        if (e.status === 401) break;
      }
    }
    await updateIntegrationValidation(db, TRELLO_PROVIDER, { status: "CONNECTED", message: `Anexos: ${summary.saved} baixados, ${summary.skipped.length} ignorados, ${summary.failed.length} com erro.` }).catch(() => {});
    return json({ success: true, summary, ...(await status()), pending: (await pendingLinks()).length });
  }

  return json({ success: false, error: "Ação inválida." }, { status: 400 });
};

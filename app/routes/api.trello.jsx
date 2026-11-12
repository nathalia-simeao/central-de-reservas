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
import { TRELLO_PROVIDER, fetchTrelloBoard, testTrello, trelloBoardId, trelloCredentials } from "../utils/trello-api.server";
import { downloadPendingTrelloFiles, pendingTrelloLinks, readTrelloSync, runTrelloSync, saveTrelloSync } from "../services/trello-sync.server";
import { assignGuideToDeparture } from "../services/central-route.server";

const pendingLinks = () => pendingTrelloLinks(db);

// Integrações → Trello: chave + token (criptografados), teste, leitura do
// quadro para a importação e download dos anexos para dentro da Central.
const json = (body, init) => data(body, init);
const clean = (v) => String(v ?? "").trim();

async function syncStatus() {
  const { config } = await readTrelloSync(db).catch(() => ({ config: null }));
  if (!config) return null;
  const { mapping, ...rest } = config;
  const guides = await db.guide.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }).catch(() => []);
  return { ...rest, mappedTours: Object.keys(mapping).length, guides };
}

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
    sync: await syncStatus(),
  };
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
    const summary = await downloadPendingTrelloFiles(db, creds, { limit: 80 });
    await updateIntegrationValidation(db, TRELLO_PROVIDER, { status: "CONNECTED", message: `Anexos: ${summary.saved} baixados, ${summary.skipped.length} ignorados, ${summary.failed.length} com erro.` }).catch(() => {});
    return json({ success: true, summary, ...(await status()), pending: (await pendingLinks()).length });
  }

  // Leitura automática a cada 1 hora: ligar/desligar (com a ligação cartão → passeio
  // salva neste navegador na última importação) e "Ler agora".
  if (intent === "syncSettings") {
    const enabled = clean(form.get("enabled")) === "true";
    let mapping;
    try { mapping = JSON.parse(String(form.get("mapping") || "null")); } catch { mapping = null; }
    const patch = { enabled };
    if (mapping && typeof mapping === "object" && Object.keys(mapping).length) patch.mapping = mapping;
    const next = await saveTrelloSync(db, patch);
    if (enabled && !Object.keys(next.mapping).length) {
      await saveTrelloSync(db, { enabled: false });
      return json({ success: false, error: "Faça uma importação pelo Quadro (Importar do Trello) para ligar os cartões aos passeios." }, { status: 409 });
    }
    return json({ success: true, ...(await status()) });
  }

  // Apelidos do Trello: { "dee": guideId }.
  if (intent === "saveAliases") {
    let aliases;
    try { aliases = JSON.parse(String(form.get("aliases") || "{}")); } catch { aliases = null; }
    if (!aliases || typeof aliases !== "object" || Array.isArray(aliases)) return json({ success: false, error: "Apelidos inválidos." }, { status: 400 });
    await saveTrelloSync(db, { aliases: Object.fromEntries(Object.entries(aliases).slice(0, 60)) });
    return json({ success: true, ...(await status()) });
  }

  if (intent === "syncNow") {
    const result = await runTrelloSync(db, {
      force: true,
      assignGuide: ({ tour, guide, startTime, languages }) => assignGuideToDeparture({ tour, guide, startTime, languages }),
    });
    if (result?.skipped === "no-mapping") return json({ success: false, error: "Faça uma importação pelo Quadro (Importar do Trello) para ligar os cartões aos passeios." }, { status: 409 });
    if (!result?.ok) return json({ success: false, error: result?.error || "Falha ao ler o Trello." }, { status: 502 });
    return json({ success: true, ...(await status()), pending: (await pendingLinks()).length });
  }

  return json({ success: false, error: "Ação inválida." }, { status: 400 });
};

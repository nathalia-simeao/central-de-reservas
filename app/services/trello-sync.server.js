// Leitura automática do Trello (pedido da Nathalia, 12/11/2026): enquanto a equipe
// ainda usa o Trello, a Central lê o quadro sozinha uma vez por dia (a partir das 6h
// de Lisboa; pedido do Renan, 13/11/2026 — antes era a cada 1 hora) e atualiza as
// saídas (checklists, descrições, guias), os documentos de suporte e baixa os
// anexos novos. Só Trello → Central: o que muda só na Central não volta ao Trello.
//
// A ligação "cartão do Trello → passeio da Central" é a mesma escolhida na tela
// de importação; fica salva em BusinessSetting.trelloSync.

import { normalizeText, parseTrelloBoard } from "../utils/trello-import.js";
import { downloadTrelloAttachment, fetchTrelloBoard, trelloCredentials } from "../utils/trello-api.server.js";
import { ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES, safeFileName } from "../utils/guide-portal.server.js";
import { importTrelloPlan } from "./trello-import.server.js";
import { saveTrelloFile } from "./trello-files.server.js";

export const TRELLO_SYNC_DAILY_HOUR = 6; // hora de Lisboa a partir da qual roda a leitura do dia

function lisbonDay(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
    .formatToParts(date).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return { key: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

/** Já está na hora da leitura de hoje? (uma por dia, depois das 6h de Lisboa) */
export function trelloDailyDue(lastRunAt, now = new Date()) {
  const today = lisbonDay(now);
  if (today.hour < TRELLO_SYNC_DAILY_HOUR) return false;
  if (!lastRunAt) return true;
  return lisbonDay(new Date(lastRunAt)).key !== today.key;
}
const MAX_WARNINGS = 30;

const asText = (value, max = 200) => String(value ?? "").trim().slice(0, max);

export function normalizeTrelloSync(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const mapping = {};
  for (const [key, value] of Object.entries(source.mapping && typeof source.mapping === "object" ? source.mapping : {})) {
    const k = asText(key, 200);
    const v = asText(value, 64);
    if (k && v) mapping[k] = v;
  }
  const aliases = {};
  for (const [key, value] of Object.entries(source.aliases && typeof source.aliases === "object" ? source.aliases : {})) {
    const k = normalizeText(key).trim();
    const v = asText(value, 64);
    if (k && v) aliases[k] = v;
  }
  return {
    enabled: source.enabled === true,
    aliases,
    mapping,
    includeFlagged: source.includeFlagged === true,
    assignGuides: source.assignGuides !== false,
    lastRunAt: source.lastRunAt || null,
    lastOkAt: source.lastOkAt || null,
    lastError: source.lastError ? asText(source.lastError, 500) : null,
    lastSummary: source.lastSummary && typeof source.lastSummary === "object" ? source.lastSummary : null,
  };
}

/** Configuração da loja (uma linha de BusinessSetting; usa a mais antiga). */
export async function readTrelloSync(prisma) {
  const row = await prisma.businessSetting.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true, trelloSync: true } });
  return { row, config: normalizeTrelloSync(row?.trelloSync) };
}

export async function saveTrelloSync(prisma, patch, { shop = null } = {}) {
  const { row, config } = await readTrelloSync(prisma);
  const next = normalizeTrelloSync({ ...config, ...patch });
  if (row) await prisma.businessSetting.update({ where: { id: row.id }, data: { trelloSync: next } });
  else if (shop) await prisma.businessSetting.create({ data: { shop, trelloSync: next } });
  return next;
}

/** Monta o plano de importação com a ligação salva (cartões sem passeio ficam de fora). */
export function planFromBoard(board, config, { today = new Date() } = {}) {
  const parsed = parseTrelloBoard(board, { today });
  const cards = parsed.cards
    .filter((card) => config.mapping[card.tourKey] && (config.includeFlagged || !card.dateWarning))
    .map((card) => ({ ...card, tourId: config.mapping[card.tourKey] }));
  return { assignGuides: config.assignGuides, cards, support: parsed.support };
}

export function compactSummary(summary) {
  const warnings = [...new Set(summary?.guideWarnings || [])];
  return {
    departures: summary?.departures || 0,
    checklists: summary?.checklists || 0,
    guidesAssigned: summary?.guidesAssigned || 0,
    support: summary?.support || 0,
    unplaced: (summary?.unplaced || []).length,
    files: summary?.files || 0,
    guideWarnings: warnings.slice(0, MAX_WARNINGS),
    moreWarnings: Math.max(0, warnings.length - MAX_WARNINGS),
  };
}

/** Anexos que ainda estão como link do Trello (documentos de suporte e observações das saídas). */
export async function pendingTrelloLinks(prisma) {
  const out = [];
  const support = await prisma.supportCard.findMany({ where: { NOT: { trelloId: null } }, select: { trelloId: true, links: true } });
  for (const card of support) for (const link of Array.isArray(card.links) ? card.links : []) out.push({ trelloCardId: card.trelloId, url: link.url, name: link.name });
  const departures = await prisma.tourDeparture.findMany({ where: { startTime: { gte: new Date(Date.now() - 90 * 24 * 3600 * 1000) } }, select: { guideNotes: true } });
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

/** Baixa até `limit` anexos pendentes para dentro da Central. */
export async function downloadPendingTrelloFiles(prisma, creds, { limit = 80 } = {}) {
  const links = await pendingTrelloLinks(prisma);
  const summary = { total: links.length, saved: 0, skipped: [], failed: [] };
  for (const link of links.slice(0, limit)) {
    try {
      const file = await downloadTrelloAttachment(creds, link.url, link.name);
      if (!ALLOWED_ATTACHMENT_TYPES.has(file.mimeType)) { summary.skipped.push(`${link.name}: tipo ${file.mimeType} não aceito`); continue; }
      if (file.bytes.length > MAX_ATTACHMENT_BYTES) { summary.skipped.push(`${link.name}: maior que 8 MB`); continue; }
      const r = await saveTrelloFile({ prisma, trelloCardId: link.trelloCardId, url: link.url, fileName: safeFileName(link.name || file.fileName), mimeType: file.mimeType, bytes: file.bytes, by: "Trello" });
      summary.saved += r.saved;
    } catch (e) {
      summary.failed.push(`${link.name}: ${e.message}`);
      if (e.status === 401) break;
    }
  }
  return summary;
}

/**
 * Uma leitura do Trello. Sem `force`, só roda se estiver ligada e se a última
 * leitura de hoje ainda não tiver rodado (o relógio fica no banco, então reiniciar
 * o servidor não dispara leituras a mais).
 */
export async function runTrelloSync(prisma, { assignGuide, force = false, now = new Date(), fetchBoard = fetchTrelloBoard, getCreds = trelloCredentials, downloadFiles = true } = {}) {
  const { config } = await readTrelloSync(prisma);
  if (!force && !config.enabled) return { skipped: "disabled" };
  if (!force && !trelloDailyDue(config.lastRunAt, now)) {
    return { skipped: "recent" };
  }
  if (!Object.keys(config.mapping).length) {
    await saveTrelloSync(prisma, { lastRunAt: now.toISOString(), lastError: "Faça uma importação pelo Quadro para ligar os cartões aos passeios." });
    return { skipped: "no-mapping" };
  }
  await saveTrelloSync(prisma, { lastRunAt: now.toISOString() });
  try {
    const creds = await getCreds(prisma);
    if (!creds) throw new Error("Trello desconectado: conecte de novo em Integrações → Conexões.");
    const board = await fetchBoard(creds);
    const plan = planFromBoard(board, config, { today: now });
    const summary = await importTrelloPlan({ prisma, plan, assignGuide, aliases: config.aliases, now });
    if (downloadFiles) {
      const files = await downloadPendingTrelloFiles(prisma, creds, { limit: 30 }).catch(() => null);
      summary.files = files?.saved || 0;
    }
    const lastSummary = compactSummary(summary);
    await saveTrelloSync(prisma, { lastOkAt: new Date().toISOString(), lastError: null, lastSummary });
    return { ok: true, summary: lastSummary };
  } catch (error) {
    const message = asText(error?.message || error, 500) || "Falha ao ler o Trello.";
    await saveTrelloSync(prisma, { lastError: message }).catch(() => {});
    return { ok: false, error: message };
  }
}

/** Passo do worker (app/utils/sync-queue.server.js): roda a leitura com a escala real de guias. */
export async function trelloSyncWorkerStep(prisma) {
  const { assignGuideToDeparture } = await import("./central-route.server.js");
  return runTrelloSync(prisma, {
    assignGuide: ({ tour, guide, startTime, languages }) => assignGuideToDeparture({ tour, guide, startTime, languages }),
  });
}

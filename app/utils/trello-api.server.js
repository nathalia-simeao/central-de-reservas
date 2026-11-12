import { Buffer } from "node:buffer";
// Trello pela API oficial, com a chave + token da Nathalia (Integrações → Trello).
// O token é da conta dela: enxerga os quadros em que ela é membro, inclusive
// "Tours (Portugal, Me & You)", mesmo sendo de outro workspace.
import { getIntegrationCredentials } from "./integration-secrets.server.js";

export const TRELLO_PROVIDER = "TRELLO";
const API = "https://api.trello.com/1";

/** "https://trello.com/b/TVDR11Il/tours-..." ou "TVDR11Il" → "TVDR11Il" */
export function trelloBoardId(value) {
  const text = String(value || "").trim();
  const match = text.match(/trello\.com\/b\/([A-Za-z0-9]+)/);
  if (match) return match[1];
  return /^[A-Za-z0-9]{6,32}$/.test(text) ? text : null;
}

function authHeader({ apiKey, token }) {
  return `OAuth oauth_consumer_key="${apiKey}", oauth_token="${token}"`;
}

export async function trelloCredentials(prisma) {
  const stored = await getIntegrationCredentials(prisma, TRELLO_PROVIDER).catch(() => null);
  const creds = stored?.credentials;
  if (!creds?.apiKey || !creds?.token) return null;
  return { apiKey: creds.apiKey, token: creds.token, boardId: creds.boardId || null };
}

export async function trelloFetch(creds, path, { raw = false } = {}) {
  const url = path.startsWith("http") ? path : `${API}${path}`;
  const response = await fetch(url, { headers: { Authorization: authHeader(creds), Accept: raw ? "*/*" : "application/json" }, redirect: "follow" });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 160);
    const error = new Error(response.status === 401 ? "O Trello recusou a chave/token (401). Gere um token novo." : `Trello respondeu ${response.status}: ${detail}`);
    error.status = response.status;
    throw error;
  }
  return raw ? response : response.json();
}

/** Confere a chave e o acesso ao quadro. */
export async function testTrello(creds) {
  const me = await trelloFetch(creds, "/members/me?fields=fullName,username");
  let board = null;
  if (creds.boardId) board = await trelloFetch(creds, `/boards/${creds.boardId}?fields=name,url`);
  return { member: me.fullName || me.username, board: board?.name || null };
}

/** O quadro no mesmo formato do JSON exportado (só listas e cartões abertos). */
export async function fetchTrelloBoard(creds) {
  if (!creds.boardId) throw new Error("Informe o link do quadro do Trello.");
  return trelloFetch(creds, `/boards/${creds.boardId}?fields=name&lists=open&list_fields=name,pos,closed&cards=open&card_fields=name,desc,idList,idLabels,idMembers,pos,due,closed&checklists=all&checklist_fields=name,idCard,pos&labels=all&label_fields=name,color&members=all&member_fields=fullName,username&card_attachments=true&card_attachment_fields=name,url,mimeType,bytes,isUpload`);
}

const MIME_BY_EXT = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };

/** Baixa um anexo enviado ao Trello (precisa do cabeçalho OAuth). */
export async function downloadTrelloAttachment(creds, url, fallbackName = "arquivo") {
  const response = await trelloFetch(creds, url, { raw: true });
  const bytes = Buffer.from(await response.arrayBuffer());
  const name = decodeURIComponent(String(url).split("/").pop() || fallbackName);
  const ext = name.split(".").pop().toLowerCase();
  const header = String(response.headers.get("content-type") || "").split(";")[0].toLowerCase();
  const mimeType = MIME_BY_EXT[ext] || (header && header !== "application/octet-stream" ? header : "application/octet-stream");
  return { bytes, mimeType, fileName: name };
}

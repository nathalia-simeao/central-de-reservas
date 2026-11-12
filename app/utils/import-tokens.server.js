// Códigos curtos (30 min) para enviar arquivos de fora da Central, hoje só
// os anexos do Trello: o navegador logado no Trello baixa cada anexo e manda
// para /api/trello-file com este código. Ficam na memória do servidor (uma
// instância): se o servidor reiniciar, é só gerar outro.
import crypto from "node:crypto";

const TTL_MS = 30 * 60 * 1000;
const tokens = new Map();

export function createImportToken(by = null, now = Date.now()) {
  for (const [key, value] of tokens) if (value.expiresAt <= now) tokens.delete(key);
  const token = crypto.randomBytes(24).toString("hex");
  tokens.set(token, { by, expiresAt: now + TTL_MS });
  return { token, expiresAt: new Date(now + TTL_MS).toISOString() };
}

export function checkImportToken(token, now = Date.now()) {
  const entry = tokens.get(String(token || ""));
  if (!entry || entry.expiresAt <= now) return null;
  return entry;
}

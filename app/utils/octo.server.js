// Conexão OCTO (padrão aberto de conectividade de passeios) para Klook, Tiqets e
// Headout — pedido da Nathalia, 13/11/2026: "se eu mudar algo na Central, quero
// que mude na plataforma". Com OCTO a plataforma pergunta as vagas para a Central
// antes de vender e cria/cancela a reserva aqui, então bloqueios, capacidade e
// reservas dos outros canais valem na hora.
//
// Cada plataforma tem a sua chave (Bearer), gerada em Integrações e guardada
// criptografada. A mesma lógica da Supplier API da Civitatis responde, só que
// marcando a reserva com a plataforma da chave (runAsReseller).

import crypto from "node:crypto";
import {
  getIntegrationCredentials,
  getSafeIntegrationSecretStatus,
  removeIntegrationCredentials,
  storeIntegrationCredentials,
} from "./integration-secrets.server.js";

export const OCTO_RESELLERS = [
  { key: "KLOOK", name: "Klook", docs: "https://klook.gitbook.io/openapi/getting-started/integration-process" },
  { key: "TIQETS", name: "Tiqets", docs: "https://suppliers.tiqets.com/" },
  { key: "HEADOUT", name: "Headout", docs: "https://hub-help.headout.com/" },
];
const RESELLER_KEYS = new Set(OCTO_RESELLERS.map((r) => r.key));
export const octoProvider = (key) => `OCTO_${String(key || "").toUpperCase()}`;

export function isOctoReseller(key) {
  return RESELLER_KEYS.has(String(key || "").toUpperCase());
}

function constantTimeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length > 0 && left.length === right.length && crypto.timingSafeEqual(left, right);
}

// ---- Chaves ----

let tokenCache = { at: 0, list: [] };
function clearTokenCache() { tokenCache = { at: 0, list: [] }; }

async function resellerTokens(prisma) {
  if (Date.now() - tokenCache.at < 60000) return tokenCache.list;
  const list = [];
  for (const reseller of OCTO_RESELLERS) {
    try {
      const stored = await getIntegrationCredentials(prisma, octoProvider(reseller.key));
      const token = String(stored?.credentials?.token || "").trim();
      if (token) list.push({ platform: reseller.key, token, metadata: stored.record?.metadata || {} });
    } catch (error) {
      console.error("[OCTO] credential read failed", reseller.key, error?.message || error);
    }
  }
  tokenCache = { at: Date.now(), list };
  return list;
}

/** Gera (ou troca) a chave da plataforma. Retorna a chave uma única vez. */
export async function generateOctoKey(prisma, key, { by = null } = {}) {
  const platform = String(key || "").toUpperCase();
  if (!isOctoReseller(platform)) throw new Error("Plataforma OCTO inválida.");
  const token = `pmy_${platform.toLowerCase()}_${crypto.randomBytes(24).toString("base64url")}`;
  const previous = await getSafeIntegrationSecretStatus(prisma, octoProvider(platform)).catch(() => null);
  await storeIntegrationCredentials(prisma, {
    provider: octoProvider(platform),
    credentials: { token },
    environment: "live",
    status: "CONFIGURED",
    metadata: {
      ...(previous?.metadata || {}),
      keyCreatedAt: new Date().toISOString(),
      keyCreatedBy: by,
      keyHint: token.slice(-4),
    },
  });
  clearTokenCache();
  return token;
}

export async function removeOctoKey(prisma, key) {
  await removeIntegrationCredentials(prisma, octoProvider(key));
  clearTokenCache();
}

export async function setOctoLive(prisma, key, live) {
  const provider = octoProvider(key);
  const record = await prisma.integrationSecret.findUnique({ where: { provider }, select: { metadata: true } });
  if (!record) return false;
  await prisma.integrationSecret.update({ where: { provider }, data: { metadata: { ...(record.metadata || {}), live: Boolean(live), liveChangedAt: new Date().toISOString() } } });
  clearTokenCache();
  return true;
}

export async function octoStatuses(prisma) {
  const out = [];
  for (const reseller of OCTO_RESELLERS) {
    const record = await getSafeIntegrationSecretStatus(prisma, octoProvider(reseller.key)).catch(() => null);
    const meta = record?.metadata || {};
    out.push({
      ...reseller,
      hasKey: Boolean(record?.hasCredential),
      keyHint: meta.keyHint || null,
      keyCreatedAt: meta.keyCreatedAt || null,
      lastTrafficAt: meta.lastTrafficAt || null,
      lastEndpoint: meta.lastEndpoint || null,
      live: Boolean(meta.live),
    });
  }
  return out;
}

/** Plataformas que já vendem pela conexão (o Gmail não lança de novo as reservas delas). */
export async function octoLivePlatforms(prisma) {
  return (await octoStatuses(prisma)).filter((s) => s.hasKey && s.live).map((s) => s.key);
}

const lastTrafficWrite = new Map();
async function noteTraffic(prisma, platform, endpoint) {
  const now = Date.now();
  if (now - (lastTrafficWrite.get(platform) || 0) < 5 * 60 * 1000) return;
  lastTrafficWrite.set(platform, now);
  const provider = octoProvider(platform);
  try {
    const record = await prisma.integrationSecret.findUnique({ where: { provider }, select: { metadata: true } });
    if (!record) return;
    await prisma.integrationSecret.update({
      where: { provider },
      data: {
        status: "CONNECTED",
        lastValidatedAt: new Date(),
        lastValidationStatus: "CONNECTED",
        lastValidationMessage: `Chamada autenticada da ${platform} recebida (${endpoint}).`,
        metadata: { ...(record.metadata || {}), lastTrafficAt: new Date().toISOString(), lastEndpoint: endpoint },
      },
    });
  } catch (error) {
    console.error("[OCTO] traffic note failed", error?.message || error);
  }
}

// ---- Respostas no formato OCTO ----

export function octoJson(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

const ERROR_CODES = {
  PRODUCT_NOT_FOUND: "INVALID_PRODUCT_ID",
  INVALID_OPTION: "INVALID_OPTION_ID",
  INVALID_UNITS: "INVALID_UNIT_ID",
  INVALID_AVAILABILITY: "INVALID_AVAILABILITY_ID",
  AVAILABILITY_EXPIRED: "UNPROCESSABLE_ENTITY",
  AVAILABILITY_UNAVAILABLE: "UNPROCESSABLE_ENTITY",
  BOOKING_NOT_FOUND: "INVALID_BOOKING_UUID",
  BOOKING_CANCELLED: "UNPROCESSABLE_ENTITY",
  BOOKING_EXPIRED: "UNPROCESSABLE_ENTITY",
  REFERENCE_MISMATCH: "UNPROCESSABLE_ENTITY",
  RESELLER_REFERENCE_REQUIRED: "BAD_REQUEST",
  INVALID_DATE_RANGE: "BAD_REQUEST",
  PICKUPS_NOT_IMPLEMENTED: "BAD_REQUEST",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
};

export function octoError(status, error, errorMessage, extra = {}) {
  return octoJson({ error, errorMessage, ...extra }, status);
}

/** Converte a resposta da Supplier API (Civitatis) para OCTO. */
export async function toOctoResponse(response, transform = (body) => body) {
  let body = null;
  try { body = await response.clone().json(); } catch { body = null; }
  if (!response.ok) {
    const code = ERROR_CODES[body?.error] || (response.status >= 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST");
    return octoError(response.status, code, body?.message || body?.errorMessage || "Request failed.");
  }
  return octoJson(await transform(body));
}

export async function requireOctoAuth(prisma, request, endpoint) {
  const auth = String(request.headers.get("Authorization") || "").trim();
  const supplied = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
  if (!supplied) return { error: octoError(401, "UNAUTHORIZED", "Missing Bearer token.") };
  const tokens = await resellerTokens(prisma);
  const match = tokens.find((t) => constantTimeEqual(t.token, supplied));
  if (!match) return { error: octoError(401, "UNAUTHORIZED", "Invalid Bearer token.") };
  void noteTraffic(prisma, match.platform, endpoint);
  return { platform: match.platform };
}

/** "2026-11-14T09:30:00.000Z" → "2026-11-14T09:30:00+00:00" no fuso do passeio. */
export function localOffsetIso(value, timeZone = "Europe/Lisbon") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const offsetMin = Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

export function octoAvailability(item, timeZone = "Europe/Lisbon") {
  return {
    ...item,
    localDateTimeStart: localOffsetIso(item.localDateTimeStart, timeZone),
    localDateTimeEnd: localOffsetIso(item.localDateTimeEnd, timeZone),
    utcCutoffAt: item.utcCutoffAt || null,
  };
}

/** Calendário OCTO: um item por dia a partir dos horários. */
export function octoCalendar(items = [], { localDateStart, localDateEnd } = {}, timeZone = "Europe/Lisbon") {
  const byDay = new Map();
  for (const item of items) {
    const day = localOffsetIso(item.localDateTimeStart, timeZone).slice(0, 10);
    const row = byDay.get(day) || { localDate: day, available: false, status: "SOLD_OUT", vacancies: 0, capacity: 0, openingHours: [] };
    row.vacancies += Math.max(0, Number(item.vacancies) || 0);
    row.capacity += Math.max(0, Number(item.capacity) || 0);
    if (item.available) row.available = true;
    byDay.set(day, row);
  }
  const out = [];
  if (localDateStart && localDateEnd) {
    for (let d = new Date(`${localDateStart}T00:00:00Z`); d <= new Date(`${localDateEnd}T00:00:00Z`); d = new Date(d.getTime() + 86400000)) {
      const key = d.toISOString().slice(0, 10);
      out.push(byDay.get(key) || { localDate: key, available: false, status: "CLOSED", vacancies: 0, capacity: 0, openingHours: [] });
    }
  } else {
    out.push(...[...byDay.values()].sort((a, b) => a.localDate.localeCompare(b.localDate)));
  }
  for (const row of out) {
    if (row.status === "CLOSED") continue;
    row.status = !row.available ? "SOLD_OUT" : row.capacity && row.vacancies / row.capacity < 0.25 ? "LIMITED" : "AVAILABLE";
  }
  return out;
}

/** Produto completo no formato OCTO. */
export function octoProduct({ tour, details }) {
  const timeZone = tour.timezone || "Europe/Lisbon";
  const cutoffMinutes = Math.max(0, Math.round(Number(tour.bookingCutoffSeconds || 0) / 60));
  const slots = [...new Set((tour.scheduleSlots || []).filter((s) => /^\d{2}:\d{2}$/.test(s)))].sort();
  const option = details.options?.[0] || {};
  return {
    id: details.id,
    internalName: details.internalName,
    reference: details.id,
    locale: "en",
    timeZone,
    allowFreesale: false,
    instantConfirmation: true,
    instantDelivery: true,
    availabilityRequired: true,
    availabilityType: "START_TIME",
    deliveryFormats: ["QRCODE"],
    deliveryMethods: ["VOUCHER"],
    redemptionMethod: "MANIFEST",
    options: [{
      id: option.id || "STANDARD",
      default: true,
      internalName: option.internalName || "Standard",
      reference: option.id || "STANDARD",
      availabilityLocalStartTimes: slots,
      cancellationCutoff: "24 hours",
      cancellationCutoffAmount: 24,
      cancellationCutoffUnit: "hour",
      requiredContactFields: option.requiredContactFields || ["fullName", "emailAddress", "phoneNumber"],
      restrictions: { minUnits: 1, maxUnits: Math.max(1, Number(tour.maxCapacity || 20)) },
      bookingCutoffMinutes: cutoffMinutes,
      units: (option.units || []).map((unit) => ({
        id: unit.id,
        internalName: unit.internalName,
        reference: unit.id,
        type: unit.id,
        requiredContactFields: [],
        restrictions: {
          minAge: unit.id === "CHILD" ? 0 : unit.id === "YOUTH" ? 12 : unit.id === "SENIOR" ? 65 : 18,
          maxAge: unit.id === "CHILD" ? 11 : unit.id === "YOUTH" ? 17 : 99,
          idRequired: false,
          minQuantity: null,
          maxQuantity: unit.restrictions?.[0]?.maxQuantity ?? null,
          paxCount: 1,
          accompaniedBy: unit.id === "CHILD" ? ["ADULT", "SENIOR"] : [],
        },
      })),
    }],
  };
}

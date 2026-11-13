// Gmail → Central (pedido da Nathalia, 13/11/2026): a Central lê a caixa do Gmail
// da PMY (senha de app, só leitura) e transforma os e-mails de reserva das
// plataformas sem conexão direta em reservas: Airbnb, Tiqets, Klook, Civitatis,
// Viator e Headout.
//
// - Reserva nova com tudo claro (passeio, data, hora, pessoas, referência) entra sozinha.
// - Cancelamento cancela a reserva da mesma referência.
// - O resto fica em "Para revisar" na janela do Gmail, em Integrações: a equipe
//   escolhe o passeio uma vez e a Central lembra para os próximos e-mails.
// - Cada e-mail lido vira um IntegrationEvent (provider GMAIL), então nada entra duas vezes.

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import {
  getIntegrationCredentials,
  getSafeIntegrationSecretStatus,
} from "../utils/integration-secrets.server.js";
import {
  EMAIL_SENDER_DOMAINS, emailPlatform, htmlToText, missingFields, parseBookingEmail, productAliasKey,
} from "../utils/email-bookings.js";
import { titleSimilarity } from "../utils/tour-matching.js";
import { lisbonLocalDateTimeToUtc } from "../utils/shopify-orders.server.js";
import { getCentralAvailability } from "../utils/capacity.server.js";
import { enqueueBookingSync, SYNC_EVENT_TYPES } from "../utils/sync-queue.server.js";

export const GMAIL_PROVIDER = "GMAIL";
const SNIPPET_CHARS = 2500;
const WORKER_EVERY_MS = 5 * 60 * 1000;

// ---- Credenciais e estado ----

export async function gmailCredentials(prisma) {
  const stored = await getIntegrationCredentials(prisma, GMAIL_PROVIDER).catch(() => null);
  const c = stored?.credentials;
  return c?.email && c?.appPassword ? { email: c.email, appPassword: c.appPassword } : null;
}

export async function readGmailState(prisma) {
  const record = await getSafeIntegrationSecretStatus(prisma, GMAIL_PROVIDER).catch(() => null);
  const meta = record?.metadata || {};
  return {
    configured: Boolean(record?.hasCredential),
    email: meta.email || null,
    enabled: meta.enabled !== false && Boolean(record?.hasCredential),
    connectedAt: meta.connectedAt || null,
    lastUid: Number(meta.lastUid || 0),
    uidValidity: meta.uidValidity || null,
    mailbox: meta.mailbox || null,
    lastRunAt: meta.lastRunAt || null,
    lastOkAt: meta.lastOkAt || null,
    lastError: meta.lastError || null,
    lastSummary: meta.lastSummary || null,
    aliases: meta.aliases || {},
    record,
  };
}

export async function saveGmailState(prisma, patch) {
  const record = await prisma.integrationSecret.findUnique({ where: { provider: GMAIL_PROVIDER }, select: { metadata: true } });
  if (!record) return null;
  const metadata = { ...(record.metadata || {}), ...patch };
  await prisma.integrationSecret.update({ where: { provider: GMAIL_PROVIDER }, data: { metadata } });
  return metadata;
}

// ---- IMAP ----

function imapClient({ email, appPassword }) {
  return new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: email, pass: String(appPassword).replace(/\s+/g, "") },
    logger: false,
    socketTimeout: 60000,
  });
}

function friendlyImapError(error) {
  const text = String(error?.responseText || error?.message || error || "");
  if (/AUTHENTICATIONFAILED|Invalid credentials|authentication failed|Application-specific password/i.test(text)) {
    return "O Gmail recusou o e-mail ou a senha de app. Gere uma nova senha de app (16 letras) e cole de novo.";
  }
  if (/IMAP.*disabled|not enabled for IMAP/i.test(text)) {
    return "O IMAP está desligado nesta conta. No Gmail: Configurações → Encaminhamento e POP/IMAP → Ativar IMAP.";
  }
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|timeout/i.test(text)) return "Não foi possível falar com o Gmail agora. Tente de novo em alguns minutos.";
  return text.slice(0, 300) || "Erro ao ler o Gmail.";
}

/** Caixa "Todos os e-mails" (pega também o que os filtros tiram da caixa de entrada). */
async function allMailPath(client) {
  const boxes = await client.list();
  return boxes.find((b) => b.specialUse === "\\All")?.path || "INBOX";
}

export async function testGmail(creds) {
  const client = imapClient(creds);
  try {
    await client.connect();
    const path = await allMailPath(client);
    const status = await client.status(path, { messages: true, uidValidity: true });
    return { ok: true, mailbox: path, messages: status.messages, uidValidity: String(status.uidValidity || "") };
  } catch (error) {
    return { ok: false, error: friendlyImapError(error) };
  } finally {
    await client.logout().catch(() => {});
  }
}

function senderQuery() {
  return `{${EMAIL_SENDER_DOMAINS.map((d) => `from:${d}`).join(" ")}}`;
}

const gmailDate = (date) => `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}/${date.getUTCDate()}`;

/**
 * Busca os e-mails das plataformas.
 * - Leitura normal: só UIDs depois do último lido.
 * - since (backfill): e-mails depois dessa data, sem olhar o último UID.
 */
async function fetchPlatformMessages(creds, state, { since = null, max = 200 } = {}) {
  const client = imapClient(creds);
  await client.connect();
  const out = { messages: [], mailbox: null, uidValidity: null, maxUid: state.lastUid || 0 };
  try {
    const path = await allMailPath(client);
    const lock = await client.getMailboxLock(path, { readOnly: true });
    try {
      out.mailbox = path;
      out.uidValidity = String(client.mailbox?.uidValidity || "");
      const sameBox = state.uidValidity && state.uidValidity === out.uidValidity && state.mailbox === path;
      const sinceDate = since || (sameBox && state.lastUid ? null : new Date(state.connectedAt || Date.now()));
      const query = { gmraw: `${senderQuery()}${sinceDate ? ` after:${gmailDate(new Date(sinceDate.getTime() - 86400000))}` : ""}` };
      if (!since && sameBox && state.lastUid) query.uid = `${state.lastUid + 1}:*`;
      let uids = (await client.search(query, { uid: true })) || [];
      uids = uids.filter((uid) => since || !sameBox || uid > (state.lastUid || 0)).sort((a, b) => a - b);
      if (uids.length > max) uids = uids.slice(-max);
      if (uids.length) {
        for await (const msg of client.fetch(uids, { uid: true, source: true, internalDate: true }, { uid: true })) {
          out.messages.push({ uid: msg.uid, source: msg.source, internalDate: msg.internalDate });
          if (msg.uid > out.maxUid) out.maxUid = msg.uid;
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
  return out;
}

async function toMail(raw) {
  const parsed = await simpleParser(raw.source);
  const from = parsed.from?.value?.[0]?.address || parsed.from?.text || "";
  return {
    messageId: parsed.messageId || `uid-${raw.uid}`,
    from,
    fromName: parsed.from?.value?.[0]?.name || "",
    subject: parsed.subject || "",
    date: parsed.date || raw.internalDate || new Date(),
    text: parsed.text || "",
    html: typeof parsed.html === "string" ? parsed.html : "",
  };
}

// ---- Passeio ----

async function loadTourCatalog(prisma) {
  const tours = await prisma.tour.findMany({ select: { id: true, title: true, translations: true, scheduleSlots: true, shopifyStatus: true } });
  return tours.map((t) => {
    const names = [t.title];
    for (const value of Object.values(t.translations || {})) if (value?.title) names.push(value.title);
    return { ...t, names };
  });
}

/** Passeio da Central para o produto do e-mail: apelido salvo → nome parecido (sem empate). */
export function matchTour(parsed, catalog, aliases = {}) {
  if (!parsed.product) return null;
  for (const key of [productAliasKey(parsed.platform, parsed.product, parsed.option || ""), productAliasKey(parsed.platform, parsed.product)]) {
    const id = aliases[key];
    if (id && catalog.some((t) => t.id === id)) return { tourId: id, by: "alias" };
  }
  const scored = catalog
    .map((t) => ({ t, score: Math.max(...t.names.map((n) => titleSimilarity(`${parsed.product} ${parsed.option || ""}`, n)), ...t.names.map((n) => titleSimilarity(parsed.product, n))) }))
    .sort((a, b) => b.score - a.score);
  const [best, second] = scored;
  if (best && best.score >= 0.75 && (!second || best.score - second.score >= 0.15)) return { tourId: best.t.id, by: "name", score: best.score };
  return null;
}

function slotTime(parsed, tour) {
  if (parsed.timeKey) return parsed.timeKey;
  const slots = (tour?.scheduleSlots || []).filter((s) => /^\d{2}:\d{2}$/.test(s));
  return slots.length === 1 ? slots[0] : null;
}

// ---- Reservas ----

const externalIdFor = (parsed) => `email:${parsed.ref}`;
const sourceNames = { AIRBNB: "Airbnb", TIQETS: "Tiqets", KLOOK: "Klook", CIVITATIS: "Civitatis", VIATOR: "Viator", HEADOUT: "Headout" };

async function findBookingByRef(prisma, platform, ref) {
  if (!platform || !ref) return null;
  return prisma.booking.findFirst({
    where: { platform, OR: [{ externalBookingId: `email:${ref}` }, { externalBookingId: ref }, { bookingRef: ref }] },
  });
}

async function createEmailBooking(prisma, parsed, { tourId, startTime, messageId }) {
  const existing = await findBookingByRef(prisma, parsed.platform, parsed.ref);
  if (existing) return { booking: existing, idempotent: true };
  const pax = parsed.pax || { adults: 0, children: 0, youths: 0, seniors: 0, total: 0 };
  const booking = await prisma.booking.create({
    data: {
      tourId,
      customerName: parsed.customerName || `${sourceNames[parsed.platform] || parsed.platform} ${parsed.ref}`,
      customerEmail: parsed.customerEmail || null,
      customerPhone: parsed.customerPhone || null,
      language: parsed.language || null,
      startTime,
      platform: parsed.platform,
      commercialSource: sourceNames[parsed.platform] || "Outro",
      status: "CONFIRMED",
      bookingRef: parsed.ref,
      externalBookingId: externalIdFor(parsed),
      adults: pax.adults || 0,
      children: (pax.children || 0) + (pax.infants || 0),
      youths: pax.youths || 0,
      seniors: pax.seniors || 0,
      totalParticipants: pax.total || 0,
      totalPrice: parsed.price?.amount != null ? String(parsed.price.amount) : null,
      currency: parsed.price?.currency || (parsed.price ? "EUR" : null),
      syncStatus: "SYNCED",
      lastSyncedAt: new Date(),
      externalCreatedAt: new Date(),
      rawPayload: { source: "gmail", messageId, product: parsed.product, option: parsed.option },
    },
  });
  await enqueueBookingSync(prisma, {
    eventId: `gmail:${messageId}:created`,
    eventType: SYNC_EVENT_TYPES.BOOKING_CREATED,
    booking,
    sourcePlatform: parsed.platform,
  }).catch((error) => console.error("[GMAIL] availability sync enqueue failed:", error?.message || error));
  let warning = null;
  try {
    const availability = await getCentralAvailability(prisma, { tourId, startTime, platform: parsed.platform });
    if (availability.remainingSeats < 0 || availability.occupiedSeats > availability.capacity) warning = "OVERBOOKED";
    if (availability.blocked) warning = "BLOCKED_DAY";
  } catch { /* só aviso */ }
  return { booking, idempotent: false, warning };
}

async function cancelEmailBooking(prisma, parsed, messageId) {
  const booking = await findBookingByRef(prisma, parsed.platform, parsed.ref);
  if (!booking) return null;
  if (booking.status === "CANCELED") return { booking, idempotent: true };
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELED", cancelReason: "Cancelado pela plataforma (e-mail)", externalUpdatedAt: new Date() },
  });
  await enqueueBookingSync(prisma, {
    eventId: `gmail:${messageId}:cancelled`,
    eventType: SYNC_EVENT_TYPES.BOOKING_CANCELLED,
    booking: updated,
    sourcePlatform: parsed.platform,
  }).catch((error) => console.error("[GMAIL] cancel sync enqueue failed:", error?.message || error));
  return { booking: updated, idempotent: false };
}

async function changeEmailBooking(prisma, parsed, { tourId, startTime, messageId }) {
  const booking = await findBookingByRef(prisma, parsed.platform, parsed.ref);
  if (!booking) return null;
  const data = { externalUpdatedAt: new Date() };
  if (startTime) data.startTime = startTime;
  if (tourId) data.tourId = tourId;
  if (parsed.pax?.total) {
    data.adults = parsed.pax.adults || 0;
    data.children = (parsed.pax.children || 0) + (parsed.pax.infants || 0);
    data.youths = parsed.pax.youths || 0;
    data.seniors = parsed.pax.seniors || 0;
    data.totalParticipants = parsed.pax.total;
  }
  if (parsed.language) data.language = parsed.language;
  const updated = await prisma.booking.update({ where: { id: booking.id }, data });
  await enqueueBookingSync(prisma, {
    eventId: `gmail:${messageId}:updated`,
    eventType: SYNC_EVENT_TYPES.BOOKING_UPDATED,
    booking: updated,
    sourcePlatform: parsed.platform,
  }).catch((error) => console.error("[GMAIL] update sync enqueue failed:", error?.message || error));
  return { booking: updated, previous: { startTime: booking.startTime, tourId: booking.tourId, pax: booking.totalParticipants } };
}

// ---- Um e-mail ----

function eventPayload(mail, parsed, extra = {}) {
  const text = mail.text && mail.text.trim().length > 40 ? mail.text : htmlToText(mail.html);
  return {
    from: mail.from,
    fromName: mail.fromName,
    subject: mail.subject,
    receivedAt: mail.date,
    snippet: String(text || "").slice(0, SNIPPET_CHARS),
    parsed,
    ...extra,
  };
}

/**
 * Lê um e-mail e decide: IMPORTED (entrou), REVIEW (equipe confere), IGNORED.
 * mode "review" (backfill) nunca cria reserva sozinho.
 */
export async function processEmail(prisma, mail, { catalog, aliases = {}, mode = "auto", now = new Date() } = {}) {
  const exists = await prisma.integrationEvent.findUnique({
    where: { provider_externalEventId: { provider: GMAIL_PROVIDER, externalEventId: mail.messageId } },
    select: { id: true },
  });
  if (exists) return { status: "DUPLICATE" };

  const parsed = parseBookingEmail(mail);
  const platform = emailPlatform(parsed.platform);
  const record = async (status, result = null, extra = {}) => {
    await prisma.integrationEvent.create({
      data: {
        provider: GMAIL_PROVIDER,
        externalEventId: mail.messageId,
        topic: `${parsed.platform || "UNKNOWN"}:${parsed.kind}`,
        status,
        payload: eventPayload(mail, parsed, extra),
        result,
        processedAt: status === "IMPORTED" || status === "IGNORED" ? new Date() : null,
      },
    }).catch((error) => { if (error?.code !== "P2002") throw error; });
    return { status, result, parsed };
  };

  if (!platform) return record("IGNORED", { reason: "NOT_A_PLATFORM" });
  if (platform.direct) return record("IGNORED", { reason: "DIRECT_CONNECTION" });
  if (parsed.kind === "OTHER") return record("IGNORED", { reason: "NOT_A_BOOKING" });

  if (parsed.kind === "CANCEL") {
    if (!parsed.ref) return record("REVIEW", { reason: "MISSING", missing: ["ref"] });
    if (mode === "review") return record("REVIEW", { reason: "BACKFILL" });
    const done = await cancelEmailBooking(prisma, parsed, mail.messageId);
    if (!done) return record("REVIEW", { reason: "CANCEL_NOT_FOUND" });
    return record("IMPORTED", { action: "CANCELED", bookingId: done.booking.id });
  }

  const match = matchTour(parsed, catalog, aliases);
  const tour = match ? catalog.find((t) => t.id === match.tourId) : null;
  const timeKey = slotTime(parsed, tour);
  const startTime = parsed.dateKey && timeKey ? lisbonLocalDateTimeToUtc(parsed.dateKey, timeKey) : null;
  const missing = missingFields({ ...parsed, timeKey, tourId: match?.tourId });
  if (!match && parsed.product) missing.push("tour");
  const suggestion = { tourId: match?.tourId || null, matchedBy: match?.by || null, timeKey };

  if (parsed.kind === "CHANGE") {
    if (!parsed.ref || mode === "review") return record("REVIEW", { reason: parsed.ref ? "BACKFILL" : "MISSING", missing }, { suggestion });
    const done = await changeEmailBooking(prisma, parsed, { tourId: match?.tourId || null, startTime, messageId: mail.messageId });
    if (!done) return record("REVIEW", { reason: "CHANGE_NOT_FOUND", missing }, { suggestion });
    return record("IMPORTED", { action: "UPDATED", bookingId: done.booking.id, previous: done.previous });
  }

  // NEW
  if (startTime && startTime.getTime() < now.getTime() - 6 * 3600000) {
    return record("IGNORED", { reason: "PAST_TOUR" }, { suggestion });
  }
  if (missing.length || !match || !startTime) return record("REVIEW", { reason: "MISSING", missing }, { suggestion });
  if (mode === "review") return record("REVIEW", { reason: "BACKFILL" }, { suggestion });
  const done = await createEmailBooking(prisma, parsed, { tourId: match.tourId, startTime, messageId: mail.messageId });
  return record("IMPORTED", { action: done.idempotent ? "ALREADY_EXISTS" : "CREATED", bookingId: done.booking.id, warning: done.warning || null }, { suggestion });
}

// ---- Leitura completa ----

let running = false;

export async function runGmailSync(prisma, { since = null, mode = "auto", max = 200 } = {}) {
  if (running) return { ok: false, error: "Já tem uma leitura do Gmail em andamento." };
  running = true;
  const startedAt = new Date();
  try {
    const creds = await gmailCredentials(prisma);
    if (!creds) return { ok: false, error: "Conecte o Gmail em Integrações primeiro." };
    const state = await readGmailState(prisma);
    let fetched;
    try {
      fetched = await fetchPlatformMessages(creds, state, { since, max });
    } catch (error) {
      const message = friendlyImapError(error);
      await saveGmailState(prisma, { lastRunAt: startedAt.toISOString(), lastError: message });
      return { ok: false, error: message };
    }
    const catalog = await loadTourCatalog(prisma);
    const summary = { read: 0, imported: 0, review: 0, ignored: 0, duplicate: 0, errors: 0 };
    for (const raw of fetched.messages) {
      summary.read += 1;
      try {
        const mail = await toMail(raw);
        // E-mails de antes de ligar a leitura nunca entram sozinhos (a equipe pode já ter lançado à mão).
        const before = !since && state.connectedAt && new Date(mail.date) < new Date(state.connectedAt);
        const result = await processEmail(prisma, mail, { catalog, aliases: state.aliases, mode: before ? "review" : mode });
        const key = { IMPORTED: "imported", REVIEW: "review", IGNORED: "ignored", DUPLICATE: "duplicate" }[result.status] || "errors";
        summary[key] += 1;
      } catch (error) {
        summary.errors += 1;
        console.error("[GMAIL] message failed:", error?.message || error);
      }
    }
    const patch = {
      lastRunAt: startedAt.toISOString(),
      lastOkAt: new Date().toISOString(),
      lastError: null,
      lastSummary: { ...summary, mode, at: new Date().toISOString() },
    };
    // O backfill não mexe no ponto de leitura normal.
    if (!since) Object.assign(patch, { lastUid: fetched.maxUid, uidValidity: fetched.uidValidity, mailbox: fetched.mailbox });
    await saveGmailState(prisma, patch);
    return { ok: true, summary };
  } finally {
    running = false;
  }
}

/** Worker: lê o Gmail a cada 5 minutos quando a leitura está ligada. */
let lastWorkerRun = 0;
export async function gmailSyncWorkerStep(prisma, { now = Date.now() } = {}) {
  if (now - lastWorkerRun < WORKER_EVERY_MS) return null;
  lastWorkerRun = now;
  const state = await readGmailState(prisma);
  if (!state.configured || !state.enabled) return null;
  return runGmailSync(prisma);
}

// ---- Revisão (janela do Gmail em Integrações) ----

export async function listGmailInbox(prisma, { limit = 60 } = {}) {
  const [review, recent] = await Promise.all([
    prisma.integrationEvent.findMany({ where: { provider: GMAIL_PROVIDER, status: "REVIEW" }, orderBy: { receivedAt: "desc" }, take: limit }),
    prisma.integrationEvent.findMany({ where: { provider: GMAIL_PROVIDER, status: { in: ["IMPORTED", "IGNORED", "DISMISSED"] } }, orderBy: { receivedAt: "desc" }, take: 30 }),
  ]);
  const view = (e) => ({
    id: e.id,
    status: e.status,
    topic: e.topic,
    receivedAt: e.payload?.receivedAt || e.receivedAt,
    from: e.payload?.fromName || e.payload?.from || "",
    subject: e.payload?.subject || "",
    snippet: e.status === "REVIEW" ? e.payload?.snippet || "" : "",
    parsed: e.payload?.parsed || {},
    suggestion: e.payload?.suggestion || null,
    result: e.result || null,
  });
  return { review: review.map(view), recent: recent.filter((e) => e.payload?.parsed?.platform).map(view) };
}

/**
 * A equipe confirma um e-mail da revisão: passeio, data, hora, pessoas.
 * remember = lembrar o nome do produto → passeio para os próximos e-mails.
 */
export async function resolveGmailEvent(prisma, { eventId, tourId, dateKey, timeKey, pax, language, customerName, remember = true, by = null }) {
  const event = await prisma.integrationEvent.findUnique({ where: { id: eventId } });
  if (!event || event.provider !== GMAIL_PROVIDER) return { ok: false, error: "E-mail não encontrado." };
  if (event.status !== "REVIEW") return { ok: false, error: "Este e-mail já foi resolvido." };
  const parsed = { ...(event.payload?.parsed || {}) };
  const messageId = event.externalEventId;
  if (!parsed.platform) return { ok: false, error: "Não deu para saber a plataforma deste e-mail." };
  if (!parsed.ref) parsed.ref = `MAIL-${event.id.slice(0, 8).toUpperCase()}`;

  let result;
  if (parsed.kind === "CANCEL") {
    const done = await cancelEmailBooking(prisma, parsed, messageId);
    if (!done) return { ok: false, error: "Não achei na Central uma reserva com esta referência para cancelar." };
    result = { action: "CANCELED", bookingId: done.booking.id, by };
  } else {
    const tour = tourId ? await prisma.tour.findUnique({ where: { id: tourId }, select: { id: true } }) : null;
    if (!tour) return { ok: false, error: "Escolha o passeio." };
    const startTime = lisbonLocalDateTimeToUtc(dateKey, timeKey);
    if (!startTime) return { ok: false, error: "Confira a data e a hora." };
    const total = Math.max(0, Number(pax?.total ?? pax) || 0);
    if (!total) return { ok: false, error: "Diga quantas pessoas." };
    const adults = Number(pax?.adults ?? total) || 0;
    const children = Number(pax?.children || 0) || 0;
    parsed.pax = { adults, children, youths: 0, seniors: 0, infants: 0, total: Math.max(total, adults + children) };
    if (language) parsed.language = language;
    if (customerName) parsed.customerName = customerName;
    if (parsed.kind === "CHANGE") {
      const done = await changeEmailBooking(prisma, parsed, { tourId, startTime, messageId });
      if (done) result = { action: "UPDATED", bookingId: done.booking.id, by };
    }
    if (!result) {
      const done = await createEmailBooking(prisma, parsed, { tourId, startTime, messageId });
      result = { action: done.idempotent ? "ALREADY_EXISTS" : "CREATED", bookingId: done.booking.id, warning: done.warning || null, by };
    }
    if (remember && parsed.product) {
      const state = await readGmailState(prisma);
      await saveGmailState(prisma, { aliases: { ...state.aliases, [productAliasKey(parsed.platform, parsed.product)]: tourId } });
    }
  }
  await prisma.integrationEvent.update({ where: { id: eventId }, data: { status: "IMPORTED", result, processedAt: new Date() } });
  return { ok: true, result };
}

export async function dismissGmailEvent(prisma, eventId, by = null) {
  const event = await prisma.integrationEvent.findUnique({ where: { id: eventId }, select: { provider: true, status: true } });
  if (!event || event.provider !== GMAIL_PROVIDER) return { ok: false, error: "E-mail não encontrado." };
  await prisma.integrationEvent.update({ where: { id: eventId }, data: { status: "DISMISSED", result: { reason: "DISMISSED", by }, processedAt: new Date() } });
  return { ok: true };
}

export async function gmailReviewCount(prisma) {
  return prisma.integrationEvent.count({ where: { provider: GMAIL_PROVIDER, status: "REVIEW" } }).catch(() => 0);
}

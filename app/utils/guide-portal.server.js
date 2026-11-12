// Portal do guia (Fase 2, itens 5, 10 e 11 do cliente).
//
// - Login com e-mail + senha criada pela gestão (Guias → Acesso ao portal).
// - Sessão guardada no banco (GuideSession); o cookie só leva um token aleatório,
//   e o banco guarda o hash. Sair ou desativar o guia invalida o acesso na hora.
// - O guia só vê as saídas em que está escalado (GuideAssignment ASSIGNED).
// - O guia nunca apaga nada: check-ins não voltam atrás, observações só somam,
//   presença pode ser corrigida até ele marcar "Fim".

import crypto from "node:crypto";
import { languageKey } from "./tour-languages.js";

export const SESSION_COOKIE = "pmy_guide";
const SESSION_DAYS = 30;
const SCRYPT_KEYLEN = 64;
export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  // Word: a "Base de conhecimento" do Trello tem documentos .docx.
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

// ---------------------------------------------------------------- passwords

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password, stored) {
  const [scheme, saltB64, hashB64] = String(stored || "").split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = crypto.scryptSync(String(password), Buffer.from(saltB64, "base64"), expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function passwordProblem(password) {
  const value = String(password || "");
  if (value.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (value.length > 200) return "Senha longa demais.";
  return null;
}

export function generatePassword() {
  // Easy to read out loud / type on a phone: no 0/O, 1/l/I.
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(10);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

// ---------------------------------------------------------------- login rate limit

const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function loginBlocked(key, now = Date.now()) {
  const entry = attempts.get(key);
  if (!entry || now - entry.first > WINDOW_MS) return false;
  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailedLogin(key, now = Date.now()) {
  const entry = attempts.get(key);
  if (!entry || now - entry.first > WINDOW_MS) attempts.set(key, { first: now, count: 1 });
  else entry.count += 1;
  if (attempts.size > 5000) attempts.clear();
}

export function clearFailedLogins(key) {
  attempts.delete(key);
}

// ---------------------------------------------------------------- sessions

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

// O cookie vale para o site todo (Path=/). Antes era Path=/guia, e o navegador
// não mandava o cookie nas requisições internas "/guia.data" que o React Router
// faz ao navegar sem recarregar: a setinha "← Minhas saídas" caía no login e
// só funcionava atualizando a página. Path=/ também deixa o adm usar a Central (/).
export function sessionCookie(token, maxAgeSeconds = SESSION_DAYS * 24 * 3600, path = "/") {
  return [
    `${SESSION_COOKIE}=${token ? encodeURIComponent(token) : ""}`,
    `Path=${path}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${token ? maxAgeSeconds : 0}`,
  ].join("; ");
}

/** Cabeçalhos para sair: apaga o cookie novo (Path=/) e o antigo (Path=/guia). */
export function logoutCookieHeaders() {
  const headers = new Headers();
  headers.append("Set-Cookie", sessionCookie(null, 0, "/"));
  headers.append("Set-Cookie", sessionCookie(null, 0, "/guia"));
  return headers;
}

/** Token da sessão atual (para regravar o cookie com Path=/ em quem logou antes da mudança). */
export function sessionTokenFromRequest(request) {
  return readCookie(request, SESSION_COOKIE);
}

export async function createGuideSession(prisma, guideId) {
  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.guideSession.create({
    data: {
      guideId,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000),
    },
  });
  await prisma.guide.update({ where: { id: guideId }, data: { lastLoginAt: new Date() } }).catch(() => {});
  return token;
}

export async function getGuideFromRequest(prisma, request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const session = await prisma.guideSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { guide: { omit: { passwordHash: false } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (!session.guide?.portalEnabled || !session.guide?.passwordHash) return null;
  const guide = { ...session.guide };
  delete guide.passwordHash;
  return guide;
}

export async function destroyGuideSession(prisma, request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) await prisma.guideSession.deleteMany({ where: { tokenHash: sha256(token) } }).catch(() => {});
}

export function redirectTo(location, headers = {}) {
  return new Response(null, { status: 302, headers: { Location: location, ...headers } });
}

// ---------------------------------------------------------------- departures

const MINUTE = 60 * 1000;

/** Bookings that belong to one departure (same tour, same start ±1 min). */
export function departureBookingWhere(tourId, startTime) {
  const start = new Date(startTime);
  return {
    tourId,
    status: { in: ["CONFIRMED", "PENDING"] },
    startTime: { gte: new Date(start.getTime() - MINUTE), lte: new Date(start.getTime() + MINUTE) },
  };
}

export async function loadGuideAssignment(prisma, guide, assignmentId) {
  if (!guide || !assignmentId) return null;
  const assignment = await prisma.guideAssignment.findFirst({
    where: { id: String(assignmentId), guideId: guide.id, status: "ASSIGNED" },
    include: { tour: { select: { id: true, title: true, timezone: true, durationMinutes: true } } },
  });
  return assignment || null;
}

export async function ensureDeparture(prisma, tourId, startTime) {
  return prisma.tourDeparture.upsert({
    where: { tourId_startTime: { tourId, startTime: new Date(startTime) } },
    create: { tourId, startTime: new Date(startTime) },
    update: {},
  });
}

export const CHECK_FIELDS = { start: "checkStartAt", mid: "checkMidAt", end: "checkEndAt" };

/**
 * Rules for what a guide may do on a departure right now.
 * Attendance opens 3h before the start and closes when the guide checks "Fim"
 * (or 24h after the start).
 */
export function guidePermissions(departure, startTime, now = new Date()) {
  const start = new Date(startTime).getTime();
  const t = now.getTime();
  const ended = Boolean(departure?.checkEndAt);
  const windowOpen = t >= start - 3 * 60 * MINUTE && t <= start + 24 * 60 * MINUTE;
  return {
    canCheckStart: windowOpen && !departure?.checkStartAt,
    canCheckMid: windowOpen && Boolean(departure?.checkStartAt) && !departure?.checkMidAt && !ended,
    canCheckEnd: windowOpen && Boolean(departure?.checkStartAt) && !ended,
    canMarkAttendance: windowOpen && !ended,
    canAddNote: t >= start - 24 * 60 * MINUTE && t <= start + 72 * 60 * MINUTE,
  };
}

export function appendNote(existing, { by, text }, now = new Date()) {
  const list = Array.isArray(existing) ? existing.filter((n) => n && typeof n.text === "string") : [];
  const clean = String(text || "").trim().slice(0, 1000);
  if (!clean) return list;
  return [...list, { at: now.toISOString(), by: String(by || "").slice(0, 80), text: clean }].slice(-100);
}

export function bookingPax(booking) {
  const sum = ["adults", "children", "youths", "seniors"].reduce((acc, key) => acc + Number(booking?.[key] || 0), 0);
  return Number(booking?.totalParticipants || 0) || sum;
}

export function phoneDigits(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

export function whatsappLink(phone) {
  const digits = phoneDigits(phone).replace(/^\+/, "");
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

export function safeFileName(name) {
  const base = String(name || "arquivo").split(/[\\/]/).pop().replace(/[^\w.\- ()À-ÿ]/g, "_").trim();
  return (base || "arquivo").slice(0, 120);
}

/**
 * Bookings of one guide's group in a departure.
 * - If the management put a booking in a guide's group (groupGuideId), that wins.
 * - Otherwise a guide with languages sees those languages plus bookings without a
 *   language (so nobody is forgotten); a guide without languages sees the rest.
 */
export function bookingsForGuideLanguages(bookings, languages, guideId = null) {
  const keys = Array.isArray(languages) ? languages.filter(Boolean) : [];
  return bookings.filter((booking) => {
    if (booking.groupGuideId) return guideId ? booking.groupGuideId === guideId : true;
    if (!keys.length) return true;
    const key = languageKey(booking.language);
    return !key || keys.includes(key);
  });
}

/** Participants typed by the guide: at most one row per person in the booking. */
export function cleanParticipants(rows, maxRows) {
  const limit = Math.max(0, Math.min(30, Number(maxRows) || 0));
  return (Array.isArray(rows) ? rows : [])
    .slice(0, limit)
    .map((row) => ({
      name: String(row?.name || "").trim().slice(0, 80),
      country: String(row?.country || "").trim().slice(0, 40),
    }))
    .filter((row) => row.name || row.country);
}

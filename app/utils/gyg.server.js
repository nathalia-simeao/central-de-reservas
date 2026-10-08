import { timingSafeEqual } from "node:crypto";

function decodeBasicAuth(authHeader) {
  if (!authHeader?.startsWith("Basic ")) return null;

  try {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;

    return {
      user: decoded.slice(0, separator),
      pass: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

function configuredSecret(name) {
  const value = String(process.env[name] || "").trim();
  return value || null;
}

function safeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;

  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function configuredCredentialPairs() {
  const names = [
    ["GYG_INCOMING_USER", "GYG_INCOMING_PASS"],
    ["GYG_PRODUCTION_USER", "GYG_PRODUCTION_PASS"],
  ];
  return names.map(([userKey, passKey]) => ({
    user: configuredSecret(userKey),
    pass: configuredSecret(passKey),
  })).filter(({user, pass}) => Boolean(user && pass));
}

export function isGygIncomingAuthConfigured() {
  return configuredCredentialPairs().length > 0;
}

export function checkGygBasicAuth(request) {
  const credentials = decodeBasicAuth(request.headers.get("Authorization") || "");
  if (!credentials) return false;
  const pairs = configuredCredentialPairs();
  // Fail closed when no complete credential pair is configured.
  if (!pairs.length) return false;
  // Always compare both parts; never log credentials.
  return pairs.some(({ user, pass }) =>
    safeEqual(credentials.user, user) && safeEqual(credentials.pass, pass)
  );
}

export function gygResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function nonNegativeInt(value) {
  const parsed = Number.parseInt(value ?? 0, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function getParticipantCounts(participants = {}) {
  const adults = nonNegativeInt(participants.adults ?? participants.adult);
  const youths = nonNegativeInt(participants.youths ?? participants.youth);
  const children = nonNegativeInt(participants.children ?? participants.child);
  const seniors = nonNegativeInt(participants.seniors ?? participants.senior);

  return {
    adults,
    youths,
    children,
    seniors,
    totalParticipants: adults + youths + children + seniors,
  };
}

export function getMoneyFields(body = {}) {
  const amount =
    body?.price?.amount ??
    body?.totalPrice?.amount ??
    body?.priceDetails?.totalAmount ??
    body?.total_price ??
    null;

  const parsedAmount = amount === null || amount === undefined || amount === ""
    ? null
    : Number(amount);

  const currencyRaw =
    body?.price?.currency ??
    body?.totalPrice?.currency ??
    body?.priceDetails?.currency ??
    body?.currency ??
    null;

  const currency = typeof currencyRaw === "string" && currencyRaw.trim()
    ? currencyRaw.trim().toUpperCase().slice(0, 3)
    : null;

  return {
    totalPrice: Number.isFinite(parsedAmount) ? parsedAmount.toFixed(2) : null,
    currency,
  };
}

export function parseOptionalDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function bookingLookupWhere({ reservationId, bookingId }) {
  const or = [];
  if (reservationId) or.push({ id: reservationId });
  if (bookingId) {
    or.push({ externalBookingId: bookingId });
    or.push({ bookingRef: bookingId });
  }
  return or.length ? { OR: or } : null;
}

export function bookingOccupancy(booking, now = new Date()) {
  if (booking.status === "PENDING" && booking.holdExpiresAt && booking.holdExpiresAt <= now) {
    return 0;
  }

  if (!["CONFIRMED", "PENDING"].includes(booking.status)) return 0;

  if (booking.totalParticipants > 0) return booking.totalParticipants;

  const fallbackTotal =
    (booking.adults || 0) +
    (booking.youths || 0) +
    (booking.children || 0) +
    (booking.seniors || 0);

  return fallbackTotal > 0 ? fallbackTotal : 1;
}

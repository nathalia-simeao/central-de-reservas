import crypto from "node:crypto";

const PROVIDER = "STOREFRONT_SECURITY";
const WINDOW_MS = 60_000;
const RESERVE_LIMIT = 8;
const RELEASE_LIMIT = 24;
const buckets = new Map();

function clean(value, max = 255) {
  return String(value ?? "").trim().slice(0, max);
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function clientIp(request) {
  const forwarded = clean(request.headers.get("x-forwarded-for"), 512);
  if (forwarded) return forwarded.split(",")[0].trim();
  return (
    clean(request.headers.get("cf-connecting-ip"), 128) ||
    clean(request.headers.get("x-real-ip"), 128) ||
    "unknown"
  );
}

export function storefrontClientKey(request, shop = null) {
  return sha256(
    [clean(shop, 180) || "shop-unknown", clientIp(request) || "ip-unknown"].join("|"),
  );
}

export function consumeStorefrontRateLimit({
  key,
  action = "reserve",
  now = Date.now(),
} = {}) {
  const bucketKey = clean(key, 180) || "unknown";
  const normalizedAction = clean(action, 32).toLowerCase() || "reserve";
  const limit = normalizedAction === "release" ? RELEASE_LIMIT : RESERVE_LIMIT;
  const compoundKey = `${normalizedAction}:${bucketKey}`;
  const current = buckets.get(compoundKey);

  if (!current || now - current.windowStart >= WINDOW_MS) {
    buckets.set(compoundKey, { windowStart: now, count: 1 });
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: 0,
    };
  }

  current.count += 1;
  buckets.set(compoundKey, current);

  const allowed = current.count <= limit;
  return {
    allowed,
    limit,
    remaining: allowed ? Math.max(0, limit - current.count) : 0,
    retryAfterSeconds: allowed
      ? 0
      : Math.max(1, Math.ceil((WINDOW_MS - (now - current.windowStart)) / 1000)),
  };
}

function normalizedItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      variantId: clean(item?.variantId, 180),
      quantity: Number.parseInt(item?.quantity, 10) || 0,
    }))
    .sort((left, right) =>
      `${left.variantId}:${left.quantity}`.localeCompare(
        `${right.variantId}:${right.quantity}`,
      ),
    );
}

export function storefrontReserveFingerprint({ requestId, groups } = {}) {
  const normalized = (Array.isArray(groups) ? groups : [])
    .map((group) => ({
      key: clean(group?.key, 180),
      productId: clean(group?.productId, 180),
      date: clean(group?.date, 32),
      time: clean(group?.time, 32),
      language: clean(group?.language, 80),
      items: normalizedItems(group?.items),
    }))
    .sort((left, right) =>
      `${left.productId}|${left.date}|${left.time}|${left.key}`.localeCompare(
        `${right.productId}|${right.date}|${right.time}|${right.key}`,
      ),
    );

  return sha256(
    JSON.stringify({
      action: "reserve",
      requestId: clean(requestId, 120),
      groups: normalized,
    }),
  );
}

function requestEventId(requestId) {
  return `reserve:${clean(requestId, 120)}`;
}

function requestError(code, message, status = 409) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

export async function beginStorefrontRequest(
  prisma,
  { requestId, fingerprint, clientKey, shop = null } = {},
) {
  const externalEventId = requestEventId(requestId);
  const payload = {
    fingerprint,
    clientKey,
    requestId: clean(requestId, 120),
    source: "SHOPIFY_APP_PROXY",
  };

  try {
    const event = await prisma.integrationEvent.create({
      data: {
        provider: PROVIDER,
        externalEventId,
        topic: "STOREFRONT_HOLD_RESERVE",
        shop: clean(shop, 180) || null,
        status: "PROCESSING",
        payload,
      },
    });
    return { state: "NEW", event };
  } catch (error) {
    if (error?.code !== "P2002") throw error;
  }

  const existing = await prisma.integrationEvent.findUnique({
    where: {
      provider_externalEventId: {
        provider: PROVIDER,
        externalEventId,
      },
    },
  });

  if (!existing) {
    throw requestError(
      "REQUEST_NONCE_CONFLICT",
      "Checkout request could not be reserved safely. Please try again.",
      409,
    );
  }

  const existingFingerprint =
    existing?.payload &&
    typeof existing.payload === "object" &&
    !Array.isArray(existing.payload)
      ? existing.payload.fingerprint
      : null;

  if (!existingFingerprint || existingFingerprint !== fingerprint) {
    throw requestError(
      "REQUEST_ID_REUSED",
      "This checkout request ID was already used with different booking data.",
      409,
    );
  }

  if (existing.status === "PROCESSED") {
    return { state: "REPLAY", event: existing };
  }

  if (existing.status === "PROCESSING") {
    throw requestError(
      "REQUEST_IN_PROGRESS",
      "This checkout request is already being processed.",
      409,
    );
  }

  const event = await prisma.integrationEvent.update({
    where: { id: existing.id },
    data: {
      status: "PROCESSING",
      payload,
      result: null,
      error: null,
      processedAt: null,
    },
  });

  return { state: "RETRY", event };
}

export async function completeStorefrontRequest(
  prisma,
  { requestId, result } = {},
) {
  return prisma.integrationEvent.update({
    where: {
      provider_externalEventId: {
        provider: PROVIDER,
        externalEventId: requestEventId(requestId),
      },
    },
    data: {
      status: "PROCESSED",
      result: result || null,
      error: null,
      processedAt: new Date(),
    },
  });
}

export async function failStorefrontRequest(
  prisma,
  { requestId, error } = {},
) {
  const id = clean(requestId, 120);
  if (!id) return null;

  return prisma.integrationEvent.updateMany({
    where: {
      provider: PROVIDER,
      externalEventId: requestEventId(id),
      status: "PROCESSING",
    },
    data: {
      status: "FAILED",
      error: clean(error, 500) || "Storefront hold failed.",
      processedAt: new Date(),
    },
  });
}

export const storefrontSecurityConfig = {
  provider: PROVIDER,
  windowMs: WINDOW_MS,
  reserveLimit: RESERVE_LIMIT,
  releaseLimit: RELEASE_LIMIT,
};

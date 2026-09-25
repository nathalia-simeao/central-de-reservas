import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;
const KEY_VERSION = "v1";

function normalizeProvider(provider) {
  const value = String(provider || "").trim().toUpperCase();
  if (!value) throw new Error("Integration provider is required.");
  return value;
}

function encryptionKey() {
  const raw = String(process.env.INTEGRATION_ENCRYPTION_KEY || "").trim();
  if (!raw) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY is not configured on the server.",
    );
  }

  let key;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    key = null;
  }

  if (!key || key.length !== KEY_BYTES) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  }

  return key;
}

function canonicalJson(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Integration credentials must be an object.");
  }

  const keys = Object.keys(value).sort();
  const normalized = {};
  for (const key of keys) {
    const current = value[key];
    if (current !== undefined) normalized[key] = current;
  }
  return JSON.stringify(normalized);
}

function encryptCredentials(credentials) {
  const key = encryptionKey();
  const plaintext = canonicalJson(credentials);
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();
  const fingerprint = crypto
    .createHmac("sha256", key)
    .update(plaintext)
    .digest("hex")
    .slice(0, 16);

  return {
    credentialCiphertext: ciphertext.toString("base64"),
    credentialIv: iv.toString("base64"),
    credentialTag: tag.toString("base64"),
    credentialKeyVersion: KEY_VERSION,
    credentialFingerprint: fingerprint,
  };
}

function decryptCredentials(record) {
  if (!record) return null;
  if (record.credentialKeyVersion !== KEY_VERSION) {
    throw new Error(
      `Unsupported integration credential key version: ${record.credentialKeyVersion}`,
    );
  }

  const key = encryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(record.credentialIv, "base64"),
  );

  decipher.setAuthTag(Buffer.from(record.credentialTag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(record.credentialCiphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(plaintext);
}

function safeSecretRecord(record) {
  if (!record) return null;

  return {
    id: record.id,
    provider: record.provider,
    status: record.status,
    environment: record.environment,
    credentialKeyVersion: record.credentialKeyVersion,
    credentialFingerprint: record.credentialFingerprint,
    metadata: record.metadata || null,
    lastValidatedAt: record.lastValidatedAt,
    lastValidationStatus: record.lastValidationStatus,
    lastValidationMessage: record.lastValidationMessage,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    hasCredential: Boolean(record.credentialCiphertext),
  };
}

export function integrationEncryptionReady() {
  try {
    encryptionKey();
    return true;
  } catch {
    return false;
  }
}

export function integrationEnvironmentSecretStatus() {
  return {
    getyourguide: {
      incoming: Boolean(
        process.env.GYG_INCOMING_USER && process.env.GYG_INCOMING_PASS,
      ),
      outgoing: Boolean(
        process.env.GYG_OUTGOING_USER && process.env.GYG_OUTGOING_PASS,
      ),
      apiBase: Boolean(process.env.GYG_API_BASE),
    },
    viator: {
      configured: Boolean(
        process.env.VIATOR_API_KEY && process.env.VIATOR_SUPPLIER_ID,
      ),
    },
    headout: {
      configured: Boolean(process.env.HEADOUT_API_KEY),
    },
    civitatis: {
      configured: Boolean(
        process.env.CIVITATIS_API_KEY || process.env.CIVITATIS_OCTO_TOKEN,
      ),
    },
  };
}

export async function storeIntegrationCredentials(
  prisma,
  {
    provider,
    credentials,
    environment = null,
    metadata = null,
    status = "CONFIGURED",
    validation = null,
  },
) {
  const normalizedProvider = normalizeProvider(provider);
  const encrypted = encryptCredentials(credentials);
  const now = new Date();

  const record = await prisma.integrationSecret.upsert({
    where: { provider: normalizedProvider },
    create: {
      provider: normalizedProvider,
      status,
      environment,
      ...encrypted,
      metadata: metadata || undefined,
      lastValidatedAt: validation ? now : null,
      lastValidationStatus: validation?.status || null,
      lastValidationMessage: validation?.message || null,
    },
    update: {
      status,
      environment,
      ...encrypted,
      metadata: metadata || undefined,
      lastValidatedAt: validation ? now : undefined,
      lastValidationStatus: validation?.status || undefined,
      lastValidationMessage: validation?.message || undefined,
    },
  });

  return safeSecretRecord(record);
}

export async function getIntegrationCredentials(prisma, provider) {
  const normalizedProvider = normalizeProvider(provider);
  const record = await prisma.integrationSecret.findUnique({
    where: { provider: normalizedProvider },
  });

  if (!record) return null;

  return {
    record: safeSecretRecord(record),
    credentials: decryptCredentials(record),
  };
}

export async function getSafeIntegrationSecretStatus(prisma, provider) {
  const normalizedProvider = normalizeProvider(provider);
  const record = await prisma.integrationSecret.findUnique({
    where: { provider: normalizedProvider },
  });
  return safeSecretRecord(record);
}

export async function listSafeIntegrationSecretStatuses(prisma) {
  const records = await prisma.integrationSecret.findMany({
    orderBy: { provider: "asc" },
  });
  return records.map(safeSecretRecord);
}

export async function updateIntegrationValidation(
  prisma,
  provider,
  { status, message },
) {
  const normalizedProvider = normalizeProvider(provider);
  const record = await prisma.integrationSecret.update({
    where: { provider: normalizedProvider },
    data: {
      status: status === "CONNECTED" ? "CONNECTED" : "ERROR",
      lastValidatedAt: new Date(),
      lastValidationStatus: status,
      lastValidationMessage: message || null,
    },
  });
  return safeSecretRecord(record);
}

export async function removeIntegrationCredentials(prisma, provider) {
  const normalizedProvider = normalizeProvider(provider);
  const existing = await prisma.integrationSecret.findUnique({
    where: { provider: normalizedProvider },
    select: { id: true },
  });

  if (!existing) return { removed: false };

  await prisma.integrationSecret.delete({
    where: { provider: normalizedProvider },
  });

  return { removed: true };
}

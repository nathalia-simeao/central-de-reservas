import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_CONTEXT = "pmy:integration-credentials:v1";

function masterSecret() {
  const secret =
    process.env.INTEGRATION_ENCRYPTION_KEY ||
    process.env.SHOPIFY_API_SECRET;

  if (!secret) {
    throw new Error(
      "No integration encryption secret is configured on the server.",
    );
  }

  return secret;
}

function encryptionKey() {
  return crypto
    .createHash("sha256")
    .update(KEY_CONTEXT)
    .update("\0")
    .update(masterSecret())
    .digest();
}

export function encryptIntegrationCredentials(value) {
  const payload = JSON.stringify(value || {});
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);

  const ciphertext = Buffer.concat([
    cipher.update(payload, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    credentialCiphertext: ciphertext.toString("base64"),
    credentialIv: iv.toString("base64"),
    credentialTag: tag.toString("base64"),
    credentialVersion: 1,
  };
}

export function decryptIntegrationCredentials(record) {
  if (
    !record?.credentialCiphertext ||
    !record?.credentialIv ||
    !record?.credentialTag
  ) {
    return {};
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    encryptionKey(),
    Buffer.from(record.credentialIv, "base64"),
  );

  decipher.setAuthTag(Buffer.from(record.credentialTag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(record.credentialCiphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(plaintext);
}

export function integrationEncryptionSource() {
  if (process.env.INTEGRATION_ENCRYPTION_KEY) {
    return "DEDICATED_KEY";
  }
  if (process.env.SHOPIFY_API_SECRET) {
    return "SHOPIFY_SECRET_DERIVED";
  }
  return "UNAVAILABLE";
}

import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  storeIntegrationCredentials,
  getIntegrationCredentials,
  integrationKeyStatus,
  reencryptIntegrationSecrets,
  integrationKeyRotationEnv,
} from "../app/utils/integration-secrets.server.js";

function fakePrisma() {
  const rows = new Map();
  let n = 0;
  return {
    integrationSecret: {
      async upsert({ where, create, update }) {
        const existing = rows.get(where.provider);
        const row = existing ? { ...existing, ...update } : { id: String(++n), createdAt: new Date(), updatedAt: new Date(), ...create };
        rows.set(where.provider, row);
        return row;
      },
      async findUnique({ where }) { return rows.get(where.provider) || null; },
      async findMany() { return [...rows.values()]; },
      async update({ where, data }) {
        const row = [...rows.values()].find((r) => r.id === where.id || r.provider === where.provider);
        Object.assign(row, data);
        return row;
      },
    },
  };
}

const key = () => crypto.randomBytes(32).toString("base64");

test("troca da chave: lê com a anterior e recriptografa com a nova", async () => {
  const prisma = fakePrisma();
  const oldKey = key();
  const newKey = key();
  process.env.INTEGRATION_ENCRYPTION_KEY = oldKey;
  delete process.env.INTEGRATION_ENCRYPTION_KEY_PREVIOUS;
  await storeIntegrationCredentials(prisma, { provider: "viator", credentials: { apiKey: "abc" } });

  process.env.INTEGRATION_ENCRYPTION_KEY = newKey;
  await assert.rejects(() => getIntegrationCredentials(prisma, "VIATOR"));

  process.env.INTEGRATION_ENCRYPTION_KEY_PREVIOUS = oldKey;
  assert.deepEqual(integrationKeyRotationEnv(), { currentReady: true, previousConfigured: true, previousValid: true, sameAsCurrent: false });
  assert.deepEqual(await integrationKeyStatus(prisma), [{ provider: "VIATOR", key: "previous" }]);
  assert.deepEqual((await getIntegrationCredentials(prisma, "VIATOR")).credentials, { apiKey: "abc" });

  assert.deepEqual(await reencryptIntegrationSecrets(prisma), [{ provider: "VIATOR", result: "reencrypted" }]);
  assert.deepEqual(await integrationKeyStatus(prisma), [{ provider: "VIATOR", key: "current" }]);

  delete process.env.INTEGRATION_ENCRYPTION_KEY_PREVIOUS;
  assert.deepEqual((await getIntegrationCredentials(prisma, "VIATOR")).credentials, { apiKey: "abc" });
});

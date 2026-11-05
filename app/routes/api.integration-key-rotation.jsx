import { data } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { requireCentralAdmin } from "../utils/central-access.server.js";
import {
  integrationKeyRotationEnv,
  integrationKeyStatus,
  reencryptIntegrationSecrets,
} from "../utils/integration-secrets.server.js";

// Configurações → Chave de criptografia: recriptografa as credenciais de
// integração com a INTEGRATION_ENCRYPTION_KEY nova. Só administradores.
export const loader = async ({ request }) => {
  await requireCentralAdmin(db, authenticate, request);
  return data({ success: true, env: integrationKeyRotationEnv(), records: await integrationKeyStatus(db) });
};

export const action = async ({ request }) => {
  await requireCentralAdmin(db, authenticate, request);
  const env = integrationKeyRotationEnv();
  if (!env.currentReady) return data({ success: false, error: "INTEGRATION_ENCRYPTION_KEY ausente ou inválida." }, { status: 400 });
  if (!env.previousConfigured || !env.previousValid) {
    return data({ success: false, error: "Configure INTEGRATION_ENCRYPTION_KEY_PREVIOUS com a chave antiga e reinicie a Central." }, { status: 400 });
  }
  if (env.sameAsCurrent) return data({ success: false, error: "A chave antiga e a nova estão iguais." }, { status: 400 });
  const results = await reencryptIntegrationSecrets(db);
  console.log("[SECURITY] Integration credentials re-encrypted", results);
  return data({ success: results.every((r) => r.result !== "unreadable"), results, records: await integrationKeyStatus(db) });
};

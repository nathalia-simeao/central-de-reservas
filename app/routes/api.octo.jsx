import { data } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { requireCentralAdmin } from "../utils/central-access.server.js";
import { integrationEncryptionReady } from "../utils/integration-secrets.server";
import { generateOctoKey, isOctoReseller, octoStatuses, removeOctoKey, setOctoLive } from "../utils/octo.server";

// Integrações → Conexão OCTO (Klook, Tiqets, Headout): gerar a chave de cada
// plataforma, ver se ela já chamou a Central e marcar quando já está vendendo.
const json = (body, init) => data(body, init);
const clean = (v) => String(v ?? "").trim();

async function status(request) {
  const origin = String(process.env.SHOPIFY_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  return { encryptionReady: integrationEncryptionReady(), endpoint: `${origin}/octo`, resellers: await octoStatuses(db) };
}

export const loader = async ({ request }) => {
  await requireCentralAdmin(db, authenticate, request);
  return json({ success: true, ...(await status(request)) });
};

export const action = async ({ request }) => {
  const { user } = await requireCentralAdmin(db, authenticate, request);
  const form = await request.formData();
  const intent = clean(form.get("intent"));
  const key = clean(form.get("platform")).toUpperCase();
  if (!isOctoReseller(key)) return json({ success: false, error: "Plataforma inválida." }, { status: 400 });

  if (intent === "generate") {
    if (!integrationEncryptionReady()) return json({ success: false, error: "Armazenamento criptografado não está pronto (INTEGRATION_ENCRYPTION_KEY)." }, { status: 503 });
    const token = await generateOctoKey(db, key, { by: user?.name || user?.email || null });
    return json({ success: true, token, platform: key, ...(await status(request)) });
  }
  if (intent === "remove") {
    await removeOctoKey(db, key);
    return json({ success: true, ...(await status(request)) });
  }
  if (intent === "live") {
    await setOctoLive(db, key, clean(form.get("live")) === "true");
    return json({ success: true, ...(await status(request)) });
  }
  return json({ success: false, error: "Ação inválida." }, { status: 400 });
};

import { data } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { requireCentralAdmin } from "../utils/central-access.server.js";
import {
  integrationEncryptionReady,
  removeIntegrationCredentials,
  storeIntegrationCredentials,
} from "../utils/integration-secrets.server";
import {
  GMAIL_PROVIDER, dismissGmailEvent, gmailCredentials, gmailReviewCount, listGmailInbox,
  readGmailState, resolveGmailEvent, runGmailSync, saveGmailState, testGmail,
} from "../services/gmail-sync.server";

// Integrações → Gmail: e-mail + senha de app (criptografados), leitura a cada
// 5 minutos, "Ler agora", buscar reservas antigas e a lista "Para revisar".
const json = (body, init) => data(body, init);
const clean = (v) => String(v ?? "").trim();

async function status({ inbox = false } = {}) {
  const state = await readGmailState(db);
  const tours = inbox
    ? await db.tour.findMany({ select: { id: true, title: true, scheduleSlots: true }, orderBy: { title: "asc" } }).catch(() => [])
    : undefined;
  return {
    encryptionReady: integrationEncryptionReady(),
    configured: state.configured,
    email: state.email,
    enabled: state.enabled,
    connectedAt: state.connectedAt,
    lastRunAt: state.lastRunAt,
    lastOkAt: state.lastOkAt,
    lastError: state.lastError,
    lastSummary: state.lastSummary,
    aliasCount: Object.keys(state.aliases || {}).length,
    reviewCount: await gmailReviewCount(db),
    ...(inbox ? { inbox: await listGmailInbox(db), tours } : {}),
  };
}

export const loader = async ({ request }) => {
  await requireCentralAdmin(db, authenticate, request);
  const url = new URL(request.url);
  return json({ success: true, ...(await status({ inbox: url.searchParams.get("inbox") === "1" })) });
};

export const action = async ({ request }) => {
  const { user } = await requireCentralAdmin(db, authenticate, request);
  const by = user?.name || user?.email || null;
  const form = await request.formData();
  const intent = clean(form.get("intent"));

  if (intent === "save") {
    if (!integrationEncryptionReady()) return json({ success: false, error: "Armazenamento criptografado não está pronto (INTEGRATION_ENCRYPTION_KEY)." }, { status: 503 });
    const current = await gmailCredentials(db);
    const email = clean(form.get("email")).toLowerCase() || current?.email || "";
    const appPassword = clean(form.get("appPassword")).replace(/\s+/g, "") || current?.appPassword || "";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ success: false, error: "Digite o e-mail do Gmail que recebe as reservas." }, { status: 400 });
    if (!/^[a-z]{16}$/i.test(appPassword)) return json({ success: false, error: "Essa parece a senha normal do Gmail. Aqui vai a \"senha de app\": 16 letras que o Google gera em myaccount.google.com/apppasswords (ex.: abcd efgh ijkl mnop)." }, { status: 400 });
    const test = await testGmail({ email, appPassword });
    if (!test.ok) return json({ success: false, error: test.error }, { status: 400 });
    const previous = await readGmailState(db);
    const sameAccount = previous.email === email;
    await storeIntegrationCredentials(db, {
      provider: GMAIL_PROVIDER,
      credentials: { email, appPassword },
      environment: "live",
      status: "CONNECTED",
      metadata: {
        ...(previous.record?.metadata || {}),
        email,
        enabled: true,
        connectedAt: sameAccount && previous.connectedAt ? previous.connectedAt : new Date().toISOString(),
        ...(sameAccount ? {} : { lastUid: 0, uidValidity: null, mailbox: null }),
        lastError: null,
        savedBy: by,
      },
      validation: { status: "CONNECTED", message: `Conectado a ${email} (${test.mailbox}).` },
    });
    return json({ success: true, ...(await status({ inbox: true })) });
  }

  if (intent === "remove") {
    await removeIntegrationCredentials(db, GMAIL_PROVIDER);
    return json({ success: true, ...(await status()) });
  }

  if (intent === "toggle") {
    const state = await readGmailState(db);
    if (!state.configured) return json({ success: false, error: "Conecte o Gmail primeiro." }, { status: 409 });
    await saveGmailState(db, { enabled: clean(form.get("enabled")) === "true" });
    return json({ success: true, ...(await status({ inbox: true })) });
  }

  if (intent === "run") {
    const result = await runGmailSync(db);
    if (!result.ok) return json({ success: false, error: result.error, ...(await status({ inbox: true })) }, { status: 502 });
    return json({ success: true, summary: result.summary, ...(await status({ inbox: true })) });
  }

  // Reservas já recebidas antes de ligar: vão todas para "Para revisar" (nada entra sozinho).
  if (intent === "backfill") {
    const days = Math.min(120, Math.max(1, Number(form.get("days")) || 60));
    const since = new Date(Date.now() - days * 86400000);
    const result = await runGmailSync(db, { since, mode: "review", max: 500 });
    if (!result.ok) return json({ success: false, error: result.error, ...(await status({ inbox: true })) }, { status: 502 });
    return json({ success: true, summary: result.summary, ...(await status({ inbox: true })) });
  }

  if (intent === "resolve") {
    const result = await resolveGmailEvent(db, {
      eventId: clean(form.get("eventId")),
      tourId: clean(form.get("tourId")),
      dateKey: clean(form.get("date")),
      timeKey: clean(form.get("time")),
      pax: { total: Number(form.get("pax")) || 0, adults: Number(form.get("adults")) || 0, children: Number(form.get("children")) || 0 },
      language: clean(form.get("language")) || null,
      customerName: clean(form.get("customerName")) || null,
      remember: clean(form.get("remember")) !== "false",
      by,
    });
    if (!result.ok) return json({ success: false, error: result.error }, { status: 400 });
    return json({ success: true, result: result.result, ...(await status({ inbox: true })) });
  }

  if (intent === "dismiss") {
    const result = await dismissGmailEvent(db, clean(form.get("eventId")), by);
    if (!result.ok) return json({ success: false, error: result.error }, { status: 400 });
    return json({ success: true, ...(await status({ inbox: true })) });
  }

  return json({ success: false, error: "Ação inválida." }, { status: 400 });
};

import { data } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { requireCentralAdmin } from "../utils/central-access.server.js";

// Troca da chave secreta do app Shopify (client secret) sem derrubar a Central.
//
// Durante a troca a Shopify mantém as duas chaves ativas e continua assinando
// webhooks, app proxy e ID tokens com a ANTIGA. Por isso a Central segue rodando
// com SHOPIFY_API_SECRET = antiga e só os tokens de acesso salvos são migrados
// para a NOVA (SHOPIFY_API_SECRET_NEXT). Depois disso: revogar a antiga no
// Dev Dashboard, colocar a nova em SHOPIFY_API_SECRET, apagar a _NEXT e reiniciar.
// https://shopify.dev/docs/apps/build/authentication-authorization/manage-credentials

const nextSecret = () => String(process.env.SHOPIFY_API_SECRET_NEXT || "").trim();

function describe(session) {
  return {
    id: session.id,
    shop: session.shop,
    hasRefreshToken: Boolean(session.refreshToken),
    expires: session.expires ? session.expires.toISOString() : null,
    refreshTokenExpires: session.refreshTokenExpires ? session.refreshTokenExpires.toISOString() : null,
  };
}

async function offlineSessions() {
  return db.session.findMany({ where: { isOnline: false }, orderBy: { id: "asc" } });
}

export const loader = async ({ request }) => {
  await requireCentralAdmin(db, authenticate, request);
  const sessions = await offlineSessions();
  const current = String(process.env.SHOPIFY_API_SECRET || "").trim();
  return data({
    success: true,
    nextConfigured: Boolean(nextSecret()),
    nextDiffersFromCurrent: Boolean(nextSecret()) && nextSecret() !== current,
    onlineSessions: await db.session.count({ where: { isOnline: true } }),
    sessions: sessions.map(describe),
  });
};

async function exchange(shop, body) {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* resposta não-JSON */ }
  if (!response.ok || !json?.access_token) {
    const reason = json?.error_description || json?.error || json?.errors || `HTTP ${response.status}`;
    throw new Error(`Shopify recusou a troca do token (${typeof reason === "string" ? reason : JSON.stringify(reason)}).`);
  }
  return json;
}

async function verifyToken(shop, accessToken) {
  const response = await fetch(`https://${shop}/admin/api/2026-04/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken },
    body: JSON.stringify({ query: "{ shop { name } }" }),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.data?.shop?.name) throw new Error(`O token novo não funcionou (HTTP ${response.status}).`);
  return json.data.shop.name;
}

export const action = async ({ request }) => {
  await requireCentralAdmin(db, authenticate, request);
  if (request.method !== "POST") return data({ success: false, error: "Método inválido." }, { status: 405 });

  const secret = nextSecret();
  const current = String(process.env.SHOPIFY_API_SECRET || "").trim();
  if (!secret) {
    return data({ success: false, error: "Configure SHOPIFY_API_SECRET_NEXT no Northflank com a chave nova e reinicie a Central." }, { status: 400 });
  }
  if (secret === current) {
    return data({ success: false, error: "SHOPIFY_API_SECRET_NEXT está igual à chave atual. Cole a chave NOVA (marcada como New no Dev Dashboard)." }, { status: 400 });
  }

  const form = await request.formData();
  const rotationRefreshToken = String(form.get("rotationRefreshToken") || "").trim();
  const clientId = String(process.env.SHOPIFY_API_KEY || "").trim();
  const results = [];

  for (const session of await offlineSessions()) {
    try {
      let body;
      if (session.refreshToken) {
        body = { client_id: clientId, client_secret: secret, grant_type: "refresh_token", refresh_token: session.refreshToken };
      } else if (rotationRefreshToken) {
        // Token offline sem validade (antigo): fluxo de "re-pin" com o refresh token do Dev Dashboard.
        body = { client_id: clientId, client_secret: secret, refresh_token: rotationRefreshToken, access_token: session.accessToken };
      } else {
        results.push({ shop: session.shop, ok: false, needsRotationRefreshToken: true, error: "Token antigo sem refresh token: gere o \"refresh token\" de rotação no Dev Dashboard e cole aqui." });
        continue;
      }

      const token = await exchange(session.shop, body);
      const shopName = await verifyToken(session.shop, token.access_token);
      const now = Date.now();
      await db.session.update({
        where: { id: session.id },
        data: {
          accessToken: token.access_token,
          scope: token.scope || session.scope,
          expires: token.expires_in ? new Date(now + Number(token.expires_in) * 1000) : null,
          refreshToken: token.refresh_token || null,
          refreshTokenExpires: token.refresh_token_expires_in ? new Date(now + Number(token.refresh_token_expires_in) * 1000) : null,
        },
      });
      results.push({ shop: session.shop, ok: true, shopName, expiresInMinutes: token.expires_in ? Math.round(Number(token.expires_in) / 60) : null });
    } catch (error) {
      results.push({ shop: session.shop, ok: false, error: error?.message || "Erro desconhecido." });
    }
  }

  console.log("[SHOPIFY] Client secret rotation: tokens migrated", results.map((r) => ({ shop: r.shop, ok: r.ok })));
  return data({ success: results.length > 0 && results.every((r) => r.ok), results });
};

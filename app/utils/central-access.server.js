// Perfis da Central (pedido do cliente, 03/11/2026).
//
// Quem abre a Central pelo admin do Shopify é identificado pelo usuário
// Shopify do token de sessão (sessionToken.sub). Cada usuário tem um papel:
//   ADMIN — vê e altera tudo;
//   STAFF — equipe comercial/operação: sem Financeiro, Desempenho, Saúde das
//           integrações, Integrações e Configurações.
// Bootstrap: enquanto não houver nenhum ADMIN, o primeiro usuário a abrir a
// Central vira ADMIN. Depois disso, novos usuários entram como STAFF e um
// ADMIN promove quem quiser em Configurações → Equipe.

export const ROLES = ["ADMIN", "STAFF"];

export function shopifyUserIdFromAuth(auth) {
  const sub = auth?.sessionToken?.sub;
  if (sub === undefined || sub === null || sub === "") return null;
  return String(sub);
}

export async function resolveCentralUser(prisma, auth) {
  // Adm logado pelo app do celular (sem conta Shopify): acesso total.
  if (auth?.portalPerson) {
    return { id: null, shopifyUserId: null, name: auth.portalPerson.name || null, role: "ADMIN", portal: true, guideId: auth.portalPerson.id };
  }
  const shopifyUserId = shopifyUserIdFromAuth(auth);
  // Requests without a staff token (e.g. non-embedded or legacy flows) keep
  // the previous behaviour: full access, so nothing that worked breaks.
  if (!shopifyUserId) return { id: null, shopifyUserId: null, name: null, role: "ADMIN", legacy: true };

  try {
    const existing = await prisma.centralUser.findUnique({ where: { shopifyUserId } });
    if (existing) {
      const stale = Date.now() - new Date(existing.lastSeenAt).getTime() > 10 * 60 * 1000;
      if (stale) {
        prisma.centralUser
          .update({ where: { id: existing.id }, data: { lastSeenAt: new Date() } })
          .catch(() => {});
      }
      return existing;
    }
    const adminCount = await prisma.centralUser.count({ where: { role: "ADMIN" } });
    return await prisma.centralUser.create({
      data: { shopifyUserId, role: adminCount === 0 ? "ADMIN" : "STAFF" },
    });
  } catch (error) {
    // Migration not applied yet: do not lock anybody out.
    console.error("[PMY] resolveCentralUser failed:", error?.message || error);
    return { id: null, shopifyUserId, name: null, role: "ADMIN", legacy: true };
  }
}

export function isAdmin(user) {
  return String(user?.role || "").toUpperCase() === "ADMIN";
}

export function forbiddenResponse() {
  return new Response(
    JSON.stringify({ success: false, error: "Acesso restrito a administradores da Central." }),
    { status: 403, headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
}

/** For resource routes: authenticate and require an ADMIN in one call. */
export async function requireCentralAdmin(prisma, _authenticate, request) {
  const { authenticateCentral } = await import("./central-auth.server.js");
  const auth = await authenticateCentral(request);
  const user = await resolveCentralUser(prisma, auth);
  if (!isAdmin(user)) throw forbiddenResponse();
  return { auth, user };
}

// Central actions (POST /api/central-actions or "/") that only admins may run.
export const ADMIN_ONLY_ACTIONS = new Set([
  "saveCostSettings",
  "saveBusinessSettings",
  "savePlatformFieldMapping",
  "saveGygTourConfig",
  "saveTourPassport",
  "createTour",
  "syncQueueRun",
  "syncQueueRequeue",
  "saveCentralUser",
  "setGuidePortalAccess",
  "resetDepartureCheck",
  "savePlatformPrices",
  "moveDeparture",
  "saveFeatureFlags",
  "importTrelloBoard",
  "createTrelloFileToken",
  "saveSupportCard",
  "deleteSupportCard",
  "uploadSupportAttachment",
  "removeSupportAttachment",
]);

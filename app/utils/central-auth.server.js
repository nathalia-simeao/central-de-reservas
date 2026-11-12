// Acesso à Central fora do admin do Shopify (pedido 11/11/2026).
//
// Adms entram pelo app do celular (PMY Guias) com o mesmo e-mail + senha do
// portal, sem conta de usuário no Shopify (que exigiria upgrade de plano).
// Quem conta como adm: pessoa da Equipe com a área "Administração", ou cujo
// acesso na Central (CentralUser ligado ao cadastro) é ADMIN.
//
// Dentro do admin do Shopify nada muda: a requisição traz o token da sessão
// (Bearer / shop / host) e segue pelo authenticate.admin de sempre.

import db from "../db.server";
import { authenticate, unauthenticated } from "../shopify.server";
import { getGuideFromRequest } from "./guide-portal.server";
import { resolvePrimaryShop } from "./single-tenant.server";
import { personAreas } from "./team-areas";

function hasShopifyContext(request) {
  const bearer = String(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (bearer && bearer !== "undefined" && bearer !== "null") return true;
  const url = new URL(request.url);
  return ["shop", "host", "id_token", "embedded", "hmac"].some((key) => url.searchParams.has(key));
}

/** A pessoa do app é administradora (área Administração ou acesso ADMIN na Central)? */
export async function isPortalAdmin(person) {
  if (!person) return false;
  if (personAreas(person).includes("ADMIN")) return true;
  const linked = await db.centralUser
    .findFirst({ where: { guideId: person.id, role: "ADMIN" }, select: { id: true } })
    .catch(() => null);
  return Boolean(linked);
}

/** Pessoa logada no app com perfil de adm, ou null. */
export async function portalAdminFromRequest(request) {
  const person = await getGuideFromRequest(db, request).catch(() => null);
  return (await isPortalAdmin(person)) ? person : null;
}

/** Igual a authenticate.admin, mas aceita o adm logado pelo app. */
export async function authenticateCentral(request) {
  if (!hasShopifyContext(request)) {
    const person = await portalAdminFromRequest(request);
    if (person) {
      const { shop } = await resolvePrimaryShop(db, { allowInitialize: false });
      if (!shop) throw new Response("Loja Shopify não configurada.", { status: 503 });
      const context = await unauthenticated.admin(shop);
      return {
        ...context,
        sessionToken: null,
        portalPerson: { id: person.id, name: person.name, email: person.email || null },
      };
    }
  }
  return authenticate.admin(request);
}

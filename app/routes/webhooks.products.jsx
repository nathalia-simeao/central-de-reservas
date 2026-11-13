// A Shopify avisa quando um produto muda (preço, variantes, horários, bloqueios):
// a Central relê o catálogo para o app dos guias e a Agenda ficarem iguais ao site.
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { syncCatalogFromShopify } from "../utils/catalog-auto-sync.server";
import { refreshTourTranslationsForHandle } from "../utils/tour-translations.server";

export const action = async ({ request }) => {
  const { topic, shop, tenantAllowed, payload } = await authenticate.webhook(request);
  if (!tenantAllowed) return new Response(null, { status: 200 });
  // Responde rápido para a Shopify e lê o catálogo em seguida.
  syncCatalogFromShopify(db, { reason: `${topic} ${shop}` })
    .then(() => (payload?.handle ? refreshTourTranslationsForHandle(db, payload.handle) : null))
    .catch((error) => console.error("[CATALOG_SYNC] webhook failed:", error?.message || error));
  return new Response(null, { status: 200 });
};

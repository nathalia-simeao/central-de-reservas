// Preços, horários e opções dos passeios sempre iguais aos da Shopify
// (pedido da Nathalia, 13/11/2026: "os preços mudam bastante").
// - A Shopify avisa na hora (webhook products/update → /webhooks/products).
// - Por garantia, o worker relê o catálogo a cada 10 minutos.

import { unauthenticated } from "../shopify.server";
import { resolvePrimaryShop } from "./single-tenant.server";
import { fetchShopifyCatalog } from "./platform-sync.server";
import { syncShopifyCatalogToMasterTours } from "./tour-passport.server";

const MIN_GAP_MS = 20 * 1000; // vários avisos seguidos da Shopify viram uma leitura só
let lastRunAt = 0;
let running = null;

export async function syncCatalogFromShopify(prisma, { reason = "manual", force = false } = {}) {
  if (running) return running;
  if (!force && Date.now() - lastRunAt < MIN_GAP_MS) return { skipped: "recent" };
  running = (async () => {
    lastRunAt = Date.now();
    const { shop } = await resolvePrimaryShop(prisma, { allowInitialize: false });
    if (!shop) return { skipped: "no-shop" };
    const { admin } = await unauthenticated.admin(shop);
    const products = await fetchShopifyCatalog(admin);
    const result = await syncShopifyCatalogToMasterTours(prisma, products);
    console.log(`[CATALOG_SYNC] ${reason}: ${products.length} produtos, ${result?.variantsUpdated ?? 0} variantes atualizadas`);
    return { ok: true, products: products.length, ...result };
  })();
  try {
    return await running;
  } finally {
    running = null;
  }
}

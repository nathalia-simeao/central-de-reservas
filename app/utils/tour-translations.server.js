// Traduções dos passeios como estão no site (pedido da Nathalia, 13/11/2026):
// a loja publica cada produto traduzido em /<idioma>/products/<handle>.js.
// A Central guarda título, opções e variantes de cada idioma em Tour.translations
// e o app do guia mostra no idioma escolhido.

const SITE = process.env.PMY_STOREFRONT_URL || "https://portugalmeandyou.com";
const LOCALES = ["pt", "es", "fr", "it", "de"];
const REFRESH_EVERY_MS = 6 * 60 * 60 * 1000;
let lastRunAt = 0;
let running = null;

const gidVariant = (id) => `gid://shopify/ProductVariant/${id}`;

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`${response.status} em ${url}`);
  return response.json();
}

function pick(product) {
  const options = (product?.options || []).map((o) => ({ name: String(o?.name || ""), values: (o?.values || []).map(String) }));
  const variants = {};
  for (const v of product?.variants || []) {
    variants[gidVariant(v.id)] = { title: String(v.title || ""), options: [v.option1, v.option2, v.option3].filter((x) => x != null).map(String) };
  }
  return { title: String(product?.title || ""), options, variants };
}

/** Lê as traduções de um passeio (handle) em todos os idiomas do app. */
export async function fetchTourTranslations(handle) {
  const out = {};
  // Inglês (idioma principal do site) serve de base para casar as opções.
  out.en = pick(await fetchJson(`${SITE}/products/${encodeURIComponent(handle)}.js`));
  for (const locale of LOCALES) {
    try {
      out[locale] = pick(await fetchJson(`${SITE}/${locale}/products/${encodeURIComponent(handle)}.js`));
    } catch {
      // Idioma sem tradução no site: fica o original.
    }
  }
  return out;
}

export async function refreshTourTranslations(prisma, { force = false } = {}) {
  if (running) return running;
  if (!force && Date.now() - lastRunAt < REFRESH_EVERY_MS) return { skipped: "recent" };
  running = (async () => {
    lastRunAt = Date.now();
    const tours = await prisma.tour.findMany({ where: { shopifyStatus: "ACTIVE" }, select: { id: true, shopifySnapshot: true } });
    let updated = 0;
    let failed = 0;
    for (const tour of tours) {
      const handle = tour.shopifySnapshot?.handle;
      if (!handle) continue;
      try {
        const translations = await fetchTourTranslations(handle);
        await prisma.tour.update({ where: { id: tour.id }, data: { translations: { ...translations, fetchedAt: new Date().toISOString() } } });
        updated += 1;
      } catch (error) {
        failed += 1;
        console.error(`[TRANSLATIONS] ${handle}:`, error?.message || error);
      }
    }
    console.log(`[TRANSLATIONS] ${updated} passeios atualizados, ${failed} com erro`);
    return { updated, failed };
  })();
  try {
    return await running;
  } finally {
    running = null;
  }
}

/** Um passeio só (quando a Shopify avisa que ele mudou). */
export async function refreshTourTranslationsForHandle(prisma, handle) {
  if (!handle) return null;
  const tours = await prisma.tour.findMany({ where: { shopifyStatus: "ACTIVE" }, select: { id: true, shopifySnapshot: true } });
  const tour = tours.find((t) => t.shopifySnapshot?.handle === handle);
  if (!tour) return null;
  const translations = await fetchTourTranslations(handle);
  await prisma.tour.update({ where: { id: tour.id }, data: { translations: { ...translations, fetchedAt: new Date().toISOString() } } });
  return { updated: 1 };
}

/** Títulos dos passeios no idioma do app (id → título). */
export async function tourTitlesIn(prisma, tourIds, lang) {
  const ids = [...new Set((tourIds || []).filter(Boolean))];
  if (!ids.length || !lang) return new Map();
  const rows = await prisma.tour.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, translations: true } });
  return new Map(rows.map((r) => [r.id, r.translations?.[lang]?.title || r.title]));
}

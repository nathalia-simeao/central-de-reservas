// Liga um passeio de outro canal (ex.: GetYourGuide) ao produto da Shopify
// equivalente, mesmo quando o nome é diferente, para herdar a cor escolhida
// em Integrações → Produtos → Shopify Store.

const STOPWORDS = new Set([
  "a", "an", "and", "the", "of", "in", "with", "from", "to", "for", "at", "by", "on", "or",
  "de", "da", "do", "das", "dos", "e", "em", "com", "para", "o", "os", "as", "um", "uma",
  "tour", "tours", "guided", "guide", "visit", "visita", "passeio", "experience", "ticket", "tickets",
  "included", "entrance", "small", "group", "private", "lisbon", "lisboa", "hour", "hours",
]);

export function titleTokens(value) {
  return new Set(
    String(value || "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((word) => word.length > 2 && !STOPWORDS.has(word)),
  );
}

export function titleSimilarity(a, b) {
  const left = titleTokens(a);
  const right = titleTokens(b);
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  // Overlap relativo ao título mais curto: "Jerónimos Monastery" ≈ "Jerónimos Monastery Guided Tour with Entrance Ticket".
  return shared / Math.min(left.size, right.size);
}

/**
 * @param group { key: masterTourId, name }
 * @param shopifyProducts [{ masterTourId, name, active }]
 * @returns { colorKey, product, matchedBy: "id" | "name" | null }
 */
export function matchShopifyProduct(group, shopifyProducts = [], minScore = 0.6) {
  const byId = shopifyProducts.find((product) => product.masterTourId && product.masterTourId === group.key);
  if (byId) return { colorKey: byId.masterTourId, product: byId, matchedBy: "id" };
  let best = null;
  let bestScore = 0;
  for (const product of shopifyProducts) {
    if (!product.masterTourId) continue;
    const score = titleSimilarity(group.name, product.name);
    if (score > bestScore) { best = product; bestScore = score; }
  }
  if (best && bestScore >= minScore) return { colorKey: best.masterTourId, product: best, matchedBy: "name", score: bestScore };
  return { colorKey: group.key, product: null, matchedBy: null };
}

/**
 * Para todos os passeios mestre: qual chave de cor usar (a do produto da Shopify
 * equivalente) e quais estão inativos na Shopify.
 * @param tours [{ id, title }]
 * @param shopifyProducts [{ masterTourId, name, active }]
 */
export function buildTourColorAliases(tours = [], shopifyProducts = []) {
  const colorAliases = {};
  const inactiveTours = {};
  for (const product of shopifyProducts) {
    if (product?.masterTourId && product.active === false) inactiveTours[product.masterTourId] = true;
  }
  for (const tour of tours) {
    if (!tour?.id) continue;
    const match = matchShopifyProduct({ key: tour.id, name: tour.title || tour.name }, shopifyProducts);
    if (match.colorKey !== tour.id) colorAliases[tour.id] = match.colorKey;
  }
  return { colorAliases, inactiveTours };
}

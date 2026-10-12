function normalized(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}
export function classifyShopifyProduct(product) {
  const collections = (product.collections || []).map(c => normalized(typeof c === "string" ? c : c.title));
  const tags = (product.tags || []).map(normalized);
  const type = normalized(product.productType);
  const title = normalized(product.name || product.title);
  const source = [...collections, ...tags, type];
  const has = pattern => source.some(value => pattern.test(value));
  const italy = has(/\b(italy|italia|italian|naples|napoli|amalfi|positano|ravello|rome|roma|florence|firenze)\b/);
  // Names only provide geographic hints if metadata is silent.
  const italyTitle = /\b(naples|napoli|amalfi|positano|ravello|rome|roma|florence|firenze)\b/.test(title);
  // PMY currently operates Portuguese experiences plus the Naples/Amalfi Italy product.
  // Explicit Italy signals take precedence; all other PMY experiences default to Portugal.
  const country = italyTitle || italy ? "IT" : "PT";
  const wellness = has(/\b(wellness|wellbeing|wellness & spa|spa|massage|massagem|therap(y|ies)|terapia|beauty)\b/);
  const vip = has(/\b(vip|premium service|vip service|private transfer|airport transfer|chauffeur|concierge|luxury transport)\b/);
  const tour = has(/\b(tour|tours|experience|experiences|walking|day trip|day trips|excursion|excursions|boat trip|boat tours)\b/);
  const category = wellness ? "WELLNESS" : vip ? "VIP" : tour ? "TOUR" : "UNKNOWN";
  return { country, category };
}

// Preço por plataforma num só lugar (item 3 do cliente).
//
// BusinessSetting.platformPrices:
//   { tours: { [tourId]: { [PLATFORM]: { ADULT: 69, CHILD: 35, YOUTH: 50, SENIOR: 60 } } } }
// Valores em euros. Plataforma sem preço cadastrado usa o preço do site (Shopify).
// Hoje o GetYourGuide recebe esses valores automaticamente quando o passeio tem
// "Preço via API" ligado; as outras plataformas ficam registradas até serem conectadas.

export const PRICE_PLATFORMS = ["GETYOURGUIDE", "VIATOR", "HEADOUT", "CIVITATIS", "AIRBNB", "TIQETS", "KLOOK"];
export const PRICE_CATEGORIES = ["ADULT", "CHILD", "YOUTH", "SENIOR"];

function euros(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n < 100000 ? Math.round(n * 100) / 100 : null;
}

export function normalizePlatformPrices(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const tours = {};
  for (const [tourId, perPlatform] of Object.entries(source.tours && typeof source.tours === "object" ? source.tours : {})) {
    const clean = {};
    for (const platform of PRICE_PLATFORMS) {
      const prices = {};
      for (const category of PRICE_CATEGORIES) {
        const value = euros(perPlatform?.[platform]?.[category]);
        if (value !== null) prices[category] = value;
      }
      if (Object.keys(prices).length) clean[platform] = prices;
    }
    if (Object.keys(clean).length) tours[String(tourId)] = clean;
  }
  return { tours };
}

/** GYG retailPrices (cents) for a tour, or null when nothing is configured. */
export function gygRetailPricesFor(platformPrices, tourId) {
  const prices = normalizePlatformPrices(platformPrices).tours[tourId]?.GETYOURGUIDE;
  if (!prices) return null;
  const retailPrices = PRICE_CATEGORIES
    .filter((category) => prices[category] !== undefined)
    .map((category) => ({ category, price: Math.round(prices[category] * 100) }));
  return retailPrices.length ? { currency: "EUR", retailPrices, ambiguous: false } : null;
}

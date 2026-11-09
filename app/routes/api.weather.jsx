import { data } from "react-router";
import { authenticate } from "../shopify.server";
import { WEATHER_PLACES, parseOpenMeteoDaily } from "../utils/weather.js";
import { normalizeFeatureFlags } from "../utils/feature-flags.js";
import prisma from "../db.server";

// Previsão de 14 dias para os locais dos passeios (Open-Meteo, sem chave).
// Guardada em memória por 1 hora para não consultar a cada abertura do Quadro.

const json = (body, init) => data(body, init);
const TTL_MS = 60 * 60 * 1000;
let cache = { at: 0, places: null };

async function fetchPlace(place) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(place.lat));
  url.searchParams.set("longitude", String(place.lon));
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max");
  url.searchParams.set("timezone", "Europe/Lisbon");
  url.searchParams.set("forecast_days", "14");
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  return parseOpenMeteoDaily(await res.json());
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const settings = session?.shop
    ? await prisma.businessSetting.findUnique({ where: { shop: session.shop }, select: { featureFlags: true } }).catch(() => null)
    : null;
  if (!normalizeFeatureFlags(settings?.featureFlags).weatherAlerts) {
    return json({ success: false, disabled: true, error: "Alerta de clima desligado." }, { status: 403 });
  }
  if (cache.places && Date.now() - cache.at < TTL_MS) {
    return json({ success: true, places: cache.places, updatedAt: new Date(cache.at).toISOString() });
  }
  const results = await Promise.allSettled(WEATHER_PLACES.map((p) => fetchPlace(p)));
  const places = {};
  results.forEach((r, i) => { if (r.status === "fulfilled") places[WEATHER_PLACES[i].key] = r.value; });
  if (!Object.keys(places).length) {
    console.error("[PMY] weather forecast unavailable:", results.map((r) => r.reason?.message).filter(Boolean).join("; "));
    return json({ success: false, error: "Previsão do tempo indisponível agora." }, { status: 502 });
  }
  cache = { at: Date.now(), places };
  return json({ success: true, places, updatedAt: new Date(cache.at).toISOString() });
};

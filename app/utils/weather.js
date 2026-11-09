// Alerta de clima no Quadro: previsão diária (Open-Meteo, gratuito e sem chave)
// para o local de cada passeio. Funções puras, usadas no servidor e na tela.

export const WEATHER_PLACES = [
  { key: "sintra", name: "Sintra", lat: 38.7975, lon: -9.3906, words: ["sintra", "pena", "regaleira", "cabo da roca"] },
  { key: "cascais", name: "Cascais", lat: 38.6979, lon: -9.4215, words: ["cascais", "estoril"] },
  { key: "douro", name: "Douro", lat: 41.1621, lon: -7.7880, words: ["douro", "pinhao", "pinhão", "regua", "régua"] },
  { key: "porto", name: "Porto", lat: 41.1579, lon: -8.6291, words: ["porto", "oporto"] },
  { key: "fatima", name: "Fátima", lat: 39.6312, lon: -8.6736, words: ["fatima", "fátima"] },
  { key: "nazare", name: "Nazaré", lat: 39.6021, lon: -9.0710, words: ["nazare", "nazaré"] },
  { key: "obidos", name: "Óbidos", lat: 39.3606, lon: -9.1571, words: ["obidos", "óbidos"] },
  { key: "evora", name: "Évora", lat: 38.5714, lon: -7.9135, words: ["evora", "évora", "alentejo"] },
  { key: "arrabida", name: "Arrábida", lat: 38.4810, lon: -8.9830, words: ["arrabida", "arrábida", "setubal", "setúbal", "sesimbra"] },
  { key: "lisboa", name: "Lisboa", lat: 38.7223, lon: -9.1393, words: ["lisbon", "lisboa", "alfama", "belem", "belém", "fado"] },
];
const DEFAULT_PLACE = "lisboa";

// Passeios em local fechado: chuva não atrapalha.
const INDOOR_WORDS = ["fado", "dinner", "jantar", "museu", "museum", "wine tasting", "degustação", "degustacao"];

function plain(value) {
  return String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Primeiro local citado no título do passeio (ex.: "Fátima, Nazaré & Óbidos" → Fátima). */
export function placeForTour(title) {
  const text = plain(title);
  let best = null;
  for (const place of WEATHER_PLACES) {
    for (const word of place.words) {
      const at = text.indexOf(plain(word));
      if (at >= 0 && (!best || at < best.at)) best = { at, key: place.key };
    }
  }
  return best?.key || DEFAULT_PLACE;
}

export function isOutdoorTour(title) {
  const text = plain(title);
  return !INDOOR_WORDS.some((w) => text.includes(plain(w)));
}

/**
 * Nível de alerta de um dia: null (ok), "watch" (atenção) ou "bad" (avaliar remarcar).
 * day = { rainMm, rainChance, gustKmh, tempMax }
 */
export function weatherAlert(day) {
  if (!day) return null;
  const rain = Number(day.rainMm || 0);
  const chance = Number(day.rainChance || 0);
  const gust = Number(day.gustKmh || 0);
  const heat = Number(day.tempMax || 0);
  if (rain >= 10 || gust >= 70 || (chance >= 80 && rain >= 5) || heat >= 40) return "bad";
  if (rain >= 3 || chance >= 60 || gust >= 50 || heat >= 35) return "watch";
  return null;
}

export function weatherSummary(day, lang = "pt") {
  if (!day) return "";
  const en = lang === "en";
  const parts = [`${Math.round(day.tempMin)}–${Math.round(day.tempMax)}°C`];
  if (day.rainChance != null) parts.push(`${en ? "rain" : "chuva"} ${Math.round(day.rainChance)}%`);
  if (Number(day.rainMm) > 0) parts.push(`${Number(day.rainMm).toFixed(1)} mm`);
  if (Number(day.gustKmh) >= 40) parts.push(`${en ? "gusts" : "rajadas"} ${Math.round(day.gustKmh)} km/h`);
  return parts.join(" · ");
}

/** Converte a resposta diária do Open-Meteo em { [dateKey]: day }. */
export function parseOpenMeteoDaily(payload) {
  const d = payload?.daily;
  if (!d || !Array.isArray(d.time)) return {};
  const out = {};
  d.time.forEach((dateKey, i) => {
    out[dateKey] = {
      tempMin: d.temperature_2m_min?.[i],
      tempMax: d.temperature_2m_max?.[i],
      rainMm: d.precipitation_sum?.[i] ?? 0,
      rainChance: d.precipitation_probability_max?.[i] ?? null,
      gustKmh: d.wind_gusts_10m_max?.[i] ?? 0,
      code: d.weather_code?.[i] ?? null,
    };
  });
  return out;
}

export function weatherIcon(day) {
  const code = Number(day?.code);
  if (code >= 95) return "⛈️";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "🌧️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 1 && code <= 3) return "⛅";
  return "☀️";
}

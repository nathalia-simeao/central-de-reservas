// Plataforma de onde veio o cliente, nos itens dos checklists (pedido 12/11/2026).
// No Trello a equipe escrevia a sigla no fim do item ("… +4404 GYG"); na Central
// vira um selo colorido escolhido numa lista. As siglas antigas são reconhecidas.

export const CHECKLIST_PLATFORMS = [
  // label = como a equipe escreve no checklist (definido pela Nathalia, 12/11).
  { key: "GYG", label: "GYG", name: "GetYourGuide", color: "#e8442a" },
  { key: "VT", label: "VTR", name: "Viator", color: "#127a59" },
  { key: "HD", label: "HD", name: "Headout", color: "#6b3fd4" },
  { key: "AB", label: "Airbnb", name: "Airbnb", color: "#d6204f" },
  { key: "TG", label: "Tiqets", name: "Tiqets", color: "#0b5cad" },
  { key: "KO", label: "Klook", name: "Klook", color: "#c4500b" },
  { key: "CT", label: "CIV", name: "Civitatis", color: "#a3175a" },
  { key: "SITE", label: "Site", name: "Site PMY", color: "#1f6f43" },
];

const BY_KEY = new Map(CHECKLIST_PLATFORMS.map((p) => [p.key, p]));

// Siglas curtas só valem em maiúsculas (para não confundir com palavras do texto).
const CODES = { GYG: "GYG", VTR: "VT", VT: "VT", HD: "HD", AB: "AB", TG: "TG", TQ: "TG", KO: "KO", KK: "KO", CT: "CT", CIV: "CT" };
const NAMES = { getyourguide: "GYG", viator: "VT", headout: "HD", airbnb: "AB", tiqets: "TG", tiquets: "TG", klook: "KO", civitatis: "CT" };

export function checklistPlatform(key) {
  return BY_KEY.get(String(key || "").toUpperCase()) || null;
}

/** Valor salvo → chave válida (ou null). */
export function platformKey(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  if (BY_KEY.has(text.toUpperCase())) return text.toUpperCase();
  return CODES[text] || NAMES[text.toLowerCase()] || null;
}

/** "Caroline (1A) +4477 GYG" → { text: "Caroline (1A) +4477", platform: "GYG" }. */
export function splitPlatform(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  const words = text.split(" ");
  if (words.length < 2) return { text, platform: null };
  const last = words[words.length - 1].replace(/[.,;:)]+$/, "");
  const platform = CODES[last] || NAMES[last.toLowerCase()] || null;
  if (!platform) return { text, platform: null };
  const rest = words.slice(0, -1);
  while (rest.length > 1 && /^[-–—·|/]$/.test(rest[rest.length - 1])) rest.pop();
  return { text: rest.join(" "), platform };
}

/** Reserva da Central → selo (Shopify = site). */
export function bookingPlatformKey(platform) {
  const value = String(platform || "").toUpperCase();
  return {
    GETYOURGUIDE: "GYG", GYG: "GYG", VIATOR: "VT", HEADOUT: "HD", AIRBNB: "AB",
    TIQETS: "TG", KLOOK: "KO", CIVITATIS: "CT", SHOPIFY: "SITE",
  }[value] || null;
}

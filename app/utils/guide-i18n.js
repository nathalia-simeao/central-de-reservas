// Idiomas do app PMY Guias (pedido 12/11/2026): os mesmos idiomas em que os
// passeios são vendidos no site. O texto em português é a chave; cada linha do
// dicionário traz a tradução para os outros idiomas. {n}, {name}… são trocados
// pelos valores na hora.
import { GUIDE_STRINGS } from "./guide-i18n-strings.js";

export const GUIDE_LANGS = [
  { key: "pt", name: "Português", locale: "pt-PT" },
  { key: "en", name: "English", locale: "en-GB" },
  { key: "es", name: "Español", locale: "es-ES" },
  { key: "fr", name: "Français", locale: "fr-FR" },
  { key: "it", name: "Italiano", locale: "it-IT" },
  { key: "de", name: "Deutsch", locale: "de-DE" },
];
const KEYS = new Set(GUIDE_LANGS.map((l) => l.key));

export function guideLang(value) {
  const key = String(value || "").toLowerCase().slice(0, 2);
  return KEYS.has(key) ? key : "pt";
}

export function guideLocale(lang) {
  return GUIDE_LANGS.find((l) => l.key === guideLang(lang))?.locale || "pt-PT";
}

/** Primeiro idioma do navegador que o app tem (tela de entrada, antes do login). */
export function langFromAcceptLanguage(header) {
  for (const part of String(header || "").split(",")) {
    const key = part.trim().slice(0, 2).toLowerCase();
    if (KEYS.has(key)) return key;
  }
  return "pt";
}

export function translate(lang, text, vars = null) {
  const key = String(text ?? "");
  const row = GUIDE_STRINGS[key];
  let out = (lang && lang !== "pt" && row?.[lang]) || key;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, name) => (vars[name] ?? m));
  return out;
}

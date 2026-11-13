// Nomes que vêm da Shopify em inglês, mostrados no idioma do app do guia
// (pedido da Nathalia, 13/11/2026). O valor enviado para a reserva continua o original.

import { languageKey } from "./tour-languages.js";

/** "Portuguese" → "Portugais" (fr), "Português" (pt)… */
export function displayLanguageName(value, locale = "pt-PT") {
  const key = languageKey(value);
  if (!key || key.length > 3) return value;
  try {
    const name = new Intl.DisplayNames([locale], { type: "language" }).of(key);
    return name ? name.charAt(0).toLocaleUpperCase(locale) + name.slice(1) : value;
  } catch {
    return value;
  }
}

const CATEGORY = {
  child: { pt: "Criança", en: "Child", es: "Niño", fr: "Enfant", it: "Bambino", de: "Kind" },
  children: { pt: "Crianças", en: "Children", es: "Niños", fr: "Enfants", it: "Bambini", de: "Kinder" },
  infant: { pt: "Bebê", en: "Infant", es: "Bebé", fr: "Bébé", it: "Neonato", de: "Kleinkind" },
  youth: { pt: "Jovem", en: "Youth", es: "Joven", fr: "Jeune", it: "Giovane", de: "Jugendlicher" },
  student: { pt: "Estudante", en: "Student", es: "Estudiante", fr: "Étudiant", it: "Studente", de: "Student" },
  adult: { pt: "Adulto", en: "Adult", es: "Adulto", fr: "Adulte", it: "Adulto", de: "Erwachsener" },
  senior: { pt: "Sênior", en: "Senior", es: "Mayor", fr: "Senior", it: "Senior", de: "Senior" },
};
const AGES = {
  under: { pt: "Até {n} anos", en: "Under {n} years old", es: "Menores de {n} años", fr: "Moins de {n} ans", it: "Sotto i {n} anni", de: "Unter {n} Jahren" },
  over: { pt: "Acima de {n} anos", en: "Over {n} years old", es: "Mayores de {n} años", fr: "Plus de {n} ans", it: "Oltre i {n} anni", de: "Über {n} Jahre" },
  range: { pt: "{a} a {b} anos", en: "Ages {a} to {b}", es: "De {a} a {b} años", fr: "De {a} à {b} ans", it: "Da {a} a {b} anni", de: "{a} bis {b} Jahre" },
};
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

function translateAges(text, lang) {
  return text
    .replace(/\(\s*under\s+(\d+)\s*(?:years?\s*old|y\/?o|yrs?)?\s*\)/i, (_, n) => `(${fill(AGES.under[lang], { n })})`)
    .replace(/\(\s*(?:over|above)\s+(\d+)\s*(?:years?\s*old|y\/?o|yrs?)?\s*\)/i, (_, n) => `(${fill(AGES.over[lang], { n })})`)
    .replace(/\(\s*(?:ages?\s+)?(\d+)\s*(?:to|-|–)\s*(\d+)\s*(?:years?\s*old)?\s*\)/i, (_, a, b) => `(${fill(AGES.range[lang], { a, b })})`);
}

/** "Child (Under 14 years old)" → "Enfant (Moins de 14 ans)". Partes desconhecidas ficam como estão. */
export function translateTicketTitle(title, lang = "pt") {
  const text = String(title || "");
  if (!CATEGORY.adult[lang] || lang === "en") return text;
  return text
    .split(" · ")
    .map((part) => {
      const m = part.match(/^\s*(child|children|infant|youth|student|adult|senior)\b(.*)$/i);
      if (!m) return part;
      return `${CATEGORY[m[1].toLowerCase()][lang]}${translateAges(m[2], lang)}`;
    })
    .join(" · ");
}

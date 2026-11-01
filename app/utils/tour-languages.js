function clean(value) {
  return String(value ?? "").trim();
}

function normalized(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function isLanguageOptionName(value) {
  return ["language", "languages", "idioma", "idiomas", "lingua", "linguas"].includes(
    normalized(value),
  );
}

export function extractTourLanguages(tour) {
  const values = new Map();

  const add = (value) => {
    const label = clean(value);
    if (!label) return;
    const key = normalized(label);
    if (!values.has(key)) values.set(key, label);
  };

  for (const language of tour?.languages || []) add(language);

  for (const option of tour?.options || []) {
    if (!isLanguageOptionName(option?.name)) continue;
    for (const value of option?.values || []) add(value);
  }

  for (const variant of tour?.variants || []) {
    for (const option of variant?.selectedOptions || []) {
      if (isLanguageOptionName(option?.name)) add(option?.value);
    }
  }

  const metafields = tour?.metafields || {};
  for (const key of [
    "languages_info",
    "languages",
    "language",
    "idiomas",
    "idioma",
  ]) {
    const raw = metafields?.[key];
    for (const language of String(raw || "")
      .split(/[,;|\n]+/)
      .map((item) => clean(item))
      .filter(Boolean)) {
      add(language);
    }
  }

  return [...values.values()];
}

export function variantMatchesTourLanguage(variant, language) {
  const wanted = normalized(language);
  if (!wanted) return true;

  const languageOption = (variant?.selectedOptions || []).find((option) =>
    isLanguageOptionName(option?.name),
  );

  // Variants without a language dimension remain valid for every language.
  if (!languageOption) return true;
  return normalized(languageOption.value) === wanted;
}

// ---------------------------------------------------------------------------
// Canonical language keys
//
// Bookings arrive with the language written in many ways ("Italian",
// "Italiano", "it", "IT-it", "Alemão", "Deutsch"...). Language seat quotas are
// stored by canonical key so every spelling counts against the same quota.
// ---------------------------------------------------------------------------
const LANGUAGE_ALIASES = {
  en: ["en", "eng", "english", "ingles", "inglese", "englisch", "anglais"],
  pt: ["pt", "por", "portuguese", "portugues", "portoghese", "portugiesisch", "portugais"],
  es: ["es", "spa", "spanish", "espanhol", "espanol", "castellano", "spagnolo", "spanisch", "espagnol"],
  fr: ["fr", "fra", "fre", "french", "frances", "francais", "francese", "franzosisch"],
  it: ["it", "ita", "italian", "italiano", "italien", "italienisch"],
  de: ["de", "deu", "ger", "german", "alemao", "aleman", "deutsch", "tedesco", "allemand"],
  nl: ["nl", "nld", "dut", "dutch", "holandes", "neerlandes", "nederlands", "olandese"],
  zh: ["zh", "chi", "zho", "chinese", "chines", "chino", "mandarin", "mandarim", "cinese"],
  ja: ["ja", "jpn", "japanese", "japones", "giapponese"],
  ru: ["ru", "rus", "russian", "russo", "ruso"],
  ar: ["ar", "ara", "arabic", "arabe", "arabo"],
  he: ["he", "heb", "hebrew", "hebraico", "hebreo", "ebraico"],
  ko: ["ko", "kor", "korean", "coreano"],
  pl: ["pl", "pol", "polish", "polones", "polaco"],
};

const LANGUAGE_LABELS = {
  en: ["Inglês", "English"],
  pt: ["Português", "Portuguese"],
  es: ["Espanhol", "Spanish"],
  fr: ["Francês", "French"],
  it: ["Italiano", "Italian"],
  de: ["Alemão", "German"],
  nl: ["Holandês", "Dutch"],
  zh: ["Chinês", "Chinese"],
  ja: ["Japonês", "Japanese"],
  ru: ["Russo", "Russian"],
  ar: ["Árabe", "Arabic"],
  he: ["Hebraico", "Hebrew"],
  ko: ["Coreano", "Korean"],
  pl: ["Polonês", "Polish"],
};

const ALIAS_TO_KEY = new Map(
  Object.entries(LANGUAGE_ALIASES).flatMap(([key, aliases]) =>
    aliases.map((alias) => [alias, key]),
  ),
);

export const QUOTA_LANGUAGE_KEYS = Object.keys(LANGUAGE_LABELS);

/** Canonical key for any language spelling; "" when empty. */
export function languageKey(value) {
  const text = normalized(value).replace(/[()]/g, " ").trim();
  if (!text) return "";
  if (ALIAS_TO_KEY.has(text)) return ALIAS_TO_KEY.get(text);

  // Locale codes such as "it-IT", "pt_BR", "en-us".
  const locale = text.match(/^([a-z]{2,3})[-_][a-z0-9]{2,4}$/);
  if (locale && ALIAS_TO_KEY.has(locale[1])) return ALIAS_TO_KEY.get(locale[1]);

  // Labels with extra words: "Italian guide", "Tour em Alemão", "English (live)".
  for (const word of text.split(/[^a-z]+/).filter(Boolean)) {
    if (word.length > 2 && ALIAS_TO_KEY.has(word)) return ALIAS_TO_KEY.get(word);
  }
  return text;
}

export function languageLabel(key, lang = "pt") {
  const labels = LANGUAGE_LABELS[key];
  if (labels) return labels[lang === "en" ? 1 : 0];
  const text = clean(key);
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

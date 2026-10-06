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

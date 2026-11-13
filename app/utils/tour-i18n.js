// Mostra no idioma do app o que vem do site (títulos, horários e ingressos).
// `translations` = Tour.translations ({ en, pt, es, fr, it, de }).

export function tourTitleIn(translations, lang, fallback = "") {
  return translations?.[lang]?.title || fallback;
}

/** Valor de uma opção (ex.: "Adult" → "Adulte") pela posição na lista do idioma original. */
export function optionValueIn(translations, lang, optionName, value) {
  const base = translations?.en?.options || [];
  const target = translations?.[lang]?.options || [];
  const index = base.findIndex((o) => o.name === optionName);
  if (index < 0 || !target[index]) return value;
  const pos = base[index].values.indexOf(value);
  return pos >= 0 && target[index].values[pos] ? target[index].values[pos] : value;
}

/** Título da variante no idioma (mesma ordem das opções do site). */
export function variantTitleIn(translations, lang, variantId, fallback = "") {
  return translations?.[lang]?.variants?.[variantId]?.title || fallback;
}

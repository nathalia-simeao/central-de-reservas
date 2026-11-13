// Opções do "Vender" do app a partir do produto da Shopify (pedido da Nathalia, 13/11/2026):
// horários = valores da opção "Time:" das variantes; idiomas = os do produto
// (opção de idioma ou o campo "languages_info"); ingressos = variantes daquele horário.

import { extractTourLanguages, isLanguageOptionName } from "./tour-languages.js";

const norm = (v) => String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[:\s]+$/g, "").trim();

export function timeFromText(value) {
  const match = String(value || "").match(/\b([01]?\d|2[0-3])[:hH]([0-5]\d)\b/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : null;
}

export function isTimeOptionName(name) {
  return ["time", "times", "horario", "horarios", "hora", "horas", "session", "sessao", "schedule", "start time", "departure", "saida"].includes(norm(name));
}

export const DEFAULT_LANGUAGES = ["English", "Português", "Español", "Français", "Italiano", "Deutsch"];

/**
 * @param snapshot Tour.shopifySnapshot ({ options, variantOptions, languages, metafields })
 * @param variants [{ id (gid), title, price, startTimeSlot }]
 */
export function tourSellOptions({ snapshot = {}, variants = [], scheduleSlots = [] }) {
  const options = Array.isArray(snapshot?.options) ? snapshot.options : [];
  const variantOptions = snapshot?.variantOptions && typeof snapshot.variantOptions === "object" ? snapshot.variantOptions : {};
  const timeOption = options.find((o) => isTimeOptionName(o?.name)) || null;
  const langOption = options.find((o) => isLanguageOptionName(o?.name)) || null;

  const selectedOf = (variant) => {
    const saved = variantOptions[variant.id];
    if (Array.isArray(saved) && saved.length) return saved;
    // Sem cópia das opções: o título da variante vem "Valor1 / Valor2 / …" na ordem das opções.
    const parts = String(variant.title || "").split(" / ");
    return options.length === parts.length ? options.map((o, i) => ({ name: o.name, value: parts[i] })) : [];
  };

  // Só as variantes que existem hoje na Shopify (a cópia local pode ter sobras antigas,
  // o que fazia o mesmo ingresso aparecer duas vezes).
  const current = Object.keys(variantOptions);
  const live = current.length ? variants.filter((v) => variantOptions[v.id]) : variants;
  const tickets = live.map((variant) => {
    const selected = selectedOf(variant);
    const session = timeOption ? selected.find((o) => o.name === timeOption.name)?.value || null : null;
    const language = langOption ? selected.find((o) => o.name === langOption.name)?.value || null : null;
    const rest = selected.filter((o) => o.name !== timeOption?.name && o.name !== langOption?.name).map((o) => o.value).filter(Boolean);
    return {
      id: variant.id,
      parts: selected.filter((o) => o.name !== timeOption?.name && o.name !== langOption?.name && o.value),
      title: rest.length ? rest.join(" · ") : variant.title || "Ingresso",
      price: variant.price,
      session,
      language,
      time: timeFromText(session) || variant.startTimeSlot || (timeOption ? null : timeFromText(variant.title)),
    };
  });

  let sessions = [];
  if (timeOption) {
    const used = new Set(tickets.map((t) => t.session).filter(Boolean));
    sessions = (timeOption.values || [])
      .filter((value) => used.has(value) || !used.size)
      .map((value) => ({ value, label: value, time: timeFromText(value) }))
      .filter((s) => s.time);
  }
  if (!sessions.length) {
    const times = [...new Set(tickets.map((t) => t.time).filter(Boolean))];
    const list = times.length ? times : (scheduleSlots || []).map(timeFromText).filter(Boolean);
    sessions = [...new Set(list)].sort().map((time) => ({ value: time, label: time, time }));
    // Sem opção de horário: os ingressos valem para qualquer horário.
    for (const t of tickets) if (!timeOption) t.session = t.time && times.length ? t.time : null;
  }

  const languages = langOption
    ? (langOption.values || []).filter(Boolean)
    : extractTourLanguages({ languages: snapshot?.languages, options, metafields: snapshot?.metafields || {} });

  return {
    timeOptionName: timeOption?.name || null,
    sessions: sessions.sort((a, b) => a.time.localeCompare(b.time) || a.label.localeCompare(b.label)),
    languages: languages.length ? languages : DEFAULT_LANGUAGES,
    languageFromProduct: languages.length > 0,
    tickets,
    freeTime: sessions.length === 0,
  };
}

/** Ingressos que aparecem para o horário e o idioma escolhidos. */
export function ticketsFor(tickets, { session = "", language = "" } = {}) {
  return tickets.filter((t) => (!t.session || !session || t.session === session) && (!t.language || !language || t.language === language));
}

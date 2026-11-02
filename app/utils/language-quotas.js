// Language seat quotas ("liberar vagas por idioma").
//
// Stored on Tour.languageSlotQuotas as a JSON array of rules:
//   { id, date: "YYYY-MM-DD" | null, time: "HH:MM",
//     languages: [{ key: "it", label: "Italiano", seats: 5 }], updatedAt }
//
// A rule with date = null applies to that departure time on every day.
// A rule with a specific date overrides the every-day rule for that departure.
//
// When a departure has a rule:
//   - a listed language with a number sells at most that many seats;
//   - a listed language with 0 seats is closed on that departure;
//   - any language left blank / not listed is UNLIMITED (only the
//     physical/channel capacity applies) — requested by PMY on 02/11/2026;
//   - the departure as a whole never exceeds the physical/channel capacity;
//   - bookings without a recognised language only count against the total.
// Departures without a rule keep the previous behaviour untouched.

import { languageKey, languageLabel } from "./tour-languages.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_LANGUAGE_SEATS = 999;

export function normalizeTimeKey(value) {
  const match = String(value ?? "").match(/(\d{1,2})[:hH](\d{2})/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeLanguages(languages) {
  const byKey = new Map();
  for (const item of Array.isArray(languages) ? languages : []) {
    const key = languageKey(item?.key || item?.language || item?.label);
    const seats = Number(item?.seats);
    if (!key || !Number.isInteger(seats) || seats < 0 || seats > MAX_LANGUAGE_SEATS) continue;
    const label = String(item?.label || "").trim() || languageLabel(key);
    byKey.set(key, { key, label: label.slice(0, 60), seats });
  }
  return [...byKey.values()];
}

/** Returns only well-formed rules; tolerant of legacy/garbage JSON. */
export function normalizeLanguageQuotaRules(raw) {
  if (!Array.isArray(raw)) return [];
  const rules = [];
  for (const rule of raw) {
    const time = normalizeTimeKey(rule?.time);
    const date = rule?.date && DATE_RE.test(String(rule.date)) ? String(rule.date) : null;
    const languages = normalizeLanguages(rule?.languages);
    if (!time || !languages.length) continue;
    rules.push({
      id: String(rule?.id || `${date || "all"}_${time}`),
      date,
      time,
      languages,
      updatedAt: rule?.updatedAt || null,
    });
  }
  return rules;
}

/** The rule that governs one departure, or null when languages are not limited. */
export function languageQuotaRuleForSlot(rawRules, dateKey, timeKey) {
  const rules = normalizeLanguageQuotaRules(rawRules);
  const time = normalizeTimeKey(timeKey);
  if (!time || !rules.length) return null;
  return (
    rules.find((rule) => rule.date === dateKey && rule.time === time) ||
    rules.find((rule) => rule.date === null && rule.time === time) ||
    null
  );
}

/**
 * Replace (or remove, when languages is empty) the rule for one date/time.
 * Throws an Error with a Portuguese message on invalid input.
 */
export function upsertLanguageQuotaRule(rawRules, { date, time, languages }, now = new Date()) {
  const timeKey = normalizeTimeKey(time);
  if (!timeKey) throw new Error("Horário inválido.");
  const dateKey = date ? String(date).slice(0, 10) : null;
  if (dateKey && !DATE_RE.test(dateKey)) throw new Error("Data inválida.");

  const cleaned = normalizeLanguages(languages);
  if (Array.isArray(languages) && languages.length !== cleaned.length) {
    throw new Error(`Informe vagas entre 0 e ${MAX_LANGUAGE_SEATS} para cada idioma.`);
  }

  const others = normalizeLanguageQuotaRules(rawRules).filter(
    (rule) => !(rule.date === dateKey && rule.time === timeKey),
  );
  if (!cleaned.length) return others;

  return [
    ...others,
    {
      id: `${dateKey || "all"}_${timeKey}`,
      date: dateKey,
      time: timeKey,
      languages: cleaned,
      updatedAt: now.toISOString(),
    },
  ].sort((a, b) =>
    String(a.date || "").localeCompare(String(b.date || "")) || a.time.localeCompare(b.time),
  );
}

/**
 * Seats per language for one departure.
 *  - occupiedFor(booking) returns the seats a booking holds in this slot (0 if not in slot)
 *  - requestedLanguage: language of the booking being checked (optional)
 * remainingSeats is Infinity when the requested language (or "any language")
 * is not capped; callers combine it with the channel capacity via Math.min.
 */
export function evaluateLanguageQuota(rule, bookings, occupiedFor, requestedLanguage) {
  if (!rule) return null;
  const languages = rule.languages.map((item) => ({ ...item, occupiedSeats: 0, remainingSeats: 0 }));
  const byKey = new Map(languages.map((item) => [item.key, item]));
  let unassignedSeats = 0;

  for (const booking of bookings) {
    const seats = occupiedFor(booking);
    if (!seats) continue;
    const entry = byKey.get(languageKey(booking.language));
    if (entry) entry.occupiedSeats += seats;
    else unassignedSeats += seats;
  }

  let releasedSeats = 0;
  for (const item of languages) {
    item.remainingSeats = Math.max(0, item.seats - item.occupiedSeats);
    releasedSeats += item.seats;
  }

  const requestedKey = languageKey(requestedLanguage);
  const requested = requestedKey ? byKey.get(requestedKey) || null : null;

  return {
    ruleId: rule.id,
    ruleDate: rule.date,
    languages,
    releasedSeats,
    unassignedSeats,
    // null = unlimited: languages without a number are not capped.
    poolRemaining: null,
    requestedLanguage: requestedKey || null,
    languageAllowed: requested ? requested.seats > 0 : true,
    remainingSeats: requested ? requested.remainingSeats : Infinity,
  };
}

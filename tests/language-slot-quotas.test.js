import test from "node:test";
import assert from "node:assert/strict";
import { calculateAvailabilityForCalendarSlotFromLoaded, calculateAvailabilityFromLoaded } from "../app/utils/capacity.server.js";
import { languageQuotaRuleForSlot, upsertLanguageQuotaRule } from "../app/utils/language-quotas.js";
import { languageKey } from "../app/utils/tour-languages.js";

const startTime = new Date("2026-11-20T09:00:00.000Z"); // 09:00 Lisbon (WET) in November.
const dateKey = "2026-11-20";
const timeKey = "09:00";

function booking(language, count, extra = {}) {
  return { tourId: "t1", startTime, platform: "SHOPIFY", status: "CONFIRMED", totalParticipants: count, language, ...extra };
}

const quotas = upsertLanguageQuotaRule([], {
  date: dateKey, time: timeKey,
  languages: [{ key: "it", seats: 5 }, { key: "de", seats: 5 }, { key: "en", seats: 10 }],
});
const tour = { id: "t1", maxCapacity: 30, timezone: "Europe/Lisbon", platformCapacityLimits: null, languageSlotQuotas: quotas };

function check(bookings, language, requestedSeats = 0, t = tour) {
  return calculateAvailabilityForCalendarSlotFromLoaded({
    tour: t, bookings, dateKey, timeKey, platform: "shopify", requestedSeats, language,
  });
}

test("language aliases resolve to one canonical key", () => {
  for (const value of ["Italian", "Italiano", "it", "IT-it", "Tour em italiano"]) assert.equal(languageKey(value), "it");
  for (const value of ["German", "Alemão", "Deutsch", "de-DE"]) assert.equal(languageKey(value), "de");
  for (const value of ["English", "Inglês", "en_GB"]) assert.equal(languageKey(value), "en");
});

test("each language sells only its released seats", () => {
  const a = check([booking("Italiano", 3)], "Italian", 3);
  assert.equal(a.remainingSeats, 2);
  assert.equal(a.canAccept, false);
  assert.equal(check([booking("Italiano", 3)], "it", 2).canAccept, true);
  assert.equal(check([booking("Italiano", 3)], "English", 10).canAccept, true);
});

test("a language without released seats is closed on that departure", () => {
  const a = check([], "Español", 1);
  assert.equal(a.languageAllowed, false);
  assert.equal(a.remainingSeats, 0);
  assert.equal(a.canAccept, false);
});

test("without a language the departure offers the remaining released pool", () => {
  const a = check([booking("it", 5), booking("en", 4)], null);
  assert.equal(a.remainingSeats, 11); // 0 it + 5 de + 6 en
  assert.equal(a.languageLimited, true);
});

test("bookings without a language consume the released pool", () => {
  const a = check([booking(null, 18)], "de", 3);
  assert.equal(a.remainingSeats, 2);
  assert.equal(a.canAccept, false);
});

test("physical capacity still caps language quotas", () => {
  const small = { ...tour, maxCapacity: 8 };
  const a = check([booking("en", 6)], "it", 3, small);
  assert.equal(a.remainingSeats, 2);
  assert.equal(a.canAccept, false);
});

test("other dates and times are unaffected", () => {
  const a = calculateAvailabilityForCalendarSlotFromLoaded({
    tour, bookings: [], dateKey: "2026-11-21", timeKey, platform: "shopify", language: "Español", requestedSeats: 4,
  });
  assert.equal(a.languageLimited, false);
  assert.equal(a.remainingSeats, 30);
  assert.equal(a.canAccept, true);
});

test("every-day rule applies to all dates, a dated rule overrides it", () => {
  let rules = upsertLanguageQuotaRule([], { date: null, time: "9:00", languages: [{ key: "en", seats: 4 }] });
  rules = upsertLanguageQuotaRule(rules, { date: "2026-12-24", time: "09:00", languages: [{ key: "fr", seats: 6 }] });
  assert.equal(languageQuotaRuleForSlot(rules, "2026-12-01", "09:00").languages[0].key, "en");
  assert.equal(languageQuotaRuleForSlot(rules, "2026-12-24", "09:00").languages[0].key, "fr");
  assert.equal(languageQuotaRuleForSlot(rules, "2026-12-24", "14:00"), null);
});

test("saving an empty list removes the rule for that departure", () => {
  const removed = upsertLanguageQuotaRule(quotas, { date: dateKey, time: timeKey, languages: [] });
  assert.equal(removed.length, 0);
  assert.throws(() => upsertLanguageQuotaRule([], { date: null, time: "25:00", languages: [] }));
  assert.throws(() => upsertLanguageQuotaRule([], { date: null, time: "09:00", languages: [{ key: "it", seats: -1 }] }));
});

test("instant-based availability (used by booking guard) honours language quotas", () => {
  const a = calculateAvailabilityFromLoaded({
    tour, bookings: [booking("Deutsch", 5)], startTime, platform: "getyourguide", requestedSeats: 1, language: "German",
  });
  assert.equal(a.canAccept, false);
  assert.equal(a.languageQuota.languages.find((item) => item.key === "de").occupiedSeats, 5);
});

// Fechamento mensal dos guias.
// Um pagamento por saída guiada, pela faixa de pessoas do grupo do guia
// (Configurar custos → pagamento do guia por faixa de pax). No-show não conta.

import { guidePayForPax, normalizeCostSettings } from "./profit.js";
import { languageKey } from "./tour-languages.js";

const MINUTE = 60 * 1000;

function pax(booking) {
  const sum = ["adults", "children", "youths", "seniors"].reduce((acc, key) => acc + Number(booking?.[key] || 0), 0);
  return Number(booking?.totalParticipants || 0) || sum;
}

function belongsToGuide(booking, assignment) {
  if (booking.groupGuideId) return booking.groupGuideId === assignment.guideId;
  const keys = Array.isArray(assignment.languages) ? assignment.languages : [];
  if (!keys.length) return true;
  const key = languageKey(booking.language);
  return !key || keys.includes(key);
}

export function computeGuidePayouts({ assignments = [], bookings = [], costSettings, guides = [] }) {
  const settings = normalizeCostSettings(costSettings);
  const byGuide = new Map();
  const missingTiers = new Set();

  for (const assignment of assignments) {
    const start = new Date(assignment.startTime).getTime();
    const group = bookings.filter(
      (b) =>
        b.tourId === assignment.tourId &&
        String(b.status || "").toUpperCase() === "CONFIRMED" &&
        Math.abs(new Date(b.startTime).getTime() - start) <= MINUTE &&
        belongsToGuide(b, assignment),
    );
    const present = group
      .filter((b) => String(b.attendanceStatus || "").toUpperCase() !== "NO_SHOW")
      .reduce((sum, b) => sum + pax(b), 0);
    const noShow = group
      .filter((b) => String(b.attendanceStatus || "").toUpperCase() === "NO_SHOW")
      .reduce((sum, b) => sum + pax(b), 0);
    const tiers = settings.tours[assignment.tourId]?.guidePay || [];
    if (!tiers.length) missingTiers.add(assignment.tourId);
    const amount = guidePayForPax(tiers, present);

    const guideId = assignment.guideId;
    const entry = byGuide.get(guideId) || {
      guideId,
      name: guides.find((g) => g.id === guideId)?.name || assignment.guide?.name || "Guia",
      departures: [],
      total: 0,
      pax: 0,
    };
    entry.departures.push({
      id: assignment.id,
      tourId: assignment.tourId,
      tourTitle: assignment.tour?.title || "Passeio",
      startTime: new Date(assignment.startTime).toISOString(),
      languages: assignment.languages || [],
      pax: present,
      noShow,
      amount,
      priced: tiers.length > 0,
      completed: Boolean(assignment.checkEndAt),
    });
    entry.total = Math.round((entry.total + amount) * 100) / 100;
    entry.pax += present;
    byGuide.set(guideId, entry);
  }

  const rows = [...byGuide.values()]
    .map((entry) => ({ ...entry, departures: entry.departures.sort((a, b) => a.startTime.localeCompare(b.startTime)) }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  return {
    guides: rows,
    total: Math.round(rows.reduce((sum, row) => sum + row.total, 0) * 100) / 100,
    departures: rows.reduce((sum, row) => sum + row.departures.length, 0),
    toursWithoutTiers: [...missingTiers],
  };
}

/** Month "YYYY-MM" in Lisbon → [start, end) instants (UTC). */
export function lisbonMonthRange(month) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(month || ""));
  if (!match) return null;
  const year = Number(match[1]);
  const index = Number(match[2]) - 1;
  if (index < 0 || index > 11) return null;
  const offsetAt = (date) => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Lisbon", timeZoneName: "shortOffset" })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value || "GMT";
    const m = /GMT([+-]\d+)?(?::(\d+))?/.exec(parts);
    const hours = m?.[1] ? Number(m[1]) : 0;
    const minutes = m?.[2] ? Number(m[2]) * Math.sign(hours || 1) : 0;
    return (hours * 60 + minutes) * MINUTE;
  };
  const startUtc = new Date(Date.UTC(year, index, 1));
  const endUtc = new Date(Date.UTC(year, index + 1, 1));
  return {
    start: new Date(startUtc.getTime() - offsetAt(startUtc)),
    end: new Date(endUtc.getTime() - offsetAt(endUtc)),
  };
}

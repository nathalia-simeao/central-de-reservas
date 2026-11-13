// Agenda do guia para o Google Agenda / iPhone / Outlook: /guia-agenda/<token>.
// O token é secreto (fica no Perfil do app) e pode ser trocado a qualquer hora.
// Mostra as saídas em que o guia está escalado: 30 dias para trás e 120 para frente.

import db from "../db.server";
import { excludeTestBookingsWhere } from "../utils/test-bookings.js";
import { bookingPax, bookingsForGuideLanguages } from "../utils/guide-portal.server";
import { buildIcs } from "../utils/guide-calendar.js";

const SITE = "https://central.portugalmeandyou.com";
const LANG = { en: "Inglês", pt: "Português", es: "Espanhol", fr: "Francês", it: "Italiano", de: "Alemão" };

export const loader = async ({ params }) => {
  const token = String(params.token || "").replace(/\.ics$/i, "");
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) return new Response("Not found", { status: 404 });
  const guide = await db.guide.findUnique({ where: { calendarToken: token }, select: { id: true, name: true, portalEnabled: true } });
  if (!guide || !guide.portalEnabled) return new Response("Not found", { status: 404 });

  const from = new Date(Date.now() - 30 * 864e5);
  const to = new Date(Date.now() + 120 * 864e5);
  const assignments = await db.guideAssignment.findMany({
    where: { guideId: guide.id, status: "ASSIGNED", startTime: { gte: from, lte: to } },
    select: { id: true, tourId: true, startTime: true, languages: true, guideId: true, tour: { select: { title: true, durationMinutes: true } } },
    orderBy: { startTime: "asc" },
    take: 500,
  });
  const tourIds = [...new Set(assignments.map((a) => a.tourId))];
  const bookings = tourIds.length
    ? await db.booking.findMany({
        where: { tourId: { in: tourIds }, status: "CONFIRMED", startTime: { gte: from, lte: to }, AND: [excludeTestBookingsWhere()] },
        select: { tourId: true, startTime: true, language: true, groupGuideId: true, adults: true, children: true, youths: true, seniors: true, totalParticipants: true },
      })
    : [];
  const near = (a, b) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) <= 60000;

  const events = assignments.map((a) => {
    const mine = bookingsForGuideLanguages(bookings.filter((b) => b.tourId === a.tourId && near(b.startTime, a.startTime)), a.languages, a.guideId);
    const pax = mine.reduce((sum, b) => sum + bookingPax(b), 0);
    const langs = (a.languages || []).map((k) => LANG[k] || k).join(", ");
    const url = `${SITE}/guia/saida/${a.id}`;
    return {
      uid: a.id,
      start: a.startTime,
      minutes: a.tour?.durationMinutes || 120,
      title: `PMY · ${a.tour?.title || "Passeio"}${pax ? ` (${pax} pax)` : ""}`,
      description: [langs ? `Grupo: ${langs}` : "", `${pax} pax · ${mine.length} reserva(s)`, `Abrir no app: ${url}`].filter(Boolean).join("\n"),
      url,
    };
  });

  return new Response(buildIcs({ name: `PMY · ${guide.name}`, events }), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="pmy-agenda.ics"',
      "Cache-Control": "private, max-age=900",
      "X-Robots-Tag": "noindex",
    },
  });
};

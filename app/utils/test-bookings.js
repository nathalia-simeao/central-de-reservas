// Reservas de teste do GetYourGuide (certificação, sandbox e teste ao vivo) não
// entram nos números, na agenda, no quadro, no financeiro nem no portal do guia.
// Elas continuam no banco e seguem contando na disponibilidade (os testes do GYG
// dependem disso).
//
// Regra: toda reserva do GYG criada antes de GYG_LIVE_SINCE é teste. Enquanto o
// GYG não vende de verdade, a variável fica vazia e todas as do GYG são teste.
// No dia do go-live: GYG_LIVE_SINCE=AAAA-MM-DD no Northflank.

export const GYG_PLATFORM = "GETYOURGUIDE";

export function gygLiveSince(env = process.env) {
  const raw = String(env.GYG_LIVE_SINCE || "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Fragmento Prisma: exclui as reservas de teste do GYG. Use dentro de um AND. */
export function excludeTestBookingsWhere(env = process.env) {
  const since = gygLiveSince(env);
  return since
    ? { NOT: { platform: GYG_PLATFORM, createdAt: { lt: since } } }
    : { NOT: { platform: GYG_PLATFORM } };
}

export function isTestBooking(booking, env = process.env) {
  if (String(booking?.platform || "").toUpperCase() !== GYG_PLATFORM) return false;
  const since = gygLiveSince(env);
  if (!since) return true;
  const created = new Date(booking.createdAt);
  return Number.isNaN(created.getTime()) || created < since;
}

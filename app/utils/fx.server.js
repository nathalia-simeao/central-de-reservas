// Tudo em euro (pedido do cliente, 04/11/2026).
//
// Reservas pagas em outra moeda recebem totalPriceEur = totalPrice × cotação do
// Banco Central Europeu do DIA DA RESERVA (fonte: api.frankfurter.app, dados do BCE).
// A cotação fica gravada na reserva (fxRateToEur/fxRateDate) e numa tabela FxRate,
// então o valor em euro não muda depois. Se o valor da reserva mudar (alteração),
// o euro é recalculado com a mesma cotação.

const FX_SOURCE = "https://api.frankfurter.app";

function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function eurAmount(totalPrice, rateToEur) {
  const amount = Number(totalPrice);
  const rate = Number(rateToEur);
  if (!Number.isFinite(amount) || !Number.isFinite(rate) || rate <= 0) return null;
  return Math.round(amount * rate * 100) / 100;
}

/** 1 unit of `currency` in euros on `date` (ECB reference rate; weekends use the last business day). */
export async function getRateToEur(prisma, currency, date, fetchImpl = fetch) {
  const code = String(currency || "EUR").trim().toUpperCase();
  if (!code || code === "EUR") return { rate: 1, date: dayKey(date) };
  const key = dayKey(date);

  const cached = await prisma.fxRate.findUnique({ where: { date_currency: { date: key, currency: code } } }).catch(() => null);
  if (cached) return { rate: Number(cached.rateToEur), date: key };

  const response = await fetchImpl(`${FX_SOURCE}/${key}?from=${encodeURIComponent(code)}&to=EUR`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Cotação indisponível (${code} ${key}): HTTP ${response.status}`);
  const payload = await response.json();
  const rate = Number(payload?.rates?.EUR);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error(`Cotação inválida (${code} ${key}).`);

  await prisma.fxRate
    .upsert({
      where: { date_currency: { date: key, currency: code } },
      create: { date: key, currency: code, rateToEur: rate },
      update: {},
    })
    .catch(() => {});
  return { rate, date: key };
}

/**
 * Fills totalPriceEur for bookings that do not have it yet, and keeps it in step
 * with totalPrice for bookings already converted. Safe to run often.
 */
export async function convertBookingsToEur(prisma, { limit = 100, fetchImpl = fetch } = {}) {
  // Already converted: follow amount changes with the stored rate.
  await prisma.$executeRawUnsafe(
    `UPDATE "Booking" SET "totalPriceEur" = ROUND("totalPrice" * "fxRateToEur", 2)
     WHERE "fxRateToEur" IS NOT NULL AND "totalPrice" IS NOT NULL
       AND ("totalPriceEur" IS NULL OR "totalPriceEur" <> ROUND("totalPrice" * "fxRateToEur", 2))`,
  ).catch((error) => console.error("[FX] refresh failed:", error?.message || error));

  const pending = await prisma.booking.findMany({
    where: { totalPrice: { not: null }, fxRateToEur: null },
    select: { id: true, totalPrice: true, currency: true, createdAt: true, externalCreatedAt: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  let converted = 0;
  const failures = new Set();
  for (const booking of pending) {
    const code = String(booking.currency || "EUR").trim().toUpperCase();
    const when = booking.externalCreatedAt || booking.createdAt || new Date();
    const failureKey = `${code}|${dayKey(when)}`;
    if (failures.has(failureKey)) continue;
    try {
      const { rate, date } = await getRateToEur(prisma, code, when, fetchImpl);
      await prisma.booking.update({
        where: { id: booking.id },
        data: { fxRateToEur: rate, fxRateDate: date, totalPriceEur: eurAmount(booking.totalPrice, rate) },
      });
      converted += 1;
    } catch (error) {
      failures.add(failureKey);
      console.error("[FX] conversion failed:", error?.message || error);
    }
  }
  return { converted, pending: pending.length, failed: failures.size };
}

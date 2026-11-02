// Faturamento × lucro (pedido do cliente, item 9).
//
// BusinessSetting.costSettings:
//   {
//     platformCommissionPercent: { GETYOURGUIDE: 30, VIATOR: 25, ... },
//     paymentFees: { SHOPIFY: { percent: 2.9, fixed: 0.25 } },   // por pedido
//     tours: {
//       [tourId]: {
//         ticketCost: { ADULT: 10, CHILD: 5, YOUTH: 8, SENIOR: 8 }, // € por pessoa
//         guidePay: [{ minPax: 1, maxPax: 5, amount: 40 }, ...],   // € por saída
//       },
//     },
//   }
//
// Base do cálculo: reservas CONFIRMADAS cujo passeio (startTime) cai no período.
//   faturamento = soma de totalPrice
//   comissão     = faturamento × % da plataforma
//   taxa pgto    = % × valor + fixo, por reserva da plataforma configurada
//   ingressos    = pessoas × custo da faixa etária (no-show não gera ingresso)
//   guia         = 1 pagamento por saída (passeio + horário), pela faixa de pax presentes
//   lucro        = faturamento − comissão − taxa − ingressos − guia

export const COST_PLATFORMS = ["SHOPIFY", "GETYOURGUIDE", "VIATOR", "HEADOUT", "CIVITATIS", "CENTRAL"];
export const TICKET_CATEGORIES = ["ADULT", "CHILD", "YOUTH", "SENIOR"];

function money(value) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

function percent(value) {
  const n = money(value);
  return n !== null && n <= 100 ? n : null;
}

export function normalizeCostSettings(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const platformCommissionPercent = {};
  const paymentFees = {};
  for (const platform of COST_PLATFORMS) {
    const commission = percent(source.platformCommissionPercent?.[platform]);
    if (commission !== null) platformCommissionPercent[platform] = commission;
    const fee = source.paymentFees?.[platform];
    const feePercent = percent(fee?.percent);
    const feeFixed = money(fee?.fixed);
    if (feePercent !== null || feeFixed !== null) {
      paymentFees[platform] = { percent: feePercent ?? 0, fixed: feeFixed ?? 0 };
    }
  }

  const tours = {};
  for (const [tourId, value] of Object.entries(source.tours && typeof source.tours === "object" ? source.tours : {})) {
    const ticketCost = {};
    for (const category of TICKET_CATEGORIES) {
      const amount = money(value?.ticketCost?.[category]);
      if (amount !== null) ticketCost[category] = amount;
    }
    const guidePay = (Array.isArray(value?.guidePay) ? value.guidePay : [])
      .map((tier) => ({
        minPax: Math.max(1, Math.floor(Number(tier?.minPax) || 0)),
        maxPax: tier?.maxPax === null || tier?.maxPax === "" || tier?.maxPax === undefined
          ? null
          : Math.floor(Number(tier.maxPax)),
        amount: money(tier?.amount),
      }))
      .filter((tier) => tier.amount !== null && (tier.maxPax === null || tier.maxPax >= tier.minPax))
      .sort((a, b) => a.minPax - b.minPax);
    if (Object.keys(ticketCost).length || guidePay.length) tours[String(tourId)] = { ticketCost, guidePay };
  }

  return { platformCommissionPercent, paymentFees, tours };
}

export function guidePayForPax(tiers, pax) {
  if (!pax) return 0;
  const tier = (tiers || []).find((item) => pax >= item.minPax && (item.maxPax === null || pax <= item.maxPax));
  return tier ? tier.amount : 0;
}

const round = (n) => Math.round(n * 100) / 100;

function categoryCounts(booking) {
  const counts = {
    ADULT: Number(booking.adults || 0),
    CHILD: Number(booking.children || 0),
    YOUTH: Number(booking.youths || 0),
    SENIOR: Number(booking.seniors || 0),
  };
  const sum = counts.ADULT + counts.CHILD + counts.YOUTH + counts.SENIOR;
  const total = Number(booking.totalParticipants || 0);
  // Bookings that only carry a total count as adults (the safe, higher cost).
  if (!sum && total) counts.ADULT = total;
  return counts;
}

/**
 * @param bookings all loaded bookings
 * @param range { start: Date, end: Date } — by tour date (startTime)
 */
export function computeProfit({ bookings = [], costSettings, range, currency = "EUR" }) {
  const settings = normalizeCostSettings(costSettings);
  const inRange = (value) => {
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date >= range.start && date <= range.end;
  };

  const base = bookings.filter((booking) =>
    String(booking?.status || "").toUpperCase() === "CONFIRMED" && inRange(booking.startTime));

  const totals = { revenue: 0, commission: 0, paymentFees: 0, tickets: 0, guides: 0 };
  const missingPrice = [];
  const toursWithoutCosts = new Set();
  const departures = new Map();
  const byPlatform = {};

  for (const booking of base) {
    const platform = String(booking.platform || "OTHER").toUpperCase();
    const amount = booking.totalPrice === null || booking.totalPrice === undefined || booking.totalPrice === ""
      ? null
      : Number(booking.totalPrice);
    const sameCurrency = !booking.currency || String(booking.currency).toUpperCase() === currency;
    const revenue = amount !== null && Number.isFinite(amount) && sameCurrency ? amount : 0;
    if (!revenue) missingPrice.push(booking);

    const commission = revenue * (settings.platformCommissionPercent[platform] || 0) / 100;
    const fee = settings.paymentFees[platform];
    const paymentFee = revenue && fee ? revenue * fee.percent / 100 + fee.fixed : 0;

    const noShow = String(booking.attendanceStatus || "").toUpperCase() === "NO_SHOW";
    const tourCosts = settings.tours[booking.tourId];
    if (!tourCosts) toursWithoutCosts.add(booking.tourId);
    let tickets = 0;
    const counts = categoryCounts(booking);
    if (!noShow && tourCosts) {
      for (const category of TICKET_CATEGORIES) tickets += counts[category] * (tourCosts.ticketCost[category] || 0);
    }

    totals.revenue += revenue;
    totals.commission += commission;
    totals.paymentFees += paymentFee;
    totals.tickets += tickets;

    const row = byPlatform[platform] ||= { platform, bookings: 0, revenue: 0, commission: 0, paymentFees: 0 };
    row.bookings += 1;
    row.revenue += revenue;
    row.commission += commission;
    row.paymentFees += paymentFee;

    const key = `${booking.tourId}|${new Date(booking.startTime).toISOString()}`;
    const departure = departures.get(key) || { tourId: booking.tourId, startTime: booking.startTime, pax: 0 };
    if (!noShow) departure.pax += counts.ADULT + counts.CHILD + counts.YOUTH + counts.SENIOR;
    departures.set(key, departure);
  }

  for (const departure of departures.values()) {
    departure.guidePay = guidePayForPax(settings.tours[departure.tourId]?.guidePay, departure.pax);
    totals.guides += departure.guidePay;
  }

  const net = totals.revenue - totals.commission - totals.paymentFees;
  const profit = net - totals.tickets - totals.guides;

  return {
    currency,
    bookingCount: base.length,
    departureCount: departures.size,
    revenue: round(totals.revenue),
    commission: round(totals.commission),
    paymentFees: round(totals.paymentFees),
    net: round(net),
    tickets: round(totals.tickets),
    guides: round(totals.guides),
    profit: round(profit),
    margin: totals.revenue > 0 ? round((profit / totals.revenue) * 100) : null,
    byPlatform: Object.values(byPlatform).map((row) => ({
      ...row,
      revenue: round(row.revenue),
      commission: round(row.commission),
      paymentFees: round(row.paymentFees),
    })).sort((a, b) => b.revenue - a.revenue),
    missingPriceCount: missingPrice.length,
    toursWithoutCosts: [...toursWithoutCosts],
  };
}

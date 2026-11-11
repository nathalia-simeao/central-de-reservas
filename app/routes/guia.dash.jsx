import { excludeTestBookingsWhere } from "../utils/test-bookings.js";
import { Link, useLoaderData, useSearchParams } from "react-router";
import db from "../db.server";
import { GuideShell, lisbonParts } from "../components/guide/GuideShell";
import { bookingPax, bookingsForGuideLanguages, getGuideFromRequest, redirectTo } from "../utils/guide-portal.server";

// Aba Dash do app: só os números do próprio guia (vendas pelos links dele,
// passeios que guiou, pessoas atendidas, no-show), por período.

const STATUS = {
  CONFIRMED: ["Confirmada", "ok"],
  PENDING: ["Aguardando pagamento", "wait"],
  CANCELED: ["Cancelada", "no"],
  CANCELLED: ["Cancelada", "no"],
  EXPIRED: ["Link vencido", "no"],
};

// Tudo em euro: valor convertido, ou o próprio valor se a reserva já for em EUR.
function eurOf(booking) {
  if (booking.totalPriceEur !== null && booking.totalPriceEur !== undefined) return booking.totalPriceEur;
  const isEur = !booking.currency || String(booking.currency).toUpperCase() === "EUR";
  return isEur && booking.totalPrice !== null && booking.totalPrice !== undefined ? booking.totalPrice : null;
}

function lisbonMonthStart(now, offset = 0) {
  const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit" }).format(now).split("-").map(Number);
  // Meia-noite UTC do dia 1; a diferença de 0-1 h para Lisboa não muda o mês na prática.
  return new Date(Date.UTC(y, m - 1 + offset, 1));
}

const PERIODS = {
  mes: { label: "Este mês", range: (now) => ({ since: lisbonMonthStart(now), until: lisbonMonthStart(now, 1) }) },
  anterior: { label: "Mês passado", range: (now) => ({ since: lisbonMonthStart(now, -1), until: lisbonMonthStart(now) }) },
  "90d": { label: "90 dias", range: (now) => ({ since: new Date(now.getTime() - 90 * 24 * 3600 * 1000), until: new Date(now.getTime() + 1) }) },
};

export const loader = async ({ request }) => {
  const guide = await getGuideFromRequest(db, request);
  if (!guide) return redirectTo("/guia/login");

  const period = PERIODS[new URL(request.url).searchParams.get("p")] ? new URL(request.url).searchParams.get("p") : "mes";
  const { since, until } = PERIODS[period].range(new Date());
  const [sales, past] = await Promise.all([
    db.booking.findMany({
      where: { sellerGuideId: guide.id, createdAt: { gte: since, lt: until } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true, status: true, syncStatus: true, startTime: true, createdAt: true, bookingRef: true,
        totalPrice: true, totalPriceEur: true, currency: true, adults: true, children: true, youths: true, seniors: true, totalParticipants: true,
        tour: { select: { title: true } },
      },
    }),
    db.guideAssignment.findMany({
      where: { guideId: guide.id, status: "ASSIGNED", startTime: { gte: since, lt: until < new Date() ? until : new Date() } },
      include: { tour: { select: { title: true } } },
      orderBy: { startTime: "desc" },
      take: 200,
    }),
  ]);

  // Pax atendidos por saída passada (só o grupo de idioma do guia).
  const tourIds = [...new Set(past.map((a) => a.tourId))];
  const pastBookings = tourIds.length
    ? await db.booking.findMany({
        where: { tourId: { in: tourIds }, status: "CONFIRMED", startTime: { gte: since, lt: until }, AND: [excludeTestBookingsWhere()] },
        select: { tourId: true, startTime: true, language: true, groupGuideId: true, attendanceStatus: true, adults: true, children: true, youths: true, seniors: true, totalParticipants: true },
      })
    : [];
  const near = (a, b) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) <= 60 * 1000;

  // Links que venceram sem pagamento aparecem como "Link vencido" e não contam.
  const realSales = sales;
  const confirmed = realSales.filter((s) => s.status === "CONFIRMED");

  const pastRows = past.map((a) => {
    const group = bookingsForGuideLanguages(
      pastBookings.filter((b) => b.tourId === a.tourId && near(b.startTime, a.startTime)),
      a.languages,
      a.guideId,
    );
    return {
      id: a.id,
      title: a.tour?.title || "Passeio",
      startTime: a.startTime.toISOString(),
      pax: group.reduce((sum, b) => sum + bookingPax(b), 0),
      noShow: group.filter((b) => b.attendanceStatus === "NO_SHOW").reduce((sum, b) => sum + bookingPax(b), 0),
    };
  });

  return {
    period,
    guide: { name: guide.name, code: guide.utmId || null },
    totals: {
      sales: confirmed.length,
      pax: confirmed.reduce((sum, s) => sum + bookingPax(s), 0),
      revenue: confirmed.reduce((sum, s) => sum + (Number(eurOf(s)) || 0), 0),
      links: realSales.length,
      tours: past.length,
      guided: pastRows.reduce((sum, p) => sum + p.pax, 0),
      noShow: pastRows.reduce((sum, p) => sum + p.noShow, 0),
    },
    sales: realSales.map((s) => ({
      id: s.id,
      title: s.tour?.title || "Passeio",
      startTime: s.startTime.toISOString(),
      createdAt: s.createdAt.toISOString(),
      ref: s.bookingRef,
      pax: bookingPax(s),
      price: eurOf(s) === null ? null : Number(eurOf(s)),
      currency: "EUR",
      status: s.syncStatus === "HOLD_RELEASED" ? "EXPIRED" : s.status,
    })),
    past: pastRows,
  };
};

function money(value, currency = "EUR") {
  if (value === null || value === undefined) return "—";
  try { return new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(value); }
  catch { return `€${Number(value).toFixed(2)}`; }
}

export default function GuideDash() {
  const { period, guide, totals, sales, past } = useLoaderData();
  const [, setParams] = useSearchParams();
  const conversion = totals.links ? Math.round((totals.sales / totals.links) * 100) : null;
  return (
    <GuideShell title="Dash">
      <div className="g-top">
        <div>
          <h1>Seus números</h1>
          <small>Só as suas vendas e os passeios que você guiou</small>
        </div>
      </div>

      <div className="g-row" style={{ marginBottom: 12 }} role="tablist" aria-label="Período">
        {Object.entries(PERIODS).map(([key, p]) => (
          <button key={key} type="button" role="tab" aria-selected={period === key}
            className={`g-btn ${period === key ? "on" : ""}`} style={{ flex: 1, minHeight: 38 }}
            onClick={() => setParams(key === "mes" ? {} : { p: key })}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="g-card">
        <h2>Vendas</h2>
        <div className="g-kpis">
          <div className="g-kpi"><small>Vendas confirmadas</small><b>{totals.sales}</b></div>
          <div className="g-kpi"><small>Valor vendido</small><b>{money(totals.revenue)}</b></div>
          <div className="g-kpi"><small>Pessoas vendidas</small><b>{totals.pax}</b></div>
          <div className="g-kpi"><small>Links que viraram venda</small><b>{conversion === null ? "—" : `${conversion}%`}</b></div>
        </div>
        {guide.code && <p className="g-empty" style={{ marginTop: 8 }}>Seu código de vendas: <b>{guide.code}</b></p>}
      </div>

      <div className="g-card">
        <h2>Passeios</h2>
        <div className="g-kpis">
          <div className="g-kpi"><small>Passeios guiados</small><b>{totals.tours}</b></div>
          <div className="g-kpi"><small>Pessoas atendidas</small><b>{totals.guided}</b></div>
          <div className="g-kpi"><small>No-show</small><b>{totals.noShow}</b></div>
          <div className="g-kpi"><small>Média por passeio</small><b>{totals.tours ? (totals.guided / totals.tours).toFixed(1) : "—"}</b></div>
        </div>
      </div>

      <div className="g-card">
        <h2>Vendas pelos seus links</h2>
        {!sales.length && <p className="g-empty">Nenhuma venda neste período. Use “Vender” na aba Saídas para gerar um link.</p>}
        {sales.map((s) => {
          const [label, tone] = STATUS[s.status] || [s.status, "wait"];
          const when = lisbonParts(s.startTime);
          return (
            <div key={s.id} className="g-guest">
              <div className="g-guest__head">
                <strong>{s.title}</strong>
                <span className={`g-pill ${tone}`}>{label}</span>
              </div>
              <div className="g-guest__meta">
                {when.day} · {when.time} · {s.pax} pax · {money(s.price, s.currency)}{s.ref ? ` · ${s.ref}` : ""}
              </div>
            </div>
          );
        })}
      </div>

      <div className="g-card">
        <h2>Passeios que você guiou</h2>
        {!past.length && <p className="g-empty">Nenhum passeio neste período.</p>}
        {past.map((p) => {
          const when = lisbonParts(p.startTime);
          return (
            <Link key={p.id} to={`/guia/saida/${p.id}`} className="g-guest" style={{ display: "block", textDecoration: "none" }}>
              <div className="g-guest__head"><strong>{p.title}</strong><span>{when.time}</span></div>
              <div className="g-guest__meta">{when.day} · {p.pax} pax{p.noShow ? ` · ${p.noShow} no-show` : ""}</div>
            </Link>
          );
        })}
      </div>
    </GuideShell>
  );
}

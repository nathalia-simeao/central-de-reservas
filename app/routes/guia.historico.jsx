import { excludeTestBookingsWhere } from "../utils/test-bookings.js";
import { Link, useLoaderData } from "react-router";
import db from "../db.server";
import { GuideShell, lisbonParts } from "../components/guide/GuideShell";
import { bookingPax, bookingsForGuideLanguages, getGuideFromRequest, redirectTo } from "../utils/guide-portal.server";

// Item 7: o guia acompanha as vendas feitas pelos links dele e os passeios que já guiou.

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

export const loader = async ({ request }) => {
  const guide = await getGuideFromRequest(db, request);
  if (!guide) return redirectTo("/guia/login");

  const since = new Date(Date.now() - 90 * 24 * 3600 * 1000);
  const [sales, past] = await Promise.all([
    db.booking.findMany({
      where: { sellerGuideId: guide.id, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true, status: true, syncStatus: true, startTime: true, createdAt: true, bookingRef: true,
        totalPrice: true, totalPriceEur: true, currency: true, adults: true, children: true, youths: true, seniors: true, totalParticipants: true,
        tour: { select: { title: true } },
      },
    }),
    db.guideAssignment.findMany({
      where: { guideId: guide.id, status: "ASSIGNED", startTime: { gte: since, lt: new Date() } },
      include: { tour: { select: { title: true } } },
      orderBy: { startTime: "desc" },
      take: 200,
    }),
  ]);

  // Pax atendidos por saída passada (só o grupo de idioma do guia).
  const tourIds = [...new Set(past.map((a) => a.tourId))];
  const pastBookings = tourIds.length
    ? await db.booking.findMany({
        where: { tourId: { in: tourIds }, status: "CONFIRMED", startTime: { gte: since, lt: new Date() }, AND: [excludeTestBookingsWhere()] },
        select: { tourId: true, startTime: true, language: true, groupGuideId: true, attendanceStatus: true, adults: true, children: true, youths: true, seniors: true, totalParticipants: true },
      })
    : [];
  const near = (a, b) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) <= 60 * 1000;

  // Links que venceram sem pagamento aparecem como "Link vencido" e não contam.
  const realSales = sales;
  const confirmed = realSales.filter((s) => s.status === "CONFIRMED");

  return {
    guide: { name: guide.name, code: guide.utmId || null },
    totals: {
      sales: confirmed.length,
      pax: confirmed.reduce((sum, s) => sum + bookingPax(s), 0),
      revenue: confirmed.reduce((sum, s) => sum + (Number(eurOf(s)) || 0), 0),
      tours: past.length,
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
    past: past.map((a) => {
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
    }),
  };
};

function money(value, currency = "EUR") {
  if (value === null || value === undefined) return "—";
  try { return new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(value); }
  catch { return `€${Number(value).toFixed(2)}`; }
}

export default function GuideHistory() {
  const { guide, totals, sales, past } = useLoaderData();
  return (
    <GuideShell title="Minhas vendas">
      <div className="g-top">
        <Link to="/guia" className="g-link">← Minhas saídas</Link>
      </div>

      <div className="g-card">
        <h2 style={{ fontSize: 18 }}>Últimos 90 dias</h2>
        <div className="g-summary">
          <span>Vendas confirmadas <b>{totals.sales}</b></span>
          <span>Pessoas <b>{totals.pax}</b></span>
          <span>Valor <b>{money(totals.revenue)}</b></span>
          <span>Passeios guiados <b>{totals.tours}</b></span>
        </div>
        {guide.code && <p className="g-empty" style={{ marginTop: 8 }}>Seu código de vendas: <b>{guide.code}</b></p>}
      </div>

      <div className="g-card">
        <h2>Vendas pelos seus links</h2>
        {!sales.length && <p className="g-empty">Nenhuma venda ainda. Use “Vender” na tela inicial para gerar um link.</p>}
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
        {!past.length && <p className="g-empty">Nenhum passeio nos últimos 90 dias.</p>}
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

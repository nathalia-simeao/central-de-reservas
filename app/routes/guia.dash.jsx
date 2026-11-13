import { manualClientCounts } from "../utils/departure-checklists.js";
import { excludeTestBookingsWhere } from "../utils/test-bookings.js";
import { useState } from "react";
import { Link, useLoaderData, useSearchParams } from "react-router";
import { DatePicker } from "../components/pmy/PmyUI";
import db from "../db.server";
import { GuideShell, lisbonParts, useGuideLocale, useT } from "../components/guide/GuideShell";
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

const DAY = 24 * 3600 * 1000;
const lastDays = (n) => (now) => ({ since: new Date(now.getTime() - n * DAY), until: new Date(now.getTime() + 1) });
// Períodos do Dash (pedido 12/11: também 3, 7, 15 e 30 dias, e datas à escolha).
const PERIODS = {
  "3d": { label: "3 dias", range: lastDays(3) },
  "7d": { label: "7 dias", range: lastDays(7) },
  "15d": { label: "15 dias", range: lastDays(15) },
  "30d": { label: "30 dias", range: lastDays(30) },
  mes: { label: "Este mês", range: (now) => ({ since: lisbonMonthStart(now), until: lisbonMonthStart(now, 1) }) },
  anterior: { label: "Mês passado", range: (now) => ({ since: lisbonMonthStart(now, -1), until: lisbonMonthStart(now) }) },
  "90d": { label: "90 dias", range: lastDays(90) },
};
const isDateKey = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));

export const loader = async ({ request }) => {
  const guide = await getGuideFromRequest(db, request);
  if (!guide) return redirectTo("/guia/login");

  const params = new URL(request.url).searchParams;
  const from = params.get("de");
  const to = params.get("ate");
  const custom = params.get("p") === "datas" && isDateKey(from) && isDateKey(to) && from <= to;
  const period = custom ? "datas" : PERIODS[params.get("p")] ? params.get("p") : "mes";
  const { since, until } = custom
    ? { since: new Date(`${from}T00:00:00Z`), until: new Date(new Date(`${to}T00:00:00Z`).getTime() + DAY) }
    : PERIODS[period].range(new Date());
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
  // Checklists do Trello/equipe: clientes e no-shows marcados no app (sem reserva na Central).
  const [pastDepartures, pastTeams] = tourIds.length
    ? await Promise.all([
        db.tourDeparture.findMany({ where: { tourId: { in: tourIds }, startTime: { gte: since, lt: until } }, select: { tourId: true, startTime: true, checklists: true } }),
        db.guideAssignment.findMany({ where: { tourId: { in: tourIds }, status: "ASSIGNED", startTime: { gte: since, lt: until } }, select: { tourId: true, startTime: true } }),
      ])
    : [[], []];

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
      ...(() => {
        const dep = pastDepartures.find((d) => d.tourId === a.tourId && near(d.startTime, a.startTime));
        const guidesHere = pastTeams.filter((x) => x.tourId === a.tourId && near(x.startTime, a.startTime)).length;
        const manual = manualClientCounts(dep?.checklists, { guideId: guide.id, guideName: guide.name, onlyGuide: guidesHere <= 1 });
        const bookedPax = group.reduce((sum, b) => sum + bookingPax(b), 0);
        return {
          pax: bookedPax || manual.pax,
          noShow: group.filter((b) => b.attendanceStatus === "NO_SHOW").reduce((sum, b) => sum + bookingPax(b), 0) + manual.noShow,
        };
      })(),
    };
  });

  return {
    period,
    customRange: custom ? { from, to } : null,
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
  const { period, customRange, guide, totals, sales, past } = useLoaderData();
  const [, setParams] = useSearchParams();
  const [picking, setPicking] = useState(period === "datas");
  const [from, setFrom] = useState(customRange?.from || "");
  const [to, setTo] = useState(customRange?.to || "");
  const conversion = totals.links ? Math.round((totals.sales / totals.links) * 100) : null;
  const t = useT();
  const locale = useGuideLocale();
  return (
    <GuideShell title="Dash">
      <div className="g-top">
        <div>
          <h1>{t("Seus números")}</h1>
          <small>{t("Só as suas vendas e os passeios que você guiou")}</small>
        </div>
      </div>

      <div className="g-periods" role="tablist" aria-label={t("Período")}>
        {Object.entries(PERIODS).map(([key, p]) => (
          <button key={key} type="button" role="tab" aria-selected={period === key}
            className={`g-chip ${period === key ? "on" : ""}`}
            onClick={() => { setPicking(false); setParams(key === "mes" ? {} : { p: key }); }}>
            {t(p.label)}
          </button>
        ))}
        <button type="button" role="tab" aria-selected={period === "datas"} className={`g-chip ${period === "datas" || picking ? "on" : ""}`} onClick={() => setPicking(true)}>
          {t("Escolher datas")}
        </button>
      </div>
      {picking && (
        <div className="g-card g-range">
          <div className="g-field"><span>{t("De")}</span>
            <DatePicker aria-label={t("Data inicial")} value={from} onChange={(e) => setFrom(e?.target?.value ?? e)} locale={locale} placeholder="dd/mm/aaaa" todayLabel={t("Hoje")} clearLabel={t("Limpar")} />
          </div>
          <div className="g-field"><span>{t("Até")}</span>
            <DatePicker aria-label={t("Data final")} value={to} onChange={(e) => setTo(e?.target?.value ?? e)} locale={locale} placeholder="dd/mm/aaaa" todayLabel={t("Hoje")} clearLabel={t("Limpar")} />
          </div>
          <button type="button" className="g-btn primary" disabled={!from || !to || from > to} onClick={() => setParams({ p: "datas", de: from, ate: to })}>{t("Ver período")}</button>
        </div>
      )}

      <div className="g-card">
        <h2>{t("Vendas")}</h2>
        <div className="g-kpis">
          <div className="g-kpi"><small>{t("Vendas confirmadas")}</small><b>{totals.sales}</b></div>
          <div className="g-kpi"><small>{t("Valor vendido")}</small><b>{money(totals.revenue)}</b></div>
          <div className="g-kpi"><small>{t("Pessoas vendidas")}</small><b>{totals.pax}</b></div>
          <div className="g-kpi"><small>{t("Links que viraram venda")}</small><b>{conversion === null ? "—" : `${conversion}%`}</b></div>
        </div>
        {guide.code && <p className="g-empty" style={{ marginTop: 8 }}>{t("Seu código de vendas:")} <b>{guide.code}</b></p>}
      </div>

      <div className="g-card">
        <h2>{t("Passeios")}</h2>
        <div className="g-kpis">
          <div className="g-kpi"><small>{t("Passeios guiados")}</small><b>{totals.tours}</b></div>
          <div className="g-kpi"><small>{t("Pessoas atendidas")}</small><b>{totals.guided}</b></div>
          <div className="g-kpi"><small>No-show</small><b>{totals.noShow}</b></div>
          <div className="g-kpi"><small>{t("Média por passeio")}</small><b>{totals.tours ? (totals.guided / totals.tours).toFixed(1) : "—"}</b></div>
        </div>
      </div>

      <div className="g-card">
        <h2>{t("Vendas pelos seus links")}</h2>
        {!sales.length && <p className="g-empty">{t("Nenhuma venda neste período. Use “Vender” na aba Saídas para gerar um link.")}</p>}
        {sales.map((s) => {
          const [label, tone] = STATUS[s.status] || [s.status, "wait"];
          const when = lisbonParts(s.startTime, locale);
          return (
            <div key={s.id} className="g-guest">
              <div className="g-guest__head">
                <strong>{s.title}</strong>
                <span className={`g-pill ${tone}`}>{t(label)}</span>
              </div>
              <div className="g-guest__meta">
                {when.day} · {when.time} · {s.pax} pax · {money(s.price, s.currency)}{s.ref ? ` · ${s.ref}` : ""}
              </div>
            </div>
          );
        })}
      </div>

      <div className="g-card">
        <h2>{t("Passeios que você guiou")}</h2>
        {!past.length && <p className="g-empty">{t("Nenhum passeio neste período.")}</p>}
        {past.map((p) => {
          const when = lisbonParts(p.startTime, locale);
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

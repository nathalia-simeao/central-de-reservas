import { useState } from "react";


const ExpandIcon = () => (
  <svg className="pmy-kpi-expand" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17l9.2-9.2M17 17V7H7"/>
  </svg>
);

const KpiIcon = ({ name }) => {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const icons = {
    bookings: <><path d="M5 7h14M7 3v4M17 3v4"/><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 12h3M13 12h3M8 16h3"/></>,
    revenue: <><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5c-.8-.7-1.9-1-3.2-1-1.8 0-3.1.8-3.1 2 0 3 6.1 1.4 6.1 4.6 0 1.3-1.2 2.3-3.3 2.3-1.4 0-2.6-.4-3.5-1.2M12 5v14"/></>,
    ticket: <><path d="M3 8.5A2.5 2.5 0 015.5 6H19a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5.5A2.5 2.5 0 013 15.5v-1a2 2 0 000-4v-2z"/><path d="M13 9.5h4M13 14.5h4M8 9v6"/></>,
    canceled: <><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></>,
    upcoming: <><path d="M6 2v3M18 2v3M4 8h16"/><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 13h3M13 13h3M8 17h3"/></>,
  };

  return <svg {...common}>{icons[name] || icons.bookings}</svg>;
};

const TrendChart = ({
  data,
  currency,
  formatMoney,
  granularity,
  lang,
  periodLabel,
}) => {
  const [activeIndex, setActiveIndex] = useState(null);

  const width = 1000;
  const height = 320;
  const margin = { top: 28, right: 78, bottom: 54, left: 56 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const maxBookings = Math.max(1, ...data.map((item) => Number(item.bookings || 0)));
  const maxRevenue = Math.max(1, ...data.map((item) => Number(item.revenue || 0)));
  const hasData = data.some(
    (item) => Number(item.bookings || 0) > 0 || Number(item.revenue || 0) > 0,
  );

  const xStep = data.length > 0 ? plotWidth / data.length : plotWidth;
  const xCenter = (index) => margin.left + xStep * index + xStep / 2;
  const bookingsY = (value) =>
    margin.top + plotHeight - (Number(value || 0) / maxBookings) * plotHeight;
  const revenueY = (value) =>
    margin.top + plotHeight - (Number(value || 0) / maxRevenue) * plotHeight;

  const linePoints = data
    .map((item, index) => `${xCenter(index)},${revenueY(item.revenue)}`)
    .join(" ");

  const areaPath = data.length > 0
    ? [
        `M ${xCenter(0)} ${margin.top + plotHeight}`,
        ...data.map(
          (item, index) => `L ${xCenter(index)} ${revenueY(item.revenue)}`,
        ),
        `L ${xCenter(data.length - 1)} ${margin.top + plotHeight}`,
        "Z",
      ].join(" ")
    : "";

  const tickEvery = Math.max(1, Math.ceil(data.length / 8));
  const visibleTick = (index) =>
    index === 0 ||
    index === data.length - 1 ||
    index % tickEvery === 0;

  const bookingTicks = [maxBookings, Math.ceil(maxBookings / 2), 0];
  const revenueTicks = [maxRevenue, maxRevenue / 2, 0];

  const active = activeIndex === null ? null : data[activeIndex];
  const activeLeft =
    activeIndex === null || data.length === 0
      ? 50
      : Math.max(9, Math.min(91, ((activeIndex + 0.5) / data.length) * 100));

  const granularityLabel = {
    day: lang === "pt" ? "Diário" : "Daily",
    week: lang === "pt" ? "Semanal" : "Weekly",
    month: lang === "pt" ? "Mensal" : "Monthly",
  }[granularity] || granularity;

  return (
    <section className="pmy-trend-card">
      <div className="pmy-trend-header">
        <div>
          <div className="pmy-trend-eyebrow">
            {lang === "pt" ? "Evolução do período" : "Period evolution"}
          </div>
          <h2 className="pmy-trend-title">
            {lang === "pt" ? "Receita e reservas" : "Revenue and bookings"}
          </h2>
          <p className="pmy-trend-subtitle">
            {periodLabel} · {lang === "pt" ? "receita em" : "revenue in"} {currency}
          </p>
        </div>

        <div className="pmy-trend-meta">
          <span className="pmy-trend-granularity">{granularityLabel}</span>
          <div className="pmy-trend-legend" aria-label={lang === "pt" ? "Legenda" : "Legend"}>
            <span><i className="pmy-legend-bar" />{lang === "pt" ? "Reservas" : "Bookings"}</span>
            <span><i className="pmy-legend-line" />{lang === "pt" ? "Receita" : "Revenue"}</span>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="pmy-trend-empty">
          <div className="pmy-trend-empty-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>
            </svg>
          </div>
          <strong>{lang === "pt" ? "Ainda não há dados suficientes neste período" : "Not enough data in this period yet"}</strong>
          <span>{lang === "pt" ? "Quando entrarem reservas confirmadas, a evolução aparecerá aqui." : "Confirmed bookings will appear here as they arrive."}</span>
        </div>
      ) : (
        <div className="pmy-trend-chart-wrap">
          {active && (
            <div
              className="pmy-trend-tooltip"
              style={{ left: `${activeLeft}%` }}
            >
              <strong>{active.fullLabel}</strong>
              <span>{active.bookings} {lang === "pt" ? "reservas" : "bookings"}</span>
              <span>{formatMoney(active.revenue, currency)}</span>
            </div>
          )}

          <svg
            className="pmy-trend-chart"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={lang === "pt" ? "Gráfico de receita e reservas" : "Revenue and bookings chart"}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <defs>
              <linearGradient id="pmyRevenueArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary-green)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="var(--primary-green)" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = margin.top + plotHeight * ratio;
              return (
                <line
                  key={ratio}
                  x1={margin.left}
                  x2={width - margin.right}
                  y1={y}
                  y2={y}
                  className="pmy-trend-gridline"
                />
              );
            })}

            {bookingTicks.map((value, index) => {
              const ratio = maxBookings === 0 ? 1 : value / maxBookings;
              const y = margin.top + plotHeight - ratio * plotHeight;
              return (
                <text key={`b-${index}`} x={margin.left - 12} y={y + 4} textAnchor="end" className="pmy-trend-axis-label">
                  {Math.round(value)}
                </text>
              );
            })}

            {revenueTicks.map((value, index) => {
              const ratio = maxRevenue === 0 ? 1 : value / maxRevenue;
              const y = margin.top + plotHeight - ratio * plotHeight;
              const compact = new Intl.NumberFormat(lang === "pt" ? "pt-PT" : "en-GB", {
                notation: value >= 1000 ? "compact" : "standard",
                maximumFractionDigits: value >= 1000 ? 1 : 0,
              }).format(value);
              return (
                <text key={`r-${index}`} x={width - margin.right + 12} y={y + 4} textAnchor="start" className="pmy-trend-axis-label">
                  {compact}
                </text>
              );
            })}

            <path d={areaPath} fill="url(#pmyRevenueArea)" />

            {data.map((item, index) => {
              const barWidth = Math.min(34, Math.max(7, xStep * 0.34));
              const y = bookingsY(item.bookings);
              const barHeight = margin.top + plotHeight - y;
              return (
                <rect
                  key={`bar-${item.key}`}
                  x={xCenter(index) - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={Math.max(1.5, barHeight)}
                  rx={Math.min(6, barWidth / 2)}
                  className="pmy-trend-bar"
                />
              );
            })}

            <polyline
              points={linePoints}
              fill="none"
              className="pmy-trend-line"
            />

            {data.map((item, index) => (
              <circle
                key={`point-${item.key}`}
                cx={xCenter(index)}
                cy={revenueY(item.revenue)}
                r={activeIndex === index ? 5 : 3}
                className="pmy-trend-point"
              />
            ))}

            {data.map((item, index) => (
              visibleTick(index) ? (
                <text
                  key={`label-${item.key}`}
                  x={xCenter(index)}
                  y={height - 20}
                  textAnchor="middle"
                  className="pmy-trend-x-label"
                >
                  {item.label}
                </text>
              ) : null
            ))}

            {activeIndex !== null && (
              <line
                x1={xCenter(activeIndex)}
                x2={xCenter(activeIndex)}
                y1={margin.top}
                y2={margin.top + plotHeight}
                className="pmy-trend-hover-line"
              />
            )}

            {data.map((item, index) => (
              <rect
                key={`hit-${item.key}`}
                x={margin.left + xStep * index}
                y={margin.top}
                width={xStep}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseMove={() => setActiveIndex(index)}
                onTouchStart={() => setActiveIndex(index)}
              />
            ))}
          </svg>

          <div className="pmy-trend-axis-captions">
            <span>{lang === "pt" ? "Reservas" : "Bookings"}</span>
            <span>{currency}</span>
          </div>
        </div>
      )}
    </section>
  );
};

export default function DashboardTab(props) {
  const {
    activeTab,
    setActiveModal,
    t,
    totalSalesCount,
    confirmedRevenueValue,
    formatMoney,
    missingFinancialBookings,
    pricedConfirmedBookings,
    revenueCurrencies,
    lang,
    averageTicketValue,
    canceledCount,
    cancellationRate,
    upcomingCount,
    getPeriodLabel,
    salesByChannel,
    categoriesData,
    toggleCategory,
    openCategories,
    realConfirmedBookings,
    dashboardTrendData,
    dashboardTrendGranularity,
    dashboardCurrency,
    imageShape
  } = props;

  return (
    <>
{/* ===== TAB: DASHBOARD ===== */}
          {activeTab==='dashboard' && (
            <div className="pmy-dashboard">
              {(() => {
                const confirmedPassengers = realConfirmedBookings.reduce(
                  (total, booking) => total + Number(booking?.totalParticipants || 0),
                  0,
                );
                const channelCount = salesByChannel.length;
                const financeCoverage = totalSalesCount > 0
                  ? Math.round((pricedConfirmedBookings.length / totalSalesCount) * 100)
                  : 0;

                const kpis = [
                  {
                    key: "sales",
                    icon: "bookings",
                    label: lang === "pt" ? "Reservas confirmadas" : "Confirmed bookings",
                    value: totalSalesCount,
                    detail: `${confirmedPassengers} pax · ${getPeriodLabel()}`,
                    tone: "primary",
                    modal: "sales",
                  },
                  {
                    key: "revenue",
                    icon: "revenue",
                    label: t.dash_revenue_confirmed,
                    value: confirmedRevenueValue > 0 ? formatMoney(confirmedRevenueValue) : "—",
                    detail: missingFinancialBookings.length
                      ? `${pricedConfirmedBookings.length} com valor · ${missingFinancialBookings.length} sem valor`
                      : `${pricedConfirmedBookings.length} reservas com valor real`,
                    tone: "primary",
                    modal: "confirmed",
                    featured: true,
                  },
                  {
                    key: "ticket",
                    icon: "ticket",
                    label: lang === "pt" ? "Ticket médio" : "Average ticket",
                    value: averageTicketValue > 0 ? formatMoney(averageTicketValue) : "—",
                    detail: lang === "pt"
                      ? `baseado em ${pricedConfirmedBookings.length} reservas`
                      : `based on ${pricedConfirmedBookings.length} bookings`,
                    tone: "gold",
                    modal: "estimated",
                  },
                  {
                    key: "canceled",
                    icon: "canceled",
                    label: lang === "pt" ? "Cancelamentos" : "Cancellations",
                    value: canceledCount,
                    detail: `${cancellationRate.toFixed(1)}% ${lang === "pt" ? "da base fechada" : "of closed bookings"}`,
                    tone: "danger",
                    modal: "canceled",
                  },
                  {
                    key: "upcoming",
                    icon: "upcoming",
                    label: lang === "pt" ? "Próximas saídas" : "Upcoming departures",
                    value: upcomingCount,
                    detail: lang === "pt" ? "próximos 30 dias" : "next 30 days",
                    tone: "neutral",
                    modal: "upcoming",
                  },
                ];

                return (
                  <>
                    <section className="pmy-dashboard-kpi-grid" aria-label={lang === "pt" ? "Indicadores principais" : "Key metrics"}>
                      {kpis.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          className={`pmy-kpi-card pmy-kpi-${item.tone} ${item.featured ? "is-featured" : ""}`}
                          onClick={() => setActiveModal(item.modal)}
                        >
                          <span className="pmy-kpi-topline">
                            <span className="pmy-kpi-icon"><KpiIcon name={item.icon} /></span>
                            <ExpandIcon />
                          </span>
                          <span className="pmy-kpi-label">{item.label}</span>
                          <strong className="pmy-kpi-value">{item.value}</strong>
                          <span className="pmy-kpi-detail">{item.detail}</span>
                        </button>
                      ))}
                    </section>

                    <section className="pmy-dashboard-status-strip">
                      <div className="pmy-dashboard-status-item">
                        <span className="pmy-dashboard-status-dot is-good" />
                        <div>
                          <strong>{confirmedPassengers}</strong>
                          <span>{lang === "pt" ? "passageiros confirmados" : "confirmed passengers"}</span>
                        </div>
                      </div>
                      <div className="pmy-dashboard-status-item">
                        <span className="pmy-dashboard-status-dot is-info" />
                        <div>
                          <strong>{channelCount}</strong>
                          <span>{lang === "pt" ? "canais com vendas" : "channels with sales"}</span>
                        </div>
                      </div>
                      <div className="pmy-dashboard-status-item">
                        <span className={`pmy-dashboard-status-dot ${financeCoverage === 100 ? "is-good" : "is-warning"}`} />
                        <div>
                          <strong>{financeCoverage}%</strong>
                          <span>{lang === "pt" ? "cobertura financeira" : "financial coverage"}</span>
                        </div>
                      </div>
                      <div className="pmy-dashboard-status-item">
                        <span className={`pmy-dashboard-status-dot ${revenueCurrencies.length <= 1 ? "is-good" : "is-warning"}`} />
                        <div>
                          <strong>{revenueCurrencies.length || 0}</strong>
                          <span>{lang === "pt" ? "moedas no período" : "currencies in period"}</span>
                        </div>
                      </div>
                    </section>
                  </>
                );
              })()}

              <TrendChart
                data={dashboardTrendData || []}
                currency={dashboardCurrency || "EUR"}
                formatMoney={formatMoney}
                granularity={dashboardTrendGranularity}
                lang={lang}
                periodLabel={getPeriodLabel()}
              />

              <div className="pmy-card" style={{ marginBottom:'20px', padding:'18px 22px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px', flexWrap:'wrap', marginBottom:'12px' }}>
                  <div>
                    <div className="pmy-card-title" style={{ fontSize:'16px', marginBottom:'3px' }}>{lang==='pt'?'Vendas por Canal':'Sales by Channel'}</div>
                    <div style={{ fontSize:'11px', color:'#888' }}>{getPeriodLabel()} · {lang==='pt'?'somente reservas confirmadas':'confirmed bookings only'}</div>
                  </div>
                  {missingFinancialBookings.length > 0 && (
                    <span style={{ fontSize:'10px', background:'#fff7ed', color:'#b45309', padding:'5px 9px', borderRadius:'14px', fontWeight:'800' }}>
                      ⚠️ {missingFinancialBookings.length} {lang==='pt'?'sem valor financeiro':'without financial value'}
                    </span>
                  )}
                </div>
                {salesByChannel.length === 0 ? (
                  <div style={{ color:'#999', fontSize:'13px', padding:'8px 0' }}>{lang==='pt'?'Nenhuma venda confirmada no período.':'No confirmed sales in this period.'}</div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'10px' }}>
                    {salesByChannel.map(channel => {
                      const revenues = Object.entries(channel.revenueByCurrency);
                      return (
                        <div key={channel.platform} style={{ border:'1px solid #eee', borderRadius:'10px', padding:'12px 14px', background:'#fff' }}>
                          <div style={{ fontWeight:'900', fontSize:'13px', color:'#333' }}>{channel.label}</div>
                          <div style={{ fontSize:'21px', fontWeight:'900', color:'var(--primary-green)', marginTop:'5px' }}>{channel.bookings}</div>
                          <div style={{ fontSize:'10px', color:'#888' }}>{lang==='pt'?'reservas confirmadas':'confirmed bookings'} · {channel.passengers} pax</div>
                          <div style={{ fontSize:'12px', fontWeight:'800', marginTop:'7px', color:'#444' }}>
                            {revenues.length > 0
                              ? revenues.map(([currency, amount]) => formatMoney(amount, currency)).join(' + ')
                              : '—'}
                          </div>
                          {channel.missingValue > 0 && <div style={{ fontSize:'10px', color:'#b45309', marginTop:'3px' }}>⚠️ {channel.missingValue} {lang==='pt'?'sem valor':'without value'}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="pmy-grid" style={{ gridTemplateColumns:'1fr' }}>
                <div className="pmy-card" style={{ padding:'0 25px 25px 25px' }}>
                  <div style={{ padding:'25px 0 10px 0', borderBottom:'2px solid #f0f0f0' }}>
                    <div className="pmy-card-title" style={{ fontSize:'18px', color:'#000', margin:0 }}>{t.dash_performance}</div>
                  </div>
                  {categoriesData.map(cat => (
                    <div key={cat.name}>
                      <div className="pmy-accordion-header" onClick={() => toggleCategory(cat.name)}>
                        <span className="pmy-accordion-title">{cat.name}</span>
                        <span className="pmy-accordion-arrow">▼</span>
                      </div>
                      <div className={`pmy-accordion-content ${openCategories.includes(cat.name)?'open':''}`}>
                        {cat.toursList.length === 0 ? (
                          <p style={{ padding:'10px 0', color:'#999', fontSize:'14px' }}>Nenhum passeio nesta categoria.</p>
                        ) : cat.toursList.map(tour => {
                          const masterTourId = tour.masterTourId || tour.id;
                          const tourBookings = realConfirmedBookings.filter(b => b.tourId === masterTourId);
                          const shopifyB = tourBookings.filter(b=>b.platform==='SHOPIFY').length;
                          const viatorB  = tourBookings.filter(b=>b.platform==='VIATOR').length;
                          const gygB     = tourBookings.filter(b=>b.platform==='GETYOURGUIDE').length;
                          return (
                            <div className="pmy-tour-item" key={tour.id}>
                              {tour.image
                                ? <img src={tour.image} alt={tour.imageAlt || tour.title} className={`pmy-tour-img ${imageShape}`} />
                                : <div className={`pmy-tour-img ${imageShape}`} style={{ display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', background:'#f9f2f2' }}>🏰</div>
                              }
                              <div className="pmy-tour-details">
                                <div className="pmy-tour-name">{tour.title||"Tour sem título"}</div>
                                {tour.price && <div style={{ fontSize:'12px', color:'var(--primary-green)', fontWeight:'700', marginBottom:'4px' }}>{tour.price}</div>}
                                <div className="pmy-tag-row">
                                  <span className="pmy-tag site">{t.source_site}: {shopifyB} reservas</span>
                                  <span className="pmy-tag viator">{t.source_viator}: {viatorB} reservas</span>
                                  <span className="pmy-tag gyg">{t.source_gyg}: {gygB} reservas</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
    </>
  );
}

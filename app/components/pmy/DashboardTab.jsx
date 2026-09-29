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

const DashboardEmptyState = ({
  icon = "chart",
  title,
  description,
  compact = false,
}) => {
  const icons = {
    chart: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></>,
    calendar: <><path d="M6 2v3M18 2v3M4 8h16"/><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 13h3M13 13h3M8 17h3"/></>,
    ranking: <><path d="M8 21V11h4v10M14 21V5h4v16M2 21v-6h4v6M2 21h18"/></>,
    bookings: <><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4M16 3v4M8 11h8M8 15h5"/></>,
  };

  return (
    <div
      role="status"
      style={{
        minHeight:compact ? '112px' : '150px',
        display:'grid',
        placeItems:'center',
        textAlign:'center',
        padding:compact ? '18px' : '24px'
      }}
    >
      <div style={{ maxWidth:'470px' }}>
        <span style={{
          width:compact ? '38px' : '44px',
          height:compact ? '38px' : '44px',
          borderRadius:'14px',
          display:'grid',
          placeItems:'center',
          margin:'0 auto 10px',
          background:'color-mix(in srgb, var(--primary-green) 7%, white)',
          color:'var(--primary-green)',
          border:'1px solid color-mix(in srgb, var(--primary-green) 15%, #e7ebe7)'
        }}>
          <svg
            width={compact ? 19 : 22}
            height={compact ? 19 : 22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {icons[icon] || icons.chart}
          </svg>
        </span>
        <strong style={{
          display:'block',
          fontSize:compact ? '14px' : '15px',
          color:'#404641',
          marginBottom:'4px'
        }}>
          {title}
        </strong>
        <span style={{
          display:'block',
          fontSize:compact ? '12px' : '13px',
          lineHeight:1.5,
          color:'#858b86'
        }}>
          {description}
        </span>
      </div>
    </div>
  );
};

const DashboardResponsiveStyles = () => (
  <style>{`
    .pmy-upcoming-mobile-label {
      display:none;
    }

    @media (max-width:1180px) {
      .pmy-dashboard .pmy-dashboard-kpi-grid {
        grid-template-columns:repeat(2,minmax(0,1fr));
      }
      .pmy-dashboard .pmy-kpi-card.is-featured {
        grid-column:span 2;
      }
      .pmy-dashboard .pmy-booking-status-grid {
        grid-template-columns:repeat(2,minmax(0,1fr)) !important;
      }
      .pmy-dashboard .pmy-ranking-row {
        grid-template-columns:42px minmax(180px,1.35fr) minmax(100px,1fr) 84px 92px minmax(120px,1fr) !important;
        gap:10px !important;
      }
      .pmy-dashboard .pmy-ranking-controls {
        max-width:100%;
        overflow-x:auto;
        scrollbar-width:thin;
      }
      .pmy-dashboard .pmy-ranking-controls button {
        flex:0 0 auto;
      }
    }

    @media (max-width:820px) {
      .pmy-dashboard .pmy-dashboard-status-strip {
        grid-template-columns:repeat(2,minmax(0,1fr));
      }
      .pmy-dashboard .pmy-trend-chart {
        min-width:600px;
      }

      .pmy-dashboard .pmy-upcoming-table {
        overflow:visible !important;
      }
      .pmy-dashboard .pmy-upcoming-table-inner {
        min-width:0 !important;
      }
      .pmy-dashboard .pmy-upcoming-table-head {
        display:none !important;
      }
      .pmy-dashboard .pmy-upcoming-row {
        display:grid !important;
        grid-template-columns:repeat(2,minmax(0,1fr)) !important;
        gap:12px 16px !important;
        min-height:0 !important;
        margin-bottom:10px;
        padding:14px !important;
        border:1px solid #e8ece8 !important;
        border-radius:16px;
        background:#fff;
      }
      .pmy-dashboard .pmy-upcoming-tour {
        grid-column:1 / -1;
        padding-bottom:10px;
        border-bottom:1px solid #f0f1f0;
      }
      .pmy-dashboard .pmy-upcoming-channels {
        grid-column:1 / -1;
      }
      .pmy-dashboard .pmy-upcoming-seats {
        text-align:left !important;
      }
      .pmy-upcoming-mobile-label {
        display:block;
        margin-bottom:4px;
        font-size:10px;
        line-height:1;
        font-weight:850;
        letter-spacing:.05em;
        text-transform:uppercase;
        color:#929792;
      }

      .pmy-dashboard .pmy-ranking-row {
        grid-template-columns:40px minmax(0,1fr) minmax(115px,.6fr) !important;
        align-items:center !important;
      }
      .pmy-dashboard .pmy-ranking-position {
        grid-column:1;
        grid-row:1;
      }
      .pmy-dashboard .pmy-ranking-tour {
        grid-column:2;
        grid-row:1;
      }
      .pmy-dashboard .pmy-ranking-bar {
        grid-column:1 / -1;
        grid-row:2;
      }
      .pmy-dashboard .pmy-ranking-bookings {
        grid-column:1;
        grid-row:3;
      }
      .pmy-dashboard .pmy-ranking-passengers {
        grid-column:2;
        grid-row:3;
      }
      .pmy-dashboard .pmy-ranking-revenue {
        grid-column:3;
        grid-row:1 / span 3;
        align-self:stretch;
        display:flex;
        flex-direction:column;
        justify-content:center;
        padding-left:12px;
        border-left:1px solid #eef0ee;
      }
    }

    @media (max-width:620px) {
      .pmy-dashboard {
        gap:13px;
      }
      .pmy-dashboard .pmy-dashboard-kpi-grid {
        grid-template-columns:1fr;
      }
      .pmy-dashboard .pmy-kpi-card.is-featured {
        grid-column:span 1;
      }
      .pmy-dashboard .pmy-dashboard-status-strip {
        grid-template-columns:1fr;
      }
      .pmy-dashboard .pmy-booking-status-grid {
        grid-template-columns:1fr !important;
      }

      .pmy-dashboard .pmy-cross-filter-bar {
        align-items:stretch !important;
        flex-direction:column;
      }
      .pmy-dashboard .pmy-cross-filter-actions {
        width:100%;
      }
      .pmy-dashboard .pmy-cross-filter-actions > button {
        max-width:100% !important;
      }

      .pmy-dashboard .pmy-channel-row {
        grid-template-columns:minmax(0,1fr) 68px !important;
        gap:8px 10px !important;
      }
      .pmy-dashboard .pmy-channel-row > :nth-child(1) {
        grid-column:1;
        grid-row:1;
      }
      .pmy-dashboard .pmy-channel-row > :nth-child(2) {
        grid-column:1 / -1;
        grid-row:2;
      }
      .pmy-dashboard .pmy-channel-row > :nth-child(3) {
        grid-column:2;
        grid-row:1;
      }
      .pmy-dashboard .pmy-channel-detail {
        grid-template-columns:repeat(2,minmax(0,1fr)) !important;
      }
      .pmy-dashboard .pmy-channel-detail > :last-child {
        grid-column:1 / -1;
        justify-content:flex-start !important;
      }

      .pmy-dashboard .pmy-ranking-header {
        align-items:stretch !important;
      }
      .pmy-dashboard .pmy-ranking-controls {
        width:100%;
      }
      .pmy-dashboard .pmy-ranking-row {
        grid-template-columns:38px minmax(0,1fr) !important;
        gap:10px !important;
        padding:12px !important;
      }
      .pmy-dashboard .pmy-ranking-position {
        grid-column:1;
        grid-row:1;
      }
      .pmy-dashboard .pmy-ranking-tour {
        grid-column:2;
        grid-row:1;
      }
      .pmy-dashboard .pmy-ranking-bar {
        grid-column:1 / -1;
        grid-row:2;
      }
      .pmy-dashboard .pmy-ranking-bookings {
        grid-column:1;
        grid-row:3;
      }
      .pmy-dashboard .pmy-ranking-passengers {
        grid-column:2;
        grid-row:3;
      }
      .pmy-dashboard .pmy-ranking-revenue {
        grid-column:1 / -1;
        grid-row:4;
        padding:10px 0 0;
        border-left:0;
        border-top:1px solid #eef0ee;
        text-align:left !important;
      }

      .pmy-dashboard .pmy-upcoming-row {
        grid-template-columns:1fr !important;
      }
      .pmy-dashboard .pmy-upcoming-tour,
      .pmy-dashboard .pmy-upcoming-channels {
        grid-column:1;
      }
      .pmy-dashboard .pmy-upcoming-seats {
        display:flex;
        align-items:center;
        gap:10px;
        flex-wrap:wrap;
      }
      .pmy-dashboard .pmy-upcoming-seats .pmy-upcoming-mobile-label {
        width:100%;
      }

      .pmy-dashboard .pmy-trend-chart {
        min-width:520px;
      }
      .pmy-dashboard .pmy-trend-card {
        overflow:hidden;
      }
      .pmy-dashboard .pmy-trend-chart-wrap {
        overflow-x:auto;
        overscroll-behavior-inline:contain;
        scrollbar-width:thin;
      }
    }

    @media (max-width:430px) {
      .pmy-dashboard .pmy-kpi-card {
        min-height:132px;
      }
      .pmy-dashboard .pmy-trend-chart {
        min-width:480px;
      }
      .pmy-dashboard .pmy-channel-detail {
        grid-template-columns:1fr !important;
      }
      .pmy-dashboard .pmy-channel-detail > :last-child {
        grid-column:1;
      }
    }
  `}</style>
);

const dashboardChannelKey = (platform) => {
  const key = String(platform || "").trim().toUpperCase();
  if (key === "SHOPIFY") return "SHOPIFY";
  if (key === "VIATOR") return "VIATOR";
  if (["GETYOURGUIDE", "GET_YOUR_GUIDE", "GYG"].includes(key)) return "GETYOURGUIDE";
  if (key === "CIVITATIS") return "CIVITATIS";
  if (key === "HEADOUT") return "HEADOUT";
  return "OTHER";
};

const dashboardChannelLabel = (key, lang) => ({
  SHOPIFY: "Shopify",
  VIATOR: "Viator",
  GETYOURGUIDE: "GetYourGuide",
  CIVITATIS: "Civitatis",
  HEADOUT: "Headout",
  OTHER: lang === "pt" ? "Outros" : "Other",
}[key] || key);

const TrendChart = ({
  data,
  currency,
  formatMoney,
  granularity,
  lang,
  periodLabel,
}) => {
  const [activeIndex, setActiveIndex] = useState(null);
  const [pinnedIndex, setPinnedIndex] = useState(null);

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

  const displayIndex = activeIndex !== null ? activeIndex : pinnedIndex;
  const active = displayIndex === null ? null : data[displayIndex];
  const activeLeft =
    displayIndex === null || data.length === 0
      ? 50
      : Math.max(9, Math.min(91, ((displayIndex + 0.5) / data.length) * 100));

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
        <DashboardEmptyState
          icon="chart"
          title={lang === "pt"
            ? "Ainda não há evolução para mostrar"
            : "There is no trend to show yet"}
          description={lang === "pt"
            ? "Assim que houver reservas confirmadas neste período, o gráfico exibirá a evolução de reservas e receita real."
            : "As soon as confirmed bookings exist in this period, the chart will show booking and real revenue trends."}
        />
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
                r={displayIndex === index ? 5 : 3}
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

            {displayIndex !== null && (
              <line
                x1={xCenter(displayIndex)}
                x2={xCenter(displayIndex)}
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
                onClick={() => setPinnedIndex((current) => current === index ? null : index)}
                style={{ cursor:'pointer' }}
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

const ChannelBookingsChart = ({
  bookings = [],
  lang,
  activeChannelFilter = null,
  onChannelFilter,
}) => {
  const [expandedKey, setExpandedKey] = useState(null);
  const [selectedRange, setSelectedRange] = useState("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [calendarSelectionStep, setCalendarSelectionStep] = useState("start");

  const classifyChannel = (platform) => {
    const key = String(platform || "").trim().toUpperCase();

    if (key === "SHOPIFY") return "SHOPIFY";
    if (key === "VIATOR") return "VIATOR";
    if (["GETYOURGUIDE", "GET_YOUR_GUIDE", "GYG"].includes(key)) return "GETYOURGUIDE";
    if (key === "CIVITATIS") return "CIVITATIS";
    if (key === "HEADOUT") return "HEADOUT";

    return "OTHER";
  };

  const baseChannels = [
    { key: "SHOPIFY", label: "Shopify" },
    { key: "VIATOR", label: "Viator" },
    { key: "GETYOURGUIDE", label: "GetYourGuide" },
    { key: "CIVITATIS", label: "Civitatis" },
    { key: "HEADOUT", label: "Headout" },
    { key: "OTHER", label: lang === "pt" ? "Outros" : "Other" },
  ];

  const endOfDay = (value) => {
    const result = new Date(value);
    result.setHours(23, 59, 59, 999);
    return result;
  };

  const startOfDay = (value) => {
    const result = new Date(value);
    result.setHours(0, 0, 0, 0);
    return result;
  };

  const parseDateInput = (value) => {
    if (!value) return null;
    const parts = value.split("-").map(Number);
    if (parts.length !== 3 || parts.some((item) => !Number.isFinite(item))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  };

  const now = new Date();
  const rangeEnd = selectedRange === "custom"
    ? endOfDay(parseDateInput(customEnd) || now)
    : endOfDay(now);

  const rangeStart = (() => {
    if (selectedRange === "custom") {
      return startOfDay(parseDateInput(customStart) || now);
    }

    const result = startOfDay(now);

    if (selectedRange === "6m") {
      result.setMonth(result.getMonth() - 6);
      return result;
    }

    if (selectedRange === "1y") {
      result.setFullYear(result.getFullYear() - 1);
      return result;
    }

    const days = {
      "7d": 7,
      "15d": 15,
      "30d": 30,
      "60d": 60,
      "90d": 90,
    }[selectedRange] || 30;

    result.setDate(result.getDate() - days);
    return result;
  })();

  const confirmedBookings = (bookings || []).filter((booking) => {
    if (String(booking?.status || "").toUpperCase() !== "CONFIRMED") return false;

    const rawDate = booking?.externalCreatedAt || booking?.createdAt;
    const createdAt = rawDate ? new Date(rawDate) : null;

    return (
      createdAt instanceof Date &&
      !Number.isNaN(createdAt.getTime()) &&
      createdAt >= rangeStart &&
      createdAt <= rangeEnd
    );
  });

  const totals = confirmedBookings.reduce((acc, booking) => {
    const key = classifyChannel(booking?.platform);

    if (!acc[key]) {
      acc[key] = { bookings: 0, passengers: 0 };
    }

    acc[key].bookings += 1;
    acc[key].passengers += Number(booking?.totalParticipants || 0);
    return acc;
  }, {});

  const data = baseChannels.map((channel) => ({
    ...channel,
    bookings: Number(totals[channel.key]?.bookings || 0),
    passengers: Number(totals[channel.key]?.passengers || 0),
  }));

  const totalBookings = data.reduce((sum, item) => sum + item.bookings, 0);
  const maxBookings = Math.max(1, ...data.map((item) => item.bookings));

  const formatDate = (date) =>
    new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);

  const rangeLabel = selectedRange === "custom"
    ? `${formatDate(rangeStart)} – ${formatDate(rangeEnd)}`
    : ({
        "7d": lang === "pt" ? "7 dias" : "7 days",
        "15d": lang === "pt" ? "15 dias" : "15 days",
        "30d": lang === "pt" ? "30 dias" : "30 days",
        "60d": lang === "pt" ? "60 dias" : "60 days",
        "90d": lang === "pt" ? "90 dias" : "90 days",
        "6m": lang === "pt" ? "6 meses" : "6 months",
        "1y": lang === "pt" ? "1 ano" : "1 year",
      }[selectedRange] || (lang === "pt" ? "30 dias" : "30 days"));

  const toDateInput = (date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

  const ensureCustomDates = () => {
    if (customStart && customEnd) return;

    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 30);

    if (!customStart) setCustomStart(toDateInput(start));
    if (!customEnd) setCustomEnd(toDateInput(today));
  };

  const choosePreset = (value) => {
    if (value === "custom") {
      ensureCustomDates();
      setSelectedRange("custom");
      const currentStart = parseDateInput(customStart);
      const anchorDate = currentStart || new Date();
      setCalendarMonth(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1));
      setCalendarSelectionStep("start");
      return;
    }

    setSelectedRange(value);
    setPeriodMenuOpen(false);
  };

  const calendarMonthLabel = new Intl.DateTimeFormat(
    lang === "pt" ? "pt-PT" : "en-GB",
    { month: "long", year: "numeric" },
  ).format(calendarMonth);

  const calendarWeekdays = lang === "pt"
    ? ["S", "T", "Q", "Q", "S", "S", "D"]
    : ["M", "T", "W", "T", "F", "S", "S"];

  const calendarDays = (() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const cells = [];

    for (let index = 0; index < mondayOffset; index += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }

    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  })();

  const sameCalendarDay = (left, right) =>
    left &&
    right &&
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  const selectedStartDate = parseDateInput(customStart);
  const selectedEndDate = parseDateInput(customEnd);

  const handleCalendarDayClick = (date) => {
    const value = toDateInput(date);
    setSelectedRange("custom");

    if (
      calendarSelectionStep === "start" ||
      !selectedStartDate ||
      (selectedStartDate && selectedEndDate)
    ) {
      setCustomStart(value);
      setCustomEnd("");
      setCalendarSelectionStep("end");
      return;
    }

    if (date < selectedStartDate) {
      setCustomStart(value);
      setCustomEnd("");
      setCalendarSelectionStep("end");
      return;
    }

    setCustomEnd(value);
    setCalendarSelectionStep("start");
  };

  const moveCalendarMonth = (direction) => {
    setCalendarMonth((current) =>
      new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  };

  const applyCustomRange = () => {
    if (!customStart || !customEnd) return;
    setSelectedRange("custom");
    setPeriodMenuOpen(false);
  };

  const presetOptions = [
    ["7d", lang === "pt" ? "7 dias" : "7 days"],
    ["15d", lang === "pt" ? "15 dias" : "15 days"],
    ["30d", lang === "pt" ? "30 dias" : "30 days"],
    ["60d", lang === "pt" ? "60 dias" : "60 days"],
    ["90d", lang === "pt" ? "90 dias" : "90 days"],
    ["6m", lang === "pt" ? "6 meses" : "6 months"],
    ["1y", lang === "pt" ? "1 ano" : "1 year"],
  ];

  return (
    <section className="pmy-card" style={{ marginBottom:'20px', padding:'20px 22px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'16px', flexWrap:'wrap', marginBottom:'18px' }}>
        <div>
          <div className="pmy-trend-eyebrow">
            {lang === 'pt' ? 'Distribuição por canal' : 'Channel distribution'}
          </div>
          <h2 className="pmy-trend-title" style={{ marginBottom:'4px' }}>
            {lang === 'pt' ? 'Reservas por Canal' : 'Bookings by Channel'}
          </h2>
          <div className="pmy-trend-subtitle">
            {rangeLabel} · {lang === 'pt' ? 'somente reservas confirmadas' : 'confirmed bookings only'}
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'flex-end', gap:'10px', flexWrap:'wrap', justifyContent:'flex-end' }}>
          <div style={{ position:'relative' }}>
            <div style={{ fontSize:'15px', color:'#777', fontWeight:'700', marginBottom:'4px' }}>
              {lang === 'pt' ? 'Período do gráfico' : 'Chart period'}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!periodMenuOpen && selectedRange === "custom") ensureCustomDates();
                setPeriodMenuOpen((open) => !open);
              }}
              style={{
                minWidth:'154px',
                height:'38px',
                border:'1px solid #dedede',
                borderRadius:'12px',
                background:'#fff',
                padding:'0 12px',
                display:'flex',
                alignItems:'center',
                justifyContent:'space-between',
                gap:'10px',
                fontSize:'13px',
                fontWeight:'800',
                color:'#333',
                cursor:'pointer',
                boxShadow:periodMenuOpen ? '0 8px 24px rgba(0,0,0,.08)' : 'none'
              }}
            >
              <span style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                <span aria-hidden="true">📅</span>
                <span>{rangeLabel}</span>
              </span>
              <span
                aria-hidden="true"
                style={{
                  fontSize:'13px',
                  transform:periodMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition:'transform .18s ease'
                }}
              >
                ▾
              </span>
            </button>

            {periodMenuOpen && (
              <div
                style={{
                  position:'absolute',
                  top:'calc(100% + 8px)',
                  right:0,
                  width:'520px',
                  maxWidth:'min(520px, calc(100vw - 48px))',
                  display:'grid',
                  gridTemplateColumns:'168px minmax(0,1fr)',
                  background:'#fff',
                  border:'1px solid #e5e5e5',
                  borderRadius:'18px',
                  boxShadow:'0 20px 55px rgba(29,45,34,.16)',
                  overflow:'hidden',
                  zIndex:80
                }}
              >
                <div style={{
                  padding:'12px',
                  borderRight:'1px solid #ededed',
                  background:'#fbfbfb'
                }}>
                  <div style={{
                    fontSize:'13px',
                    color:'#999',
                    fontWeight:'800',
                    textTransform:'uppercase',
                    letterSpacing:'.06em',
                    padding:'3px 8px 8px'
                  }}>
                    {lang === 'pt' ? 'Períodos rápidos' : 'Quick ranges'}
                  </div>

                  <div style={{ display:'grid', gap:'3px' }}>
                    {presetOptions.map(([value, label]) => {
                      const active = selectedRange === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => choosePreset(value)}
                          style={{
                            border:0,
                            borderRadius:'10px',
                            background:active ? 'color-mix(in srgb, var(--primary-green) 11%, white)' : 'transparent',
                            color:active ? 'var(--primary-green)' : '#444',
                            padding:'9px 10px',
                            textAlign:'left',
                            fontSize:'13px',
                            fontWeight:active ? '850' : '700',
                            cursor:'pointer'
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => choosePreset("custom")}
                      style={{
                        border:0,
                        borderRadius:'10px',
                        background:selectedRange === "custom"
                          ? 'color-mix(in srgb, var(--primary-green) 11%, white)'
                          : 'transparent',
                        color:selectedRange === "custom" ? 'var(--primary-green)' : '#444',
                        padding:'9px 10px',
                        textAlign:'left',
                        fontSize:'13px',
                        fontWeight:selectedRange === "custom" ? '850' : '700',
                        cursor:'pointer'
                      }}
                    >
                      {lang === 'pt' ? 'Personalizado' : 'Custom'}
                    </button>
                  </div>
                </div>

                <div style={{ padding:'17px 18px 16px' }}>
                  <div style={{
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'space-between',
                    gap:'12px',
                    marginBottom:'16px'
                  }}>
                    <div>
                      <div style={{ fontSize:'15px', fontWeight:'900', color:'#2e2e2e' }}>
                        {lang === 'pt' ? 'Calendário' : 'Calendar'}
                      </div>
                      <div style={{ fontSize:'15px', color:'#999', marginTop:'2px' }}>
                        {lang === 'pt'
                          ? 'Escolha uma data inicial e final'
                          : 'Choose a start and end date'}
                      </div>
                    </div>
                    <span style={{
                      width:'34px',
                      height:'34px',
                      borderRadius:'10px',
                      display:'grid',
                      placeItems:'center',
                      background:'color-mix(in srgb, var(--primary-green) 9%, white)',
                      fontSize:'16px'
                    }}>
                      📆
                    </span>
                  </div>

                  <div style={{
                    display:'grid',
                    gridTemplateColumns:'minmax(0,1fr) 26px minmax(0,1fr)',
                    gap:'8px',
                    alignItems:'stretch',
                    marginBottom:'12px'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setCalendarSelectionStep("start");
                        const anchor = selectedStartDate || new Date();
                        setCalendarMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
                      }}
                      style={{
                        border:calendarSelectionStep === "start"
                          ? '1.5px solid var(--primary-green)'
                          : '1px solid #e4e6e4',
                        borderRadius:'12px',
                        padding:'9px 10px',
                        background:calendarSelectionStep === "start"
                          ? 'color-mix(in srgb, var(--primary-green) 6%, white)'
                          : '#fff',
                        textAlign:'left',
                        cursor:'pointer',
                        minWidth:0,
                        boxShadow:calendarSelectionStep === "start"
                          ? '0 0 0 3px color-mix(in srgb, var(--primary-green) 7%, transparent)'
                          : 'none'
                      }}
                    >
                      <span style={{
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'space-between',
                        gap:'8px',
                        fontSize:'15px',
                        color:calendarSelectionStep === "start" ? 'var(--primary-green)' : '#999',
                        fontWeight:'900',
                        textTransform:'uppercase',
                        letterSpacing:'.05em'
                      }}>
                        <span>{lang === 'pt' ? 'De' : 'From'}</span>
                        <span aria-hidden="true" style={{ fontSize:'15px', opacity:.72 }}>📅</span>
                      </span>
                      <strong style={{
                        display:'block',
                        marginTop:'4px',
                        fontSize:'15px',
                        lineHeight:1.2,
                        color:'#2f2f2f',
                        whiteSpace:'nowrap'
                      }}>
                        {selectedStartDate
                          ? new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "en-GB").format(selectedStartDate)
                          : (lang === 'pt' ? 'Escolher data' : 'Choose date')}
                      </strong>
                    </button>

                    <div
                      aria-hidden="true"
                      style={{
                        display:'grid',
                        placeItems:'center',
                        color:'#a3aaa4',
                        fontSize:'15px',
                        fontWeight:'900'
                      }}
                    >
                      →
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCalendarSelectionStep("end");
                        const anchor = selectedEndDate || selectedStartDate || new Date();
                        setCalendarMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
                      }}
                      style={{
                        border:calendarSelectionStep === "end"
                          ? '1.5px solid var(--primary-green)'
                          : '1px solid #e4e6e4',
                        borderRadius:'12px',
                        padding:'9px 10px',
                        background:calendarSelectionStep === "end"
                          ? 'color-mix(in srgb, var(--primary-green) 6%, white)'
                          : '#fff',
                        textAlign:'left',
                        cursor:'pointer',
                        minWidth:0,
                        boxShadow:calendarSelectionStep === "end"
                          ? '0 0 0 3px color-mix(in srgb, var(--primary-green) 7%, transparent)'
                          : 'none'
                      }}
                    >
                      <span style={{
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'space-between',
                        gap:'8px',
                        fontSize:'15px',
                        color:calendarSelectionStep === "end" ? 'var(--primary-green)' : '#999',
                        fontWeight:'900',
                        textTransform:'uppercase',
                        letterSpacing:'.05em'
                      }}>
                        <span>{lang === 'pt' ? 'Até' : 'To'}</span>
                        <span aria-hidden="true" style={{ fontSize:'15px', opacity:.72 }}>📅</span>
                      </span>
                      <strong style={{
                        display:'block',
                        marginTop:'4px',
                        fontSize:'15px',
                        lineHeight:1.2,
                        color:'#2f2f2f',
                        whiteSpace:'nowrap'
                      }}>
                        {selectedEndDate
                          ? new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "en-GB").format(selectedEndDate)
                          : (lang === 'pt' ? 'Escolher data' : 'Choose date')}
                      </strong>
                    </button>
                  </div>

                  <div style={{
                    border:'1px solid #ececec',
                    borderRadius:'14px',
                    padding:'11px',
                    background:'#fff',
                    marginBottom:'13px'
                  }}>
                    <div style={{
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'space-between',
                      gap:'10px',
                      marginBottom:'10px'
                    }}>
                      <button
                        type="button"
                        onClick={() => moveCalendarMonth(-1)}
                        aria-label={lang === 'pt' ? 'Mês anterior' : 'Previous month'}
                        style={{
                          width:'30px',
                          height:'30px',
                          border:'1px solid #e8e8e8',
                          borderRadius:'9px',
                          background:'#fff',
                          cursor:'pointer',
                          fontSize:'15px',
                          color:'#555'
                        }}
                      >
                        ‹
                      </button>

                      <strong style={{ fontSize:'13px', color:'#333', textTransform:'capitalize' }}>
                        {calendarMonthLabel}
                      </strong>

                      <button
                        type="button"
                        onClick={() => moveCalendarMonth(1)}
                        aria-label={lang === 'pt' ? 'Próximo mês' : 'Next month'}
                        style={{
                          width:'30px',
                          height:'30px',
                          border:'1px solid #e8e8e8',
                          borderRadius:'9px',
                          background:'#fff',
                          cursor:'pointer',
                          fontSize:'15px',
                          color:'#555'
                        }}
                      >
                        ›
                      </button>
                    </div>

                    <div style={{
                      display:'grid',
                      gridTemplateColumns:'repeat(7,1fr)',
                      gap:'4px',
                      marginBottom:'4px'
                    }}>
                      {calendarWeekdays.map((day, index) => (
                        <div
                          key={`weekday-${index}`}
                          style={{
                            height:'22px',
                            display:'grid',
                            placeItems:'center',
                            fontSize:'15px',
                            color:'#999',
                            fontWeight:'850'
                          }}
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    <div style={{
                      display:'grid',
                      gridTemplateColumns:'repeat(7,1fr)',
                      gap:'4px'
                    }}>
                      {calendarDays.map((date, index) => {
                        if (!date) {
                          return <div key={`empty-${index}`} style={{ height:'30px' }} />;
                        }

                        const isStart = sameCalendarDay(date, selectedStartDate);
                        const isEnd = sameCalendarDay(date, selectedEndDate);
                        const inRange =
                          selectedStartDate &&
                          selectedEndDate &&
                          date > selectedStartDate &&
                          date < selectedEndDate;
                        const isToday = sameCalendarDay(date, new Date());

                        return (
                          <button
                            key={date.toISOString()}
                            type="button"
                            onClick={() => handleCalendarDayClick(date)}
                            style={{
                              height:'30px',
                              border:isToday && !isStart && !isEnd
                                ? '1px solid color-mix(in srgb, var(--primary-green) 38%, #ddd)'
                                : '1px solid transparent',
                              borderRadius:'9px',
                              background:isStart || isEnd
                                ? 'var(--primary-green)'
                                : inRange
                                  ? 'color-mix(in srgb, var(--primary-green) 10%, white)'
                                  : 'transparent',
                              color:isStart || isEnd
                                ? '#fff'
                                : inRange
                                  ? 'var(--primary-green)'
                                  : '#444',
                              fontSize:'15px',
                              fontWeight:isStart || isEnd || isToday ? '850' : '650',
                              cursor:'pointer'
                            }}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{
                    padding:'9px 10px',
                    borderRadius:'10px',
                    background:'#f7f8f7',
                    color:'#777',
                    fontSize:'13px',
                    lineHeight:'1.45',
                    marginBottom:'13px'
                  }}>
                    {selectedStartDate && selectedEndDate
                      ? `${formatDate(selectedStartDate)} – ${formatDate(selectedEndDate)}`
                      : calendarSelectionStep === "end"
                        ? (lang === 'pt' ? 'Agora escolha a data final.' : 'Now choose the end date.')
                        : (lang === 'pt' ? 'Clique no primeiro dia do período.' : 'Click the first day of the range.')}
                  </div>

                  <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px' }}>
                    <button
                      type="button"
                      onClick={() => setPeriodMenuOpen(false)}
                      style={{
                        height:'34px',
                        border:'1px solid #dedede',
                        borderRadius:'10px',
                        background:'#fff',
                        padding:'0 12px',
                        fontSize:'15px',
                        fontWeight:'800',
                        cursor:'pointer'
                      }}
                    >
                      {lang === 'pt' ? 'Fechar' : 'Close'}
                    </button>
                    <button
                      type="button"
                      disabled={!customStart || !customEnd}
                      onClick={applyCustomRange}
                      style={{
                        height:'34px',
                        border:0,
                        borderRadius:'10px',
                        background:'var(--primary-green)',
                        color:'#fff',
                        padding:'0 14px',
                        fontSize:'15px',
                        fontWeight:'850',
                        cursor:customStart && customEnd ? 'pointer' : 'not-allowed',
                        opacity:customStart && customEnd ? 1 : .45
                      }}
                    >
                      {lang === 'pt' ? 'Aplicar período' : 'Apply range'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{
            minWidth:'118px',
            padding:'9px 12px',
            border:'1px solid #e8e8e8',
            borderRadius:'14px',
            background:'#fafafa',
            textAlign:'right'
          }}>
            <div style={{ fontSize:'15px', color:'#888', fontWeight:'700', textTransform:'uppercase', letterSpacing:'.04em' }}>
              {lang === 'pt' ? 'Total no período' : 'Period total'}
            </div>
            <div style={{ fontSize:'22px', fontWeight:'900', color:'var(--primary-green)', lineHeight:1.1, marginTop:'3px' }}>
              {totalBookings}
            </div>
          </div>
        </div>
      </div>

      {totalBookings === 0 ? (
        <DashboardEmptyState
          icon="bookings"
          title={lang === 'pt' ? 'Nenhuma reserva confirmada neste recorte' : 'No confirmed bookings in this view'}
          description={lang === 'pt'
            ? 'Quando houver reservas no período e nos filtros selecionados, a distribuição por canal aparecerá aqui.'
            : 'When bookings exist for the selected period and filters, the channel distribution will appear here.'}
        />
      ) : (
      <div
        role="img"
        aria-label={lang === 'pt' ? 'Gráfico de reservas confirmadas por canal' : 'Confirmed bookings by channel chart'}
        style={{ display:'grid', gap:'8px' }}
      >
        {data.map((item) => {
          const share = totalBookings > 0 ? (item.bookings / totalBookings) * 100 : 0;
          const width = item.bookings > 0
            ? Math.max(4, (item.bookings / maxBookings) * 100)
            : 0;
          const isExpanded = expandedKey === item.key;
          const isFiltered = activeChannelFilter === item.key;

          return (
            <div
              key={item.key}
              onMouseEnter={() => setExpandedKey(item.key)}
              onMouseLeave={() => setExpandedKey(null)}
              style={{
                border:isExpanded || isFiltered
                  ? '1px solid color-mix(in srgb, var(--primary-green) 28%, #e7e7e7)'
                  : '1px solid transparent',
                borderRadius:'12px',
                background:isFiltered
                  ? 'color-mix(in srgb, var(--primary-green) 8%, white)'
                  : isExpanded
                    ? 'color-mix(in srgb, var(--primary-green) 4%, white)'
                    : 'transparent',
                transition:'background .16s ease, border-color .16s ease'
              }}
            >
              <button
                type="button"
                className="pmy-channel-row"
                onClick={() => setExpandedKey((current) => current === item.key ? null : item.key)}
                onFocus={() => setExpandedKey(item.key)}
                style={{
                  width:'100%',
                  border:0,
                  background:'transparent',
                  display:'grid',
                  gridTemplateColumns:'minmax(108px, 145px) minmax(120px, 1fr) 72px',
                  alignItems:'center',
                  gap:'12px',
                  padding:'8px 9px',
                  textAlign:'left',
                  cursor:'pointer'
                }}
              >
                <div style={{ minWidth:0 }}>
                  <div style={{
                    fontSize:'15px',
                    fontWeight:'850',
                    color:isExpanded || isFiltered ? 'var(--primary-green)' : '#2f2f2f',
                    overflow:'hidden',
                    textOverflow:'ellipsis',
                    whiteSpace:'nowrap'
                  }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize:'15px', color:'#999', marginTop:'1px' }}>
                    {share.toFixed(1)}%
                  </div>
                </div>

                <div style={{
                  height:'18px',
                  borderRadius:'999px',
                  background:'#f1f2f1',
                  overflow:'hidden',
                  position:'relative'
                }}>
                  <div
                    style={{
                      width:`${width}%`,
                      minWidth:item.bookings > 0 ? '6px' : 0,
                      height:'100%',
                      borderRadius:'inherit',
                      background:'var(--primary-green)',
                      opacity:isExpanded ? 1 : 0.8,
                      transition:'width .35s ease, opacity .18s ease'
                    }}
                  />
                </div>

                <div style={{ textAlign:'right' }}>
                  <strong style={{ fontSize:'15px', color:'#222' }}>{item.bookings}</strong>
                  <span style={{ display:'block', fontSize:'13px', color:'#999', marginTop:'1px' }}>
                    {lang === 'pt' ? 'reservas' : 'bookings'}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div
                  className="pmy-channel-detail"
                  style={{
                  margin:'0 9px 9px',
                  padding:'10px 12px',
                  borderRadius:'10px',
                  background:'#fff',
                  border:'1px solid #ececec',
                  display:'grid',
                  gridTemplateColumns:'repeat(4,minmax(0,1fr))',
                  gap:'10px'
                }}>
                  <div>
                    <span style={{ display:'block', fontSize:'13px', color:'#999', textTransform:'uppercase', fontWeight:'800' }}>
                      {lang === 'pt' ? 'Reservas' : 'Bookings'}
                    </span>
                    <strong style={{ fontSize:'15px' }}>{item.bookings}</strong>
                  </div>
                  <div>
                    <span style={{ display:'block', fontSize:'13px', color:'#999', textTransform:'uppercase', fontWeight:'800' }}>
                      {lang === 'pt' ? 'Passageiros' : 'Passengers'}
                    </span>
                    <strong style={{ fontSize:'15px' }}>{item.passengers}</strong>
                  </div>
                  <div>
                    <span style={{ display:'block', fontSize:'13px', color:'#999', textTransform:'uppercase', fontWeight:'800' }}>
                      {lang === 'pt' ? 'Participação' : 'Share'}
                    </span>
                    <strong style={{ fontSize:'15px' }}>{share.toFixed(1)}%</strong>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => onChannelFilter?.(item.key, item.label)}
                      style={{
                        minHeight:'34px',
                        border:isFiltered ? '1px solid var(--primary-green)' : '1px solid #dfe5df',
                        borderRadius:'999px',
                        background:isFiltered ? 'var(--primary-green)' : '#fff',
                        color:isFiltered ? '#fff' : 'var(--primary-green)',
                        padding:'7px 11px',
                        fontSize:'12px',
                        fontWeight:'850',
                        cursor:'pointer',
                        whiteSpace:'nowrap'
                      }}
                    >
                      {isFiltered
                        ? (lang === 'pt' ? 'Remover filtro' : 'Remove filter')
                        : (lang === 'pt' ? 'Filtrar painel' : 'Filter dashboard')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      <div style={{
        marginTop:'15px',
        paddingTop:'11px',
        borderTop:'1px solid #efefef',
        fontSize:'15px',
        color:'#999'
      }}>
        {lang === 'pt'
          ? 'Outros agrupa reservas manuais, Central PMY e qualquer origem ainda não classificada.'
          : 'Other groups manual bookings, Central PMY and any source not yet classified.'}
      </div>
    </section>
  );
};

const BookingStatusOverview = ({ summary = {}, lang, periodLabel }) => {
  const total = Number(summary?.total || 0);
  const unclassified = Number(summary?.unclassified || 0);

  const items = [
    {
      key: "confirmed",
      label: lang === "pt" ? "Confirmadas" : "Confirmed",
      description: lang === "pt" ? "passeios futuros confirmados" : "confirmed upcoming tours",
      value: Number(summary?.confirmed || 0),
      icon: "✓",
      color: "#167a35",
      soft: "#edf8f0",
    },
    {
      key: "pending",
      label: lang === "pt" ? "Pendentes" : "Pending",
      description: lang === "pt" ? "aguardando confirmação" : "awaiting confirmation",
      value: Number(summary?.pending || 0),
      icon: "⏳",
      color: "#a46108",
      soft: "#fff7e7",
    },
    {
      key: "canceled",
      label: lang === "pt" ? "Canceladas" : "Canceled",
      description: lang === "pt" ? "reservas canceladas" : "canceled bookings",
      value: Number(summary?.canceled || 0),
      icon: "×",
      color: "#b42318",
      soft: "#fff1f0",
    },
    {
      key: "completed",
      label: lang === "pt" ? "Concluídas" : "Completed",
      description: lang === "pt" ? "passeios já realizados" : "tours already completed",
      value: Number(summary?.completed || 0),
      icon: "✓✓",
      color: "#315a78",
      soft: "#eef5f9",
    },
  ];

  return (
    <section className="pmy-card" style={{ padding:'22px 24px' }}>
      <div style={{
        display:'flex',
        justifyContent:'space-between',
        alignItems:'flex-start',
        gap:'18px',
        flexWrap:'wrap',
        marginBottom:'18px'
      }}>
        <div>
          <div className="pmy-trend-eyebrow">
            {lang === 'pt' ? 'Situação das reservas' : 'Booking status'}
          </div>
          <h2 className="pmy-trend-title" style={{ marginBottom:'5px' }}>
            {lang === 'pt' ? 'Status das reservas' : 'Booking status'}
          </h2>
          <div className="pmy-trend-subtitle">
            {periodLabel} · {lang === 'pt'
              ? 'visão atual das reservas criadas no período'
              : 'current status of bookings created in the period'}
          </div>
        </div>

        <div style={{
          minWidth:'132px',
          padding:'10px 13px',
          border:'1px solid #e8e8e8',
          borderRadius:'14px',
          background:'#fafafa',
          textAlign:'right'
        }}>
          <div style={{
            fontSize:'11px',
            color:'#888',
            fontWeight:'800',
            textTransform:'uppercase',
            letterSpacing:'.05em'
          }}>
            {lang === 'pt' ? 'Total classificado' : 'Classified total'}
          </div>
          <div style={{
            fontSize:'25px',
            fontWeight:'900',
            color:'var(--primary-green)',
            lineHeight:1.1,
            marginTop:'3px'
          }}>
            {total}
          </div>
        </div>
      </div>

      {total === 0 ? (
        <DashboardEmptyState
          icon="bookings"
          compact
          title={lang === 'pt' ? 'Nenhuma reserva classificada neste período' : 'No classified bookings in this period'}
          description={lang === 'pt'
            ? 'Os status serão distribuídos aqui assim que as primeiras reservas entrarem na Central.'
            : 'Booking statuses will be distributed here as soon as the first bookings reach the Central.'}
        />
      ) : (
      <>
      <div style={{
        height:'12px',
        borderRadius:'999px',
        background:'#f0f1f0',
        overflow:'hidden',
        display:'flex',
        marginBottom:'18px'
      }}>
        {items.map((item) => {
          const share = total > 0 ? (item.value / total) * 100 : 0;
          if (share <= 0) return null;

          return (
            <div
              key={item.key}
              title={`${item.label}: ${item.value} (${share.toFixed(1)}%)`}
              style={{
                width:`${share}%`,
                minWidth:item.value > 0 ? '6px' : 0,
                background:item.color,
                transition:'width .3s ease'
              }}
            />
          );
        })}
      </div>

      <div
        className="pmy-booking-status-grid"
        style={{
          display:'grid',
          gridTemplateColumns:'repeat(4,minmax(0,1fr))',
          gap:'12px'
        }}
      >
        {items.map((item) => {
          const share = total > 0 ? (item.value / total) * 100 : 0;

          return (
            <div
              key={item.key}
              style={{
                minWidth:0,
                border:'1px solid #ececec',
                borderRadius:'16px',
                padding:'15px 16px',
                background:'#fff'
              }}
            >
              <div style={{
                display:'flex',
                alignItems:'center',
                justifyContent:'space-between',
                gap:'10px',
                marginBottom:'14px'
              }}>
                <span style={{
                  width:'36px',
                  height:'36px',
                  borderRadius:'12px',
                  display:'grid',
                  placeItems:'center',
                  background:item.soft,
                  color:item.color,
                  fontSize:'14px',
                  fontWeight:'900'
                }}>
                  {item.icon}
                </span>
                <span style={{
                  fontSize:'12px',
                  fontWeight:'850',
                  color:item.color
                }}>
                  {share.toFixed(1)}%
                </span>
              </div>

              <div style={{
                fontSize:'14px',
                fontWeight:'850',
                color:'#363936',
                marginBottom:'3px'
              }}>
                {item.label}
              </div>
              <strong style={{
                display:'block',
                fontSize:'28px',
                lineHeight:1,
                color:item.color,
                marginBottom:'7px'
              }}>
                {item.value}
              </strong>
              <div style={{
                fontSize:'12px',
                lineHeight:1.35,
                color:'#858985'
              }}>
                {item.description}
              </div>
            </div>
          );
        })}
      </div>

      </>
      )}

      {unclassified > 0 && (
        <div style={{
          marginTop:'13px',
          paddingTop:'11px',
          borderTop:'1px solid #efefef',
          fontSize:'12px',
          color:'#8a8f8b'
        }}>
          {lang === 'pt'
            ? `${unclassified} reserva(s) possui(em) status ainda não classificado pela Central.`
            : `${unclassified} booking(s) have a status not yet classified by the Central.`}
        </div>
      )}
    </section>
  );
};

const UpcomingDeparturesPanel = ({
  departures = [],
  lang,
  imageShape = "rounded",
}) => {
  const [showAll, setShowAll] = useState(false);
  const visibleDepartures = showAll ? departures : departures.slice(0, 8);

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", {
      timeZone: "Europe/Lisbon",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const formatTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", {
      timeZone: "Europe/Lisbon",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  };

  return (
    <section className="pmy-card" style={{ padding:'22px 24px' }}>
      <div style={{
        display:'flex',
        justifyContent:'space-between',
        alignItems:'flex-start',
        gap:'16px',
        flexWrap:'wrap',
        marginBottom:'18px'
      }}>
        <div>
          <div className="pmy-trend-eyebrow">
            {lang === 'pt' ? 'Operação dos próximos 30 dias' : 'Next 30 days operations'}
          </div>
          <h2 className="pmy-trend-title" style={{ marginBottom:'5px' }}>
            {lang === 'pt' ? 'Próximas saídas' : 'Upcoming departures'}
          </h2>
          <div className="pmy-trend-subtitle">
            {lang === 'pt'
              ? 'Tour, data, horário, passageiros, canais e vagas disponíveis'
              : 'Tour, date, time, passengers, channels and available seats'}
          </div>
        </div>

        <div style={{
          minWidth:'120px',
          padding:'10px 13px',
          border:'1px solid #e8e8e8',
          borderRadius:'14px',
          background:'#fafafa',
          textAlign:'right'
        }}>
          <div style={{
            fontSize:'11px',
            color:'#888',
            fontWeight:'800',
            textTransform:'uppercase',
            letterSpacing:'.05em'
          }}>
            {lang === 'pt' ? 'Saídas' : 'Departures'}
          </div>
          <strong style={{
            display:'block',
            marginTop:'2px',
            fontSize:'24px',
            lineHeight:1,
            color:'var(--primary-green)'
          }}>
            {departures.length}
          </strong>
        </div>
      </div>

      {visibleDepartures.length === 0 ? (
        <DashboardEmptyState
          icon="calendar"
          title={lang === 'pt' ? 'Nenhuma saída programada nos próximos 30 dias' : 'No departures scheduled in the next 30 days'}
          description={lang === 'pt'
            ? 'Saídas confirmadas ou pendentes aparecerão aqui automaticamente com horário, passageiros, canais e vagas.'
            : 'Confirmed or pending departures will appear here automatically with time, passengers, channels and seats.'}
        />
      ) : (
        <div className="pmy-upcoming-table" style={{ overflowX:'auto' }}>
          <div className="pmy-upcoming-table-inner" style={{ minWidth:'920px' }}>
            <div className="pmy-upcoming-table-head" style={{
              display:'grid',
              gridTemplateColumns:'minmax(280px,1.7fr) 120px 86px 105px minmax(170px,1fr) 150px',
              gap:'12px',
              padding:'0 12px 9px',
              borderBottom:'1px solid #eceeec',
              color:'#8a908b',
              fontSize:'11px',
              fontWeight:'850',
              textTransform:'uppercase',
              letterSpacing:'.05em'
            }}>
              <span>Tour</span>
              <span>{lang === 'pt' ? 'Data' : 'Date'}</span>
              <span>{lang === 'pt' ? 'Horário' : 'Time'}</span>
              <span>{lang === 'pt' ? 'Passageiros' : 'Passengers'}</span>
              <span>{lang === 'pt' ? 'Canais' : 'Channels'}</span>
              <span style={{ textAlign:'right' }}>
                {lang === 'pt' ? 'Vagas disponíveis' : 'Available seats'}
              </span>
            </div>

            {visibleDepartures.map((departure) => {
              const capacity = Math.max(0, Number(departure?.capacity || 0));
              const available = Math.max(0, Number(departure?.availableSeats || 0));
              const occupancy = capacity > 0
                ? Math.min(100, (Number(departure?.passengers || 0) / capacity) * 100)
                : 0;
              const isFull = capacity > 0 && available === 0;
              const isTight = !isFull && capacity > 0 && occupancy >= 80;
              const seatColor = isFull ? '#b42318' : isTight ? '#a46108' : '#167a35';
              const seatBg = isFull ? '#fff1f0' : isTight ? '#fff7e7' : '#edf8f0';

              return (
                <div
                  key={departure.key}
                  className="pmy-upcoming-row"
                  style={{
                    display:'grid',
                    gridTemplateColumns:'minmax(280px,1.7fr) 120px 86px 105px minmax(170px,1fr) 150px',
                    gap:'12px',
                    alignItems:'center',
                    minHeight:'74px',
                    padding:'10px 12px',
                    borderBottom:'1px solid #f0f1f0'
                  }}
                >
                  <div className="pmy-upcoming-tour" style={{
                    minWidth:0,
                    display:'flex',
                    alignItems:'center',
                    gap:'11px'
                  }}>
                    {departure.image ? (
                      <img
                        src={departure.image}
                        alt={departure.imageAlt || departure.tourTitle}
                        className={imageShape}
                        style={{
                          width:'46px',
                          height:'46px',
                          flex:'0 0 46px',
                          objectFit:'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width:'46px',
                        height:'46px',
                        flex:'0 0 46px',
                        borderRadius:'12px',
                        background:'#f4f5f4',
                        display:'grid',
                        placeItems:'center',
                        fontSize:'18px'
                      }}>
                        🧭
                      </div>
                    )}

                    <div style={{ minWidth:0 }}>
                      <div style={{
                        fontSize:'14px',
                        fontWeight:'850',
                        color:'#343734',
                        overflow:'hidden',
                        textOverflow:'ellipsis',
                        whiteSpace:'nowrap'
                      }}>
                        {departure.tourTitle}
                      </div>
                      <div style={{
                        marginTop:'3px',
                        fontSize:'11px',
                        color:'#858b86'
                      }}>
                        {departure.bookings} {lang === 'pt' ? 'reserva(s)' : 'booking(s)'}
                      </div>
                    </div>
                  </div>

                  <div className="pmy-upcoming-date">
                    <span className="pmy-upcoming-mobile-label">{lang === 'pt' ? 'Data' : 'Date'}</span>
                    <strong style={{ fontSize:'13px', color:'#444' }}>
                      {formatDate(departure.startTime)}
                    </strong>
                  </div>

                  <div className="pmy-upcoming-time">
                    <span className="pmy-upcoming-mobile-label">{lang === 'pt' ? 'Horário' : 'Time'}</span>
                    <strong style={{ fontSize:'14px', color:'#444' }}>
                      {formatTime(departure.startTime)}
                    </strong>
                  </div>

                  <div className="pmy-upcoming-passengers">
                    <span className="pmy-upcoming-mobile-label">{lang === 'pt' ? 'Passageiros' : 'Passengers'}</span>
                    <strong style={{
                      display:'block',
                      fontSize:'17px',
                      color:'#333'
                    }}>
                      {departure.passengers}
                    </strong>
                    <span style={{ fontSize:'11px', color:'#8a908b' }}>
                      pax
                    </span>
                  </div>

                  <div className="pmy-upcoming-channels" style={{
                    display:'flex',
                    flexWrap:'wrap',
                    gap:'5px'
                  }}>
                    <span className="pmy-upcoming-mobile-label" style={{ width:'100%' }}>
                      {lang === 'pt' ? 'Canais' : 'Channels'}
                    </span>
                    {(departure.platforms || []).map((platform) => (
                      <span
                        key={platform}
                        style={{
                          padding:'5px 8px',
                          borderRadius:'999px',
                          background:'#f3f5f3',
                          color:'#5d665f',
                          fontSize:'11px',
                          fontWeight:'750'
                        }}
                      >
                        {platform}
                      </span>
                    ))}
                  </div>

                  <div className="pmy-upcoming-seats" style={{ textAlign:'right' }}>
                    <span className="pmy-upcoming-mobile-label">{lang === 'pt' ? 'Vagas disponíveis' : 'Available seats'}</span>
                    <span style={{
                      display:'inline-flex',
                      alignItems:'center',
                      justifyContent:'center',
                      minWidth:'58px',
                      minHeight:'34px',
                      padding:'7px 10px',
                      borderRadius:'11px',
                      background:seatBg,
                      color:seatColor,
                      fontSize:'16px',
                      fontWeight:'900'
                    }}>
                      {available}
                    </span>
                    <div style={{
                      marginTop:'4px',
                      fontSize:'10px',
                      color:'#8a908b'
                    }}>
                      {lang === 'pt' ? `de ${capacity} vagas` : `of ${capacity} seats`}
                      {departure.capacitySource === "DEFAULT"
                        ? (lang === 'pt' ? ' · padrão' : ' · default')
                        : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {departures.length > 8 && (
        <div style={{
          display:'flex',
          justifyContent:'center',
          paddingTop:'15px'
        }}>
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            style={{
              border:'1px solid #dfe4df',
              borderRadius:'999px',
              background:'#fff',
              padding:'8px 14px',
              color:'var(--primary-green)',
              fontSize:'12px',
              fontWeight:'850',
              cursor:'pointer'
            }}
          >
            {showAll
              ? (lang === 'pt' ? 'Mostrar menos' : 'Show less')
              : (lang === 'pt'
                ? `Ver todas as ${departures.length} saídas`
                : `View all ${departures.length} departures`)}
          </button>
        </div>
      )}
    </section>
  );
};

const TourPerformanceRanking = ({
  categoriesData = [],
  realConfirmedBookings = [],
  dashboardCurrency = "EUR",
  formatMoney,
  lang,
  periodLabel,
  imageShape = "rounded",
  activeTourFilter = null,
  onTourFilter,
}) => {
  const [rankingMetric, setRankingMetric] = useState("revenue");

  const uniqueToursMap = new Map();
  for (const category of categoriesData || []) {
    for (const tour of category?.toursList || []) {
      const key = tour?.masterTourId || tour?.id;
      if (!key || uniqueToursMap.has(key)) continue;
      uniqueToursMap.set(key, {
        ...tour,
        rankingTourId: key,
      });
    }
  }

  const passengerCount = (booking) => {
    const explicit = Number(booking?.totalParticipants || 0);
    if (explicit > 0) return explicit;

    return (
      Number(booking?.adults || 0) +
      Number(booking?.children || 0) +
      Number(booking?.youths || 0) +
      Number(booking?.seniors || 0)
    );
  };

  const rankingRows = [...uniqueToursMap.values()]
    .map((tour) => {
      const tourBookings = (realConfirmedBookings || []).filter(
        (booking) => booking?.tourId === tour.rankingTourId,
      );

      let revenue = 0;
      let pricedBookings = 0;
      let missingRevenue = 0;

      for (const booking of tourBookings) {
        const bookingCurrency = String(booking?.currency || "").trim().toUpperCase();
        const amount = Number(booking?.totalPrice);

        if (
          booking?.totalPrice !== null &&
          booking?.totalPrice !== undefined &&
          booking?.totalPrice !== "" &&
          Number.isFinite(amount) &&
          bookingCurrency === dashboardCurrency
        ) {
          revenue += amount;
          pricedBookings += 1;
        } else {
          missingRevenue += 1;
        }
      }

      return {
        id: tour.rankingTourId,
        title: tour?.title || (lang === "pt" ? "Tour sem título" : "Untitled tour"),
        image: tour?.image || null,
        imageAlt: tour?.imageAlt || tour?.title || "",
        bookings: tourBookings.length,
        passengers: tourBookings.reduce(
          (sum, booking) => sum + passengerCount(booking),
          0,
        ),
        revenue,
        pricedBookings,
        missingRevenue,
      };
    })
    .filter((row) => row.bookings > 0)
    .sort((left, right) => {
      if (rankingMetric === "bookings") {
        return (
          right.bookings - left.bookings ||
          right.passengers - left.passengers ||
          right.revenue - left.revenue
        );
      }

      if (rankingMetric === "passengers") {
        return (
          right.passengers - left.passengers ||
          right.bookings - left.bookings ||
          right.revenue - left.revenue
        );
      }

      return (
        right.revenue - left.revenue ||
        right.bookings - left.bookings ||
        right.passengers - left.passengers
      );
    });

  const topRows = rankingRows.slice(0, 10);
  const maxMetric = Math.max(
    1,
    ...topRows.map((row) =>
      rankingMetric === "bookings"
        ? row.bookings
        : rankingMetric === "passengers"
          ? row.passengers
          : row.revenue,
    ),
  );

  const metricOptions = [
    {
      key: "revenue",
      label: lang === "pt" ? "Receita real" : "Real revenue",
    },
    {
      key: "bookings",
      label: lang === "pt" ? "Reservas" : "Bookings",
    },
    {
      key: "passengers",
      label: lang === "pt" ? "Passageiros" : "Passengers",
    },
  ];

  return (
    <section className="pmy-card" style={{ padding:'22px 24px' }}>
      <div className="pmy-ranking-header" style={{
        display:'flex',
        justifyContent:'space-between',
        alignItems:'flex-start',
        gap:'16px',
        flexWrap:'wrap',
        marginBottom:'18px'
      }}>
        <div>
          <div className="pmy-trend-eyebrow">
            {lang === 'pt' ? 'Performance dos tours' : 'Tour performance'}
          </div>
          <h2 className="pmy-trend-title" style={{ marginBottom:'5px' }}>
            {lang === 'pt' ? 'Ranking de tours' : 'Tour ranking'}
          </h2>
          <div className="pmy-trend-subtitle">
            {periodLabel} · {lang === 'pt'
              ? 'reservas confirmadas, passageiros e receita real'
              : 'confirmed bookings, passengers and real revenue'}
          </div>
        </div>

        <div className="pmy-ranking-controls" style={{
          display:'flex',
          gap:'5px',
          padding:'4px',
          borderRadius:'999px',
          background:'#f3f4f3',
          border:'1px solid #e7e9e7'
        }}>
          {metricOptions.map((option) => {
            const active = rankingMetric === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setRankingMetric(option.key)}
                style={{
                  border:0,
                  borderRadius:'999px',
                  padding:'8px 12px',
                  background:active ? '#fff' : 'transparent',
                  color:active ? 'var(--primary-green)' : '#737873',
                  fontSize:'12px',
                  fontWeight:'850',
                  cursor:'pointer',
                  boxShadow:active ? '0 2px 8px rgba(28,47,34,.08)' : 'none'
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {topRows.length === 0 ? (
        <DashboardEmptyState
          icon="ranking"
          title={lang === 'pt' ? 'O ranking ainda está começando' : 'The ranking is just getting started'}
          description={lang === 'pt'
            ? 'Assim que houver reservas confirmadas neste recorte, os tours serão ordenados por receita real, reservas ou passageiros.'
            : 'As confirmed bookings arrive in this view, tours will be ranked by real revenue, bookings or passengers.'}
        />
      ) : (
        <div style={{ display:'grid', gap:'8px' }}>
          {topRows.map((row, index) => {
            const metricValue =
              rankingMetric === "bookings"
                ? row.bookings
                : rankingMetric === "passengers"
                  ? row.passengers
                  : row.revenue;

            const barWidth = metricValue > 0
              ? Math.max(4, (metricValue / maxMetric) * 100)
              : 0;

            const isFiltered = activeTourFilter === row.id;

            return (
              <div
                key={row.id}
                className="pmy-ranking-row"
                role="button"
                tabIndex={0}
                title={lang === 'pt' ? 'Clique para filtrar o Dashboard por este tour' : 'Click to filter the Dashboard by this tour'}
                onClick={() => onTourFilter?.(row.id, row.title)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onTourFilter?.(row.id, row.title);
                  }
                }}
                style={{
                  display:'grid',
                  gridTemplateColumns:'46px minmax(230px,1.6fr) minmax(120px,1fr) 112px 112px 150px',
                  alignItems:'center',
                  gap:'12px',
                  minHeight:'72px',
                  padding:'10px 12px',
                  border:isFiltered
                    ? '1px solid color-mix(in srgb, var(--primary-green) 48%, #dfe5df)'
                    : '1px solid #eceeec',
                  borderRadius:'15px',
                  background:isFiltered
                    ? 'color-mix(in srgb, var(--primary-green) 9%, white)'
                    : index === 0
                      ? 'color-mix(in srgb, var(--primary-green) 4%, white)'
                      : '#fff',
                  cursor:'pointer',
                  outline:'none'
                }}
              >
                <div className="pmy-ranking-position" style={{
                  width:'34px',
                  height:'34px',
                  borderRadius:'11px',
                  display:'grid',
                  placeItems:'center',
                  background:index === 0 ? 'var(--primary-green)' : '#f2f3f2',
                  color:index === 0 ? '#fff' : '#6e746f',
                  fontSize:'13px',
                  fontWeight:'900'
                }}>
                  {index + 1}
                </div>

                <div className="pmy-ranking-tour" style={{
                  minWidth:0,
                  display:'flex',
                  alignItems:'center',
                  gap:'11px'
                }}>
                  {row.image ? (
                    <img
                      src={row.image}
                      alt={row.imageAlt}
                      className={imageShape}
                      style={{
                        width:'44px',
                        height:'44px',
                        objectFit:'cover',
                        flex:'0 0 44px'
                      }}
                    />
                  ) : (
                    <div style={{
                      width:'44px',
                      height:'44px',
                      flex:'0 0 44px',
                      borderRadius:'12px',
                      background:'#f5f3f3',
                      display:'grid',
                      placeItems:'center',
                      fontSize:'18px'
                    }}>
                      🧭
                    </div>
                  )}

                  <div style={{ minWidth:0 }}>
                    <div style={{
                      fontSize:'14px',
                      fontWeight:'850',
                      color:'#333',
                      overflow:'hidden',
                      textOverflow:'ellipsis',
                      whiteSpace:'nowrap'
                    }}>
                      {row.title}
                    </div>
                    {row.missingRevenue > 0 && (
                      <div style={{
                        fontSize:'11px',
                        color:'#9a6700',
                        marginTop:'3px'
                      }}>
                        {lang === 'pt'
                          ? `${row.missingRevenue} reserva(s) sem receita comparável`
                          : `${row.missingRevenue} booking(s) without comparable revenue`}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pmy-ranking-bar" style={{
                  height:'10px',
                  borderRadius:'999px',
                  background:'#f0f1f0',
                  overflow:'hidden'
                }}>
                  <div style={{
                    width:`${barWidth}%`,
                    minWidth:metricValue > 0 ? '5px' : 0,
                    height:'100%',
                    borderRadius:'inherit',
                    background:'var(--primary-green)'
                  }} />
                </div>

                <div className="pmy-ranking-bookings">
                  <span style={{
                    display:'block',
                    fontSize:'10px',
                    color:'#929792',
                    fontWeight:'800',
                    textTransform:'uppercase',
                    letterSpacing:'.04em'
                  }}>
                    {lang === 'pt' ? 'Reservas' : 'Bookings'}
                  </span>
                  <strong style={{ fontSize:'18px', color:'#333' }}>{row.bookings}</strong>
                </div>

                <div className="pmy-ranking-passengers">
                  <span style={{
                    display:'block',
                    fontSize:'10px',
                    color:'#929792',
                    fontWeight:'800',
                    textTransform:'uppercase',
                    letterSpacing:'.04em'
                  }}>
                    {lang === 'pt' ? 'Passageiros' : 'Passengers'}
                  </span>
                  <strong style={{ fontSize:'18px', color:'#333' }}>{row.passengers}</strong>
                </div>

                <div className="pmy-ranking-revenue" style={{ textAlign:'right' }}>
                  <span style={{
                    display:'block',
                    fontSize:'10px',
                    color:'#929792',
                    fontWeight:'800',
                    textTransform:'uppercase',
                    letterSpacing:'.04em'
                  }}>
                    {lang === 'pt' ? 'Receita real' : 'Real revenue'}
                  </span>
                  <strong style={{
                    display:'block',
                    fontSize:'17px',
                    color:'var(--primary-green)'
                  }}>
                    {formatMoney(row.revenue, dashboardCurrency)}
                  </strong>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        marginTop:'14px',
        paddingTop:'11px',
        borderTop:'1px solid #efefef',
        fontSize:'12px',
        color:'#858b86'
      }}>
        {lang === 'pt'
          ? `Receita considera apenas valores reais na moeda ${dashboardCurrency}. Reservas sem valor ou em outra moeda não são convertidas nem estimadas.`
          : `Revenue includes only real values in ${dashboardCurrency}. Bookings without value or in another currency are not converted or estimated.`}
      </div>
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
    dashboardUpcomingDepartures,
    getPeriodLabel,
    salesByChannel,
    bookings,
    categoriesData,
    toggleCategory,
    openCategories,
    realConfirmedBookings,
    dashboardBookingStatusSummary,
    dashboardTrendData,
    dashboardTrendGranularity,
    dashboardCurrency,
    imageShape
  } = props;

  const dashboardIsLoading = false;

  const [crossFilters, setCrossFilters] = useState({
    channel: null,
    channelLabel: "",
    tourId: null,
    tourLabel: "",
  });

  const toggleChannelFilter = (channel, label) => {
    setCrossFilters((current) => ({
      ...current,
      channel: current.channel === channel ? null : channel,
      channelLabel: current.channel === channel ? "" : label,
    }));
  };

  const toggleTourFilter = (tourId, label) => {
    setCrossFilters((current) => ({
      ...current,
      tourId: current.tourId === tourId ? null : tourId,
      tourLabel: current.tourId === tourId ? "" : label,
    }));
  };

  const clearCrossFilters = () => {
    setCrossFilters({
      channel: null,
      channelLabel: "",
      tourId: null,
      tourLabel: "",
    });
  };

  const bookingMatchesCrossFilters = (booking, { ignoreChannel = false } = {}) => {
    if (crossFilters.tourId && booking?.tourId !== crossFilters.tourId) return false;
    if (!ignoreChannel && crossFilters.channel) {
      if (dashboardChannelKey(booking?.platform) !== crossFilters.channel) return false;
    }
    return true;
  };

  const filteredConfirmedBookings = (realConfirmedBookings || []).filter((booking) =>
    bookingMatchesCrossFilters(booking)
  );

  const channelChartBookings = (bookings || []).filter((booking) =>
    bookingMatchesCrossFilters(booking, { ignoreChannel: true })
  );

  const filteredUpcomingDepartures = (dashboardUpcomingDepartures || []).filter((departure) => {
    if (crossFilters.tourId && departure?.tourId !== crossFilters.tourId) return false;
    if (!crossFilters.channel) return true;

    const labels = (departure?.platforms || []).map((label) => String(label || "").toUpperCase());
    const expected = dashboardChannelLabel(crossFilters.channel, lang).toUpperCase();

    if (crossFilters.channel === "OTHER") {
      return labels.some((label) =>
        !["SHOPIFY", "VIATOR", "GETYOURGUIDE", "CIVITATIS", "HEADOUT"].includes(label)
      );
    }

    return labels.includes(expected);
  });

  const filteredTrendData = (dashboardTrendData || []).map((item) => ({
    ...item,
    bookings: 0,
    revenue: 0,
  }));
  const trendBucketMap = new Map(filteredTrendData.map((item) => [item.key, item]));

  const trendBucketKey = (booking) => {
    const rawDate = booking?.externalCreatedAt || booking?.createdAt;
    const date = rawDate ? new Date(rawDate) : null;
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;

    const bucket = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (dashboardTrendGranularity === "week") {
      const mondayOffset = (bucket.getDay() + 6) % 7;
      bucket.setDate(bucket.getDate() - mondayOffset);
    } else if (dashboardTrendGranularity === "month") {
      bucket.setDate(1);
    }

    return [
      bucket.getFullYear(),
      String(bucket.getMonth() + 1).padStart(2, "0"),
      String(bucket.getDate()).padStart(2, "0"),
    ].join("-");
  };

  for (const booking of filteredConfirmedBookings) {
    const key = trendBucketKey(booking);
    const bucket = key ? trendBucketMap.get(key) : null;
    if (!bucket) continue;

    bucket.bookings += 1;
    const amount = Number(booking?.totalPrice);
    const currency = String(booking?.currency || "").trim().toUpperCase();
    if (
      booking?.totalPrice !== null &&
      booking?.totalPrice !== undefined &&
      booking?.totalPrice !== "" &&
      Number.isFinite(amount) &&
      currency === dashboardCurrency
    ) {
      bucket.revenue += amount;
    }
  }

  const hasCrossFilters = Boolean(crossFilters.channel || crossFilters.tourId);
  const dashboardHasAnyData =
    Number(totalSalesCount || 0) > 0 ||
    Number(canceledCount || 0) > 0 ||
    Number(upcomingCount || 0) > 0 ||
    Number(dashboardBookingStatusSummary?.total || 0) > 0 ||
    Number(dashboardBookingStatusSummary?.unclassified || 0) > 0 ||
    (bookings || []).length > 0;
  const dashboardHasLimitedData =
    Number(totalSalesCount || 0) > 0 &&
    Number(totalSalesCount || 0) < 5;

  if (activeTab === 'dashboard' && dashboardIsLoading && !dashboardHasAnyData) {
    return <DashboardLoadingSkeleton lang={lang} />;
  }

  return (
    <>
{/* ===== TAB: DASHBOARD ===== */}
          {activeTab==='dashboard' && (
            <div className="pmy-dashboard">
              <DashboardResponsiveStyles />
              {dashboardIsLoading && dashboardHasAnyData && (
                <div
                  role="status"
                  style={{
                    display:'flex',
                    alignItems:'center',
                    gap:'8px',
                    padding:'9px 12px',
                    marginBottom:'12px',
                    borderRadius:'12px',
                    background:'color-mix(in srgb, var(--primary-green) 5%, white)',
                    border:'1px solid color-mix(in srgb, var(--primary-green) 14%, #e8ece8)',
                    color:'#5d675f',
                    fontSize:'12px',
                    fontWeight:'750'
                  }}
                >
                  <span style={{
                    width:'7px',
                    height:'7px',
                    borderRadius:'50%',
                    background:'var(--primary-green)'
                  }} />
                  {lang === 'pt' ? 'Atualizando os dados do Dashboard…' : 'Updating Dashboard data…'}
                </div>
              )}

              {!dashboardHasAnyData && !dashboardIsLoading && (
                <div
                  className="pmy-card"
                  style={{
                    padding:'18px 20px',
                    marginBottom:'14px',
                    border:'1px solid color-mix(in srgb, var(--primary-green) 16%, #e6eae6)',
                    background:'color-mix(in srgb, var(--primary-green) 4%, white)'
                  }}
                >
                  <div style={{ display:'flex', alignItems:'flex-start', gap:'12px' }}>
                    <span style={{
                      width:'38px',
                      height:'38px',
                      borderRadius:'13px',
                      display:'grid',
                      placeItems:'center',
                      flex:'0 0 38px',
                      background:'#fff',
                      color:'var(--primary-green)',
                      border:'1px solid #e5eae5',
                      fontWeight:'900'
                    }}>+</span>
                    <div>
                      <strong style={{ display:'block', fontSize:'15px', color:'#3f4740', marginBottom:'4px' }}>
                        {lang === 'pt' ? 'O Dashboard está pronto para receber as primeiras reservas' : 'The Dashboard is ready for the first bookings'}
                      </strong>
                      <span style={{ display:'block', fontSize:'13px', color:'#798079', lineHeight:1.5 }}>
                        {lang === 'pt'
                          ? 'Os blocos abaixo não estão com erro. Eles serão preenchidos automaticamente conforme reservas, valores e próximas saídas entrarem na Central.'
                          : 'The sections below are not broken. They will fill automatically as bookings, values and upcoming departures reach the Central.'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {dashboardHasLimitedData && !hasCrossFilters && (
                <div
                  style={{
                    display:'flex',
                    alignItems:'center',
                    gap:'9px',
                    padding:'10px 13px',
                    marginBottom:'12px',
                    borderRadius:'12px',
                    background:'#fff9ec',
                    border:'1px solid #f0dfb8',
                    color:'#765d22',
                    fontSize:'12px',
                    lineHeight:1.45
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize:'15px' }}>◌</span>
                  <span>
                    <strong>{lang === 'pt' ? 'Amostra inicial.' : 'Early sample.'}</strong>{' '}
                    {lang === 'pt'
                      ? 'O Dashboard já usa os dados reais disponíveis, e rankings e comparações ganharão mais contexto conforme novas reservas entrarem.'
                      : 'The Dashboard already uses the available real data, and rankings and comparisons will gain more context as new bookings arrive.'}
                  </span>
                </div>
              )}

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
                          title={lang === "pt" ? "Clique para ver detalhes" : "Click to view details"}
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

              <section
                className="pmy-card pmy-cross-filter-bar"
                style={{
                  padding:'12px 16px',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'space-between',
                  gap:'12px',
                  flexWrap:'wrap',
                  borderStyle:'dashed'
                }}
              >
                <div className="pmy-cross-filter-actions" style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                  <strong style={{ fontSize:'13px', color:'#4e564f' }}>
                    {lang === 'pt' ? 'Filtros cruzados' : 'Cross-filters'}
                  </strong>

                  {!hasCrossFilters && (
                    <span style={{ fontSize:'12px', color:'#858b86' }}>
                      {lang === 'pt'
                        ? 'Clique em um canal ou tour para cruzar os demais painéis.'
                        : 'Click a channel or tour to cross-filter the other panels.'}
                    </span>
                  )}

                  {crossFilters.channel && (
                    <button
                      type="button"
                      onClick={() => toggleChannelFilter(crossFilters.channel, crossFilters.channelLabel)}
                      style={{
                        border:'1px solid color-mix(in srgb, var(--primary-green) 24%, #dfe5df)',
                        borderRadius:'999px',
                        background:'color-mix(in srgb, var(--primary-green) 8%, white)',
                        color:'var(--primary-green)',
                        padding:'6px 10px',
                        fontSize:'12px',
                        fontWeight:'800',
                        cursor:'pointer'
                      }}
                    >
                      {lang === 'pt' ? 'Canal' : 'Channel'}: {crossFilters.channelLabel} ×
                    </button>
                  )}

                  {crossFilters.tourId && (
                    <button
                      type="button"
                      onClick={() => toggleTourFilter(crossFilters.tourId, crossFilters.tourLabel)}
                      style={{
                        border:'1px solid color-mix(in srgb, var(--primary-green) 24%, #dfe5df)',
                        borderRadius:'999px',
                        background:'color-mix(in srgb, var(--primary-green) 8%, white)',
                        color:'var(--primary-green)',
                        padding:'6px 10px',
                        fontSize:'12px',
                        fontWeight:'800',
                        cursor:'pointer',
                        maxWidth:'360px',
                        overflow:'hidden',
                        textOverflow:'ellipsis',
                        whiteSpace:'nowrap'
                      }}
                    >
                      Tour: {crossFilters.tourLabel} ×
                    </button>
                  )}
                </div>

                {hasCrossFilters && (
                  <button
                    type="button"
                    onClick={clearCrossFilters}
                    style={{
                      border:0,
                      background:'transparent',
                      color:'#707771',
                      fontSize:'12px',
                      fontWeight:'800',
                      cursor:'pointer',
                      textDecoration:'underline'
                    }}
                  >
                    {lang === 'pt' ? 'Limpar filtros' : 'Clear filters'}
                  </button>
                )}
              </section>

              <BookingStatusOverview
                summary={dashboardBookingStatusSummary}
                lang={lang}
                periodLabel={getPeriodLabel()}
              />

              <UpcomingDeparturesPanel
                departures={filteredUpcomingDepartures}
                lang={lang}
                imageShape={imageShape}
              />

              <TrendChart
                data={filteredTrendData}
                currency={dashboardCurrency || "EUR"}
                formatMoney={formatMoney}
                granularity={dashboardTrendGranularity}
                lang={lang}
                periodLabel={getPeriodLabel()}
              />

              <ChannelBookingsChart
                bookings={channelChartBookings}
                lang={lang}
                activeChannelFilter={crossFilters.channel}
                onChannelFilter={toggleChannelFilter}
              />

              <TourPerformanceRanking
                categoriesData={categoriesData}
                realConfirmedBookings={filteredConfirmedBookings}
                dashboardCurrency={dashboardCurrency}
                formatMoney={formatMoney}
                lang={lang}
                periodLabel={getPeriodLabel()}
                imageShape={imageShape}
                activeTourFilter={crossFilters.tourId}
                onTourFilter={toggleTourFilter}
              />

              <div className="pmy-grid" style={{ gridTemplateColumns:'1fr' }}>
                <div className="pmy-card" style={{ padding:'0 25px 25px 25px' }}>
                  <div style={{ padding:'25px 0 14px 0', borderBottom:'1px solid #f0f0f0' }}>
                    <div className="pmy-trend-eyebrow">
                      {lang === 'pt' ? 'Performance dos produtos' : 'Product performance'}
                    </div>
                    <h2 className="pmy-trend-title" style={{ marginBottom:'4px' }}>
                      {t.dash_performance}
                    </h2>
                    <div className="pmy-trend-subtitle">
                      {getPeriodLabel()} · {lang === 'pt' ? 'reservas confirmadas por passeio' : 'confirmed bookings by tour'}
                    </div>
                  </div>
                  {categoriesData.map(cat => (
                    <div key={cat.name}>
                      <div
                        className="pmy-accordion-header"
                        onClick={() => toggleCategory(cat.name)}
                        role="button"
                        tabIndex={0}
                        aria-expanded={openCategories.includes(cat.name)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            toggleCategory(cat.name);
                          }
                        }}
                      >
                        <span className="pmy-accordion-title">{cat.name}</span>
                        <span
                          aria-hidden="true"
                          style={{
                            width:'34px',
                            height:'34px',
                            borderRadius:'10px',
                            border:'1px solid #e8ebe8',
                            background:openCategories.includes(cat.name)
                              ? 'color-mix(in srgb, var(--primary-green) 7%, white)'
                              : '#fff',
                            color:openCategories.includes(cat.name)
                              ? 'var(--primary-green)'
                              : '#7c847d',
                            display:'grid',
                            placeItems:'center',
                            flex:'0 0 34px',
                            transition:'background .2s ease, border-color .2s ease, color .2s ease'
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                              transform:openCategories.includes(cat.name)
                                ? 'rotate(180deg)'
                                : 'rotate(0deg)',
                              transition:'transform .24s cubic-bezier(.4,0,.2,1)'
                            }}
                          >
                            <path d="M6.5 9.5 12 15l5.5-5.5" />
                          </svg>
                        </span>
                      </div>
                      <div className={`pmy-accordion-content ${openCategories.includes(cat.name)?'open':''}`}>
                        {cat.toursList.length === 0 ? (
                          <DashboardEmptyState
                            icon="bookings"
                            compact
                            title={lang === 'pt' ? 'Nenhum passeio nesta categoria' : 'No tours in this category'}
                            description={lang === 'pt'
                              ? 'Quando houver produtos vinculados a esta categoria, o desempenho aparecerá aqui.'
                              : 'When products are linked to this category, performance will appear here.'}
                          />
                        ) : cat.toursList.map(tour => {
                          const masterTourId = tour.masterTourId || tour.id;
                          const tourBookings = filteredConfirmedBookings.filter(b => b.tourId === masterTourId);
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
                                {tour.price && <div style={{ fontSize:'15px', color:'var(--primary-green)', fontWeight:'700', marginBottom:'4px' }}>{tour.price}</div>}
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

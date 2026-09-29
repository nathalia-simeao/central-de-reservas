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

const ChannelBookingsChart = ({ bookings = [], lang }) => {
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

          return (
            <div
              key={item.key}
              onMouseEnter={() => setExpandedKey(item.key)}
              onMouseLeave={() => setExpandedKey(null)}
              style={{
                border:isExpanded ? '1px solid color-mix(in srgb, var(--primary-green) 22%, #e7e7e7)' : '1px solid transparent',
                borderRadius:'12px',
                background:isExpanded ? 'color-mix(in srgb, var(--primary-green) 4%, white)' : 'transparent',
                transition:'background .16s ease, border-color .16s ease'
              }}
            >
              <button
                type="button"
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
                    color:isExpanded ? 'var(--primary-green)' : '#2f2f2f',
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
                <div style={{
                  margin:'0 9px 9px',
                  padding:'10px 12px',
                  borderRadius:'10px',
                  background:'#fff',
                  border:'1px solid #ececec',
                  display:'grid',
                  gridTemplateColumns:'repeat(3,minmax(0,1fr))',
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
                </div>
              )}
            </div>
          );
        })}
      </div>

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

      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(4,minmax(0,1fr))',
        gap:'12px'
      }}>
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

              <BookingStatusOverview
                summary={dashboardBookingStatusSummary}
                lang={lang}
                periodLabel={getPeriodLabel()}
              />

              <TrendChart
                data={dashboardTrendData || []}
                currency={dashboardCurrency || "EUR"}
                formatMoney={formatMoney}
                granularity={dashboardTrendGranularity}
                lang={lang}
                periodLabel={getPeriodLabel()}
              />

              <ChannelBookingsChart
                bookings={bookings}
                lang={lang}
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
                      <div className="pmy-accordion-header" onClick={() => toggleCategory(cat.name)}>
                        <span className="pmy-accordion-title">{cat.name}</span>
                        <span className="pmy-accordion-arrow">▼</span>
                      </div>
                      <div className={`pmy-accordion-content ${openCategories.includes(cat.name)?'open':''}`}>
                        {cat.toursList.length === 0 ? (
                          <p style={{ padding:'10px 0', color:'#999', fontSize:'15px' }}>Nenhum passeio nesta categoria.</p>
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

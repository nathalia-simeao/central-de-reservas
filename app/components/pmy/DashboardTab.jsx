import { useState } from "react";
import { Button, Card, Icon, SectionHeader } from "./PmyUI";


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
                <stop offset="0%" stopColor="var(--dashboard-accent)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="var(--dashboard-accent)" stopOpacity="0.01" />
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
    <Card className="pmy-ds-dashboard-card">
      <div className="pmy-ds-dashboard-header">
        <SectionHeader
          eyebrow={lang === "pt" ? "Distribuição por canal" : "Channel distribution"}
          title={lang === "pt" ? "Reservas por Canal" : "Bookings by Channel"}
          subtitle={`${rangeLabel} · ${lang === "pt" ? "somente reservas confirmadas" : "confirmed bookings only"}`}
          className="pmy-u-mb-0"
        />

        <div className="pmy-ds-dashboard-controls">
          <div className="pmy-ds-period-control">
            <div className="pmy-ds-period-label">
              {lang === "pt" ? "Período do gráfico" : "Chart period"}
            </div>

            <button
              type="button"
              className={`pmy-ds-period-trigger ${periodMenuOpen ? "is-open" : ""}`}
              onClick={() => {
                if (!periodMenuOpen && selectedRange === "custom") ensureCustomDates();
                setPeriodMenuOpen((open) => !open);
              }}
            >
              <span className="pmy-ds-period-trigger__copy">
                <Icon name="calendar" size={15} />
                <span>{rangeLabel}</span>
              </span>
              <Icon name="chevronDown" size={15} className="pmy-ds-period-trigger__chevron" />
            </button>

            {periodMenuOpen ? (
              <div className="pmy-ds-period-menu">
                <div className="pmy-ds-period-presets">
                  <div className="pmy-ds-period-presets__label">
                    {lang === "pt" ? "Períodos rápidos" : "Quick ranges"}
                  </div>

                  <div className="pmy-ds-period-preset-list">
                    {presetOptions.map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`pmy-ds-period-preset ${selectedRange === value ? "is-active" : ""}`}
                        onClick={() => choosePreset(value)}
                      >
                        {label}
                      </button>
                    ))}

                    <button
                      type="button"
                      className={`pmy-ds-period-preset ${selectedRange === "custom" ? "is-active" : ""}`}
                      onClick={() => choosePreset("custom")}
                    >
                      {lang === "pt" ? "Personalizado" : "Custom"}
                    </button>
                  </div>
                </div>

                <div className="pmy-ds-period-calendar">
                  <div className="pmy-ds-period-calendar__header">
                    <div>
                      <div className="pmy-ds-period-calendar__title">
                        {lang === "pt" ? "Calendário" : "Calendar"}
                      </div>
                      <div className="pmy-ds-period-calendar__subtitle">
                        {lang === "pt"
                          ? "Escolha uma data inicial e final"
                          : "Choose a start and end date"}
                      </div>
                    </div>
                    <span className="pmy-ds-period-calendar__icon">
                      <Icon name="calendar" size={17} />
                    </span>
                  </div>

                  <div className="pmy-ds-date-range">
                    <button
                      type="button"
                      className={`pmy-ds-date-box ${calendarSelectionStep === "start" ? "is-active" : ""}`}
                      onClick={() => {
                        setCalendarSelectionStep("start");
                        const anchor = selectedStartDate || new Date();
                        setCalendarMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
                      }}
                    >
                      <span className="pmy-ds-date-box__label">
                        <span>{lang === "pt" ? "De" : "From"}</span>
                        <Icon name="calendar" size={14} />
                      </span>
                      <strong className="pmy-ds-date-box__value">
                        {selectedStartDate
                          ? new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "en-GB").format(selectedStartDate)
                          : (lang === "pt" ? "Escolher data" : "Choose date")}
                      </strong>
                    </button>

                    <div className="pmy-ds-date-range__arrow" aria-hidden="true">
                      <Icon name="chevronRight" size={15} />
                    </div>

                    <button
                      type="button"
                      className={`pmy-ds-date-box ${calendarSelectionStep === "end" ? "is-active" : ""}`}
                      onClick={() => {
                        setCalendarSelectionStep("end");
                        const anchor = selectedEndDate || selectedStartDate || new Date();
                        setCalendarMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
                      }}
                    >
                      <span className="pmy-ds-date-box__label">
                        <span>{lang === "pt" ? "Até" : "To"}</span>
                        <Icon name="calendar" size={14} />
                      </span>
                      <strong className="pmy-ds-date-box__value">
                        {selectedEndDate
                          ? new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "en-GB").format(selectedEndDate)
                          : (lang === "pt" ? "Escolher data" : "Choose date")}
                      </strong>
                    </button>
                  </div>

                  <div className="pmy-ds-mini-calendar">
                    <div className="pmy-ds-mini-calendar__nav">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon="chevronLeft"
                        iconOnly
                        aria-label={lang === "pt" ? "Mês anterior" : "Previous month"}
                        onClick={() => moveCalendarMonth(-1)}
                      />
                      <strong className="pmy-ds-mini-calendar__month">{calendarMonthLabel}</strong>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon="chevronRight"
                        iconOnly
                        aria-label={lang === "pt" ? "Próximo mês" : "Next month"}
                        onClick={() => moveCalendarMonth(1)}
                      />
                    </div>

                    <div className="pmy-ds-mini-calendar__week">
                      {calendarWeekdays.map((day, index) => (
                        <div key={`weekday-${index}`} className="pmy-ds-mini-calendar__weekday">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="pmy-ds-mini-calendar__days">
                      {calendarDays.map((date, index) => {
                        if (!date) {
                          return <div key={`empty-${index}`} className="pmy-ds-mini-calendar__empty" />;
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
                            className={[
                              "pmy-ds-mini-calendar__day",
                              isToday ? "is-today" : "",
                              inRange ? "is-range" : "",
                              isStart || isEnd ? "is-selected" : "",
                            ].filter(Boolean).join(" ")}
                            onClick={() => handleCalendarDayClick(date)}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pmy-ds-period-help">
                    {selectedStartDate && selectedEndDate
                      ? `${formatDate(selectedStartDate)} – ${formatDate(selectedEndDate)}`
                      : calendarSelectionStep === "end"
                        ? (lang === "pt" ? "Agora escolha a data final." : "Now choose the end date.")
                        : (lang === "pt" ? "Clique no primeiro dia do período." : "Click the first day of the range.")}
                  </div>

                  <div className="pmy-ds-period-actions">
                    <Button variant="secondary" size="sm" onClick={() => setPeriodMenuOpen(false)}>
                      {lang === "pt" ? "Fechar" : "Close"}
                    </Button>
                    <Button
                      size="sm"
                      disabled={!customStart || !customEnd}
                      onClick={applyCustomRange}
                    >
                      {lang === "pt" ? "Aplicar período" : "Apply range"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="pmy-ds-total-badge">
            <span className="pmy-ds-total-badge__label">
              {lang === "pt" ? "Total no período" : "Period total"}
            </span>
            <strong className="pmy-ds-total-badge__value">{totalBookings}</strong>
          </div>
        </div>
      </div>

      <div
        role="img"
        aria-label={lang === "pt" ? "Gráfico de reservas confirmadas por canal" : "Confirmed bookings by channel chart"}
        className="pmy-ds-channel-list"
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
              className={`pmy-ds-channel-item ${isExpanded ? "is-expanded" : ""}`}
              onMouseEnter={() => setExpandedKey(item.key)}
              onMouseLeave={() => setExpandedKey(null)}
            >
              <button
                type="button"
                className="pmy-ds-channel-row"
                onClick={() => setExpandedKey((current) => current === item.key ? null : item.key)}
                onFocus={() => setExpandedKey(item.key)}
              >
                <div className="pmy-ds-channel-copy">
                  <div className="pmy-ds-channel-name">{item.label}</div>
                  <div className="pmy-ds-channel-share">{share.toFixed(1)}%</div>
                </div>

                <div className="pmy-ds-channel-track">
                  <div
                    className="pmy-ds-channel-fill"
                    style={{
                      "--pmy-bar-width": `${width}%`,
                      "--pmy-bar-min": item.bookings > 0 ? "6px" : "0px",
                    }}
                  />
                </div>

                <div className="pmy-ds-channel-total">
                  <strong>{item.bookings}</strong>
                  <span>{lang === "pt" ? "reservas" : "bookings"}</span>
                </div>
              </button>

              {isExpanded ? (
                <div className="pmy-ds-channel-detail">
                  <div>
                    <span className="pmy-ds-metric-label">
                      {lang === "pt" ? "Reservas" : "Bookings"}
                    </span>
                    <strong className="pmy-ds-metric-value">{item.bookings}</strong>
                  </div>
                  <div>
                    <span className="pmy-ds-metric-label">
                      {lang === "pt" ? "Passageiros" : "Passengers"}
                    </span>
                    <strong className="pmy-ds-metric-value">{item.passengers}</strong>
                  </div>
                  <div>
                    <span className="pmy-ds-metric-label">
                      {lang === "pt" ? "Participação" : "Share"}
                    </span>
                    <strong className="pmy-ds-metric-value">{share.toFixed(1)}%</strong>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="pmy-ds-card-note">
        {lang === "pt"
          ? "Outros agrupa reservas manuais, Central PMY e qualquer origem ainda não classificada."
          : "Other groups manual bookings, Central PMY and any source not yet classified."}
      </div>
    </Card>
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
          border:'1px solid var(--dashboard-border)',
          borderRadius:'14px',
          background:'var(--dashboard-soft)',
          textAlign:'right'
        }}>
          <div style={{
            fontSize:'11px',
            color:'var(--dashboard-muted)',
            fontWeight:'800',
            textTransform:'uppercase',
            letterSpacing:'.05em'
          }}>
            {lang === 'pt' ? 'Total classificado' : 'Classified total'}
          </div>
          <div style={{
            fontSize:'25px',
            fontWeight:'900',
            color:'var(--dashboard-accent)',
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
        background:'var(--dashboard-soft)',
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
                border:'1px solid var(--dashboard-border)',
                borderRadius:'16px',
                padding:'15px 16px',
                background:'var(--surface-color)'
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
                color:'var(--dashboard-text)',
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
                color:'var(--dashboard-muted)'
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
          borderTop:'1px solid var(--dashboard-border)',
          fontSize:'12px',
          color:'var(--dashboard-muted)'
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
          border:'1px solid var(--dashboard-border)',
          borderRadius:'14px',
          background:'var(--dashboard-soft)',
          textAlign:'right'
        }}>
          <div style={{
            fontSize:'11px',
            color:'var(--dashboard-muted)',
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
            color:'var(--dashboard-accent)'
          }}>
            {departures.length}
          </strong>
        </div>
      </div>

      {visibleDepartures.length === 0 ? (
        <div style={{
          minHeight:'150px',
          display:'grid',
          placeItems:'center',
          textAlign:'center',
          color:'var(--dashboard-muted)',
          fontSize:'13px'
        }}>
          {lang === 'pt'
            ? 'Nenhuma saída confirmada ou pendente nos próximos 30 dias.'
            : 'No confirmed or pending departures in the next 30 days.'}
        </div>
      ) : (
        <div style={{ overflowX:'auto' }}>
          <div style={{ minWidth:'920px' }}>
            <div style={{
              display:'grid',
              gridTemplateColumns:'minmax(280px,1.7fr) 120px 86px 105px minmax(170px,1fr) 150px',
              gap:'12px',
              padding:'0 12px 9px',
              borderBottom:'1px solid #eceeec',
              color:'var(--dashboard-muted)',
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
                  style={{
                    display:'grid',
                    gridTemplateColumns:'minmax(280px,1.7fr) 120px 86px 105px minmax(170px,1fr) 150px',
                    gap:'12px',
                    alignItems:'center',
                    minHeight:'74px',
                    padding:'10px 12px',
                    borderBottom:'1px solid var(--dashboard-border)'
                  }}
                >
                  <div style={{
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
                        background:'var(--dashboard-soft)',
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
                        color:'var(--dashboard-text)',
                        overflow:'hidden',
                        textOverflow:'ellipsis',
                        whiteSpace:'nowrap'
                      }}>
                        {departure.tourTitle}
                      </div>
                      <div style={{
                        marginTop:'3px',
                        fontSize:'11px',
                        color:'var(--dashboard-muted)'
                      }}>
                        {departure.bookings} {lang === 'pt' ? 'reserva(s)' : 'booking(s)'}
                      </div>
                    </div>
                  </div>

                  <strong style={{ fontSize:'13px', color:'var(--dashboard-text)' }}>
                    {formatDate(departure.startTime)}
                  </strong>

                  <strong style={{ fontSize:'14px', color:'var(--dashboard-text)' }}>
                    {formatTime(departure.startTime)}
                  </strong>

                  <div>
                    <strong style={{
                      display:'block',
                      fontSize:'17px',
                      color:'var(--dashboard-text)'
                    }}>
                      {departure.passengers}
                    </strong>
                    <span style={{ fontSize:'11px', color:'var(--dashboard-muted)' }}>
                      pax
                    </span>
                  </div>

                  <div style={{
                    display:'flex',
                    flexWrap:'wrap',
                    gap:'5px'
                  }}>
                    {(departure.platforms || []).map((platform) => (
                      <span
                        key={platform}
                        style={{
                          padding:'5px 8px',
                          borderRadius:'999px',
                          background:'var(--dashboard-soft)',
                          color:'var(--dashboard-muted)',
                          fontSize:'11px',
                          fontWeight:'750'
                        }}
                      >
                        {platform}
                      </span>
                    ))}
                  </div>

                  <div style={{ textAlign:'right' }}>
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
                      color:'var(--dashboard-muted)'
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
              border:'1px solid var(--dashboard-border)',
              borderRadius:'999px',
              background:'var(--surface-color)',
              padding:'8px 14px',
              color:'var(--dashboard-accent)',
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

        <div style={{
          display:'flex',
          gap:'5px',
          padding:'4px',
          borderRadius:'999px',
          background:'var(--dashboard-soft)',
          border:'1px solid var(--dashboard-border)'
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
                  background:active ? 'var(--surface-color)' : 'transparent',
                  color:active ? 'var(--dashboard-accent)' : 'var(--dashboard-muted)',
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
        <div style={{
          minHeight:'150px',
          display:'grid',
          placeItems:'center',
          textAlign:'center',
          color:'var(--dashboard-muted)',
          fontSize:'13px'
        }}>
          {lang === 'pt'
            ? 'Ainda não há reservas confirmadas no período para montar o ranking.'
            : 'There are no confirmed bookings in the period to build the ranking yet.'}
        </div>
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

            return (
              <div
                key={row.id}
                style={{
                  display:'grid',
                  gridTemplateColumns:'46px minmax(230px,1.6fr) minmax(120px,1fr) 112px 112px 150px',
                  alignItems:'center',
                  gap:'12px',
                  minHeight:'72px',
                  padding:'10px 12px',
                  border:'1px solid #eceeec',
                  borderRadius:'15px',
                  background:index === 0
                    ? 'color-mix(in srgb, var(--dashboard-accent) 4%, var(--surface-color))'
                    : '#fff'
                }}
              >
                <div style={{
                  width:'34px',
                  height:'34px',
                  borderRadius:'11px',
                  display:'grid',
                  placeItems:'center',
                  background:index === 0 ? 'var(--dashboard-accent)' : 'var(--dashboard-soft)',
                  color:index === 0 ? 'var(--dashboard-accent-contrast)' : 'var(--dashboard-muted)',
                  fontSize:'13px',
                  fontWeight:'900'
                }}>
                  {index + 1}
                </div>

                <div style={{
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
                      background:'var(--dashboard-soft)',
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
                      color:'var(--dashboard-text)',
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

                <div style={{
                  height:'10px',
                  borderRadius:'999px',
                  background:'var(--dashboard-soft)',
                  overflow:'hidden'
                }}>
                  <div style={{
                    width:`${barWidth}%`,
                    minWidth:metricValue > 0 ? '5px' : 0,
                    height:'100%',
                    borderRadius:'inherit',
                    background:'var(--dashboard-accent)'
                  }} />
                </div>

                <div>
                  <span style={{
                    display:'block',
                    fontSize:'10px',
                    color:'var(--dashboard-muted)',
                    fontWeight:'800',
                    textTransform:'uppercase',
                    letterSpacing:'.04em'
                  }}>
                    {lang === 'pt' ? 'Reservas' : 'Bookings'}
                  </span>
                  <strong style={{ fontSize:'18px', color:'var(--dashboard-text)' }}>{row.bookings}</strong>
                </div>

                <div>
                  <span style={{
                    display:'block',
                    fontSize:'10px',
                    color:'var(--dashboard-muted)',
                    fontWeight:'800',
                    textTransform:'uppercase',
                    letterSpacing:'.04em'
                  }}>
                    {lang === 'pt' ? 'Passageiros' : 'Passengers'}
                  </span>
                  <strong style={{ fontSize:'18px', color:'var(--dashboard-text)' }}>{row.passengers}</strong>
                </div>

                <div style={{ textAlign:'right' }}>
                  <span style={{
                    display:'block',
                    fontSize:'10px',
                    color:'var(--dashboard-muted)',
                    fontWeight:'800',
                    textTransform:'uppercase',
                    letterSpacing:'.04em'
                  }}>
                    {lang === 'pt' ? 'Receita real' : 'Real revenue'}
                  </span>
                  <strong style={{
                    display:'block',
                    fontSize:'17px',
                    color:'var(--dashboard-accent)'
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
        borderTop:'1px solid var(--dashboard-border)',
        fontSize:'12px',
        color:'var(--dashboard-muted)'
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

              <UpcomingDeparturesPanel
                departures={dashboardUpcomingDepartures || []}
                lang={lang}
                imageShape={imageShape}
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

              <TourPerformanceRanking
                categoriesData={categoriesData}
                realConfirmedBookings={realConfirmedBookings}
                dashboardCurrency={dashboardCurrency}
                formatMoney={formatMoney}
                lang={lang}
                periodLabel={getPeriodLabel()}
                imageShape={imageShape}
              />

              <div className="pmy-grid" style={{ gridTemplateColumns:'1fr' }}>
                <div className="pmy-card" style={{ padding:'0 25px 25px 25px' }}>
                  <div style={{ padding:'25px 0 14px 0', borderBottom:'1px solid var(--dashboard-border)' }}>
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
                          <p style={{ padding:'10px 0', color:'var(--dashboard-muted)', fontSize:'15px' }}>Nenhum passeio nesta categoria.</p>
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
                                : <div className={`pmy-tour-img ${imageShape}`} style={{ display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', background:'var(--dashboard-soft)' }}>🏰</div>
                              }
                              <div className="pmy-tour-details">
                                <div className="pmy-tour-name">{tour.title||"Tour sem título"}</div>
                                {tour.price && <div style={{ fontSize:'15px', color:'var(--dashboard-accent)', fontWeight:'700', marginBottom:'4px' }}>{tour.price}</div>}
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

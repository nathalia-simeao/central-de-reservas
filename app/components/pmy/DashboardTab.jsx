import { useState } from "react";
import { Badge, Button, Card, EmptyState, Icon, SectionHeader } from "./PmyUI";

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

  const classifyChannel = (booking) => {
    const explicit = String(booking?.commercialSource || "").trim();
    if (explicit) return explicit;

    const platform = String(booking?.platform || "").trim().toUpperCase();
    if (platform === "VIATOR") return "Viator";
    if (["GETYOURGUIDE", "GET_YOUR_GUIDE", "GYG"].includes(platform)) return "GetYourGuide";
    if (platform === "CIVITATIS") return "Civitatis";
    if (platform === "HEADOUT") return "Headout";
    if (["MANUAL", "CENTRAL"].includes(platform)) return "Manual";
    if (platform === "SHOPIFY") return "Site";
    return "Outro";
  };

  const baseChannels = [
    { key: "Site", label: "Site" },
    { key: "Google Ads", label: "Google Ads" },
    { key: "Google Organic", label: "Google Organic" },
    { key: "Instagram", label: "Instagram" },
    { key: "Facebook", label: "Facebook" },
    { key: "WhatsApp", label: "WhatsApp" },
    { key: "Email", label: "Email" },
    { key: "Parceiro", label: lang === "pt" ? "Parceiro" : "Partner" },
    { key: "Viator", label: "Viator" },
    { key: "GetYourGuide", label: "GetYourGuide" },
    { key: "Headout", label: "Headout" },
    { key: "Civitatis", label: "Civitatis" },
    { key: "TikTok", label: "TikTok" },
    { key: "Microsoft Ads", label: "Microsoft Ads" },
    { key: "Referência", label: lang === "pt" ? "Referência" : "Referral" },
    { key: "Manual", label: lang === "pt" ? "Manual" : "Manual" },
    { key: "Outro", label: lang === "pt" ? "Outros" : "Other" },
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
    const key = classifyChannel(booking);

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
          eyebrow={lang === "pt" ? "Origem comercial" : "Commercial source"}
          title={lang === "pt" ? "Reservas por Origem Comercial" : "Bookings by Commercial Source"}
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
        aria-label={lang === "pt" ? "Gráfico de reservas confirmadas por origem comercial" : "Confirmed bookings by commercial source chart"}
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
      icon: "check",
    },
    {
      key: "pending",
      label: lang === "pt" ? "Pendentes" : "Pending",
      description: lang === "pt" ? "aguardando confirmação" : "awaiting confirmation",
      value: Number(summary?.pending || 0),
      icon: "clock",
    },
    {
      key: "canceled",
      label: lang === "pt" ? "Canceladas" : "Canceled",
      description: lang === "pt" ? "reservas canceladas" : "canceled bookings",
      value: Number(summary?.canceled || 0),
      icon: "canceled",
    },
    {
      key: "completed",
      label: lang === "pt" ? "Concluídas" : "Completed",
      description: lang === "pt" ? "passeios já realizados" : "tours already completed",
      value: Number(summary?.completed || 0),
      icon: "check",
    },
  ];

  return (
    <Card>
      <div className="pmy-ds-dashboard-header">
        <SectionHeader
          eyebrow={lang === "pt" ? "Situação das reservas" : "Booking status"}
          title={lang === "pt" ? "Status das reservas" : "Booking status"}
          subtitle={`${periodLabel} · ${lang === "pt"
            ? "visão atual das reservas criadas no período"
            : "current status of bookings created in the period"}`}
          className="pmy-u-mb-0"
        />

        <div className="pmy-ds-status-summary">
          <span className="pmy-ds-status-summary__label">
            {lang === "pt" ? "Total classificado" : "Classified total"}
          </span>
          <strong className="pmy-ds-status-summary__value">{total}</strong>
        </div>
      </div>

      <div className="pmy-ds-status-distribution">
        {items.map((item) => {
          const share = total > 0 ? (item.value / total) * 100 : 0;
          if (share <= 0) return null;

          return (
            <div
              key={item.key}
              className={`pmy-ds-status-segment is-${item.key}`}
              title={`${item.label}: ${item.value} (${share.toFixed(1)}%)`}
              style={{
                "--pmy-share": `${share}%`,
                "--pmy-share-min": item.value > 0 ? "6px" : "0px",
              }}
            />
          );
        })}
      </div>

      <div className="pmy-ds-status-grid">
        {items.map((item) => {
          const share = total > 0 ? (item.value / total) * 100 : 0;

          return (
            <div key={item.key} className="pmy-ds-status-card">
              <div className="pmy-ds-status-card__top">
                <span className={`pmy-ds-status-icon is-${item.key}`}>
                  <Icon name={item.icon} size={16} />
                </span>
                <span className={`pmy-ds-status-share is-${item.key}`}>
                  {share.toFixed(1)}%
                </span>
              </div>

              <div className="pmy-ds-status-label">{item.label}</div>
              <strong className={`pmy-ds-status-value is-${item.key}`}>
                {item.value}
              </strong>
              <div className="pmy-ds-status-description">{item.description}</div>
            </div>
          );
        })}
      </div>

      {unclassified > 0 ? (
        <div className="pmy-ds-status-note">
          {lang === "pt"
            ? `${unclassified} reserva(s) possui(em) status ainda não classificado pela Central.`
            : `${unclassified} booking(s) have a status not yet classified by the Central.`}
        </div>
      ) : null}
    </Card>
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
    <Card>
      <div className="pmy-ds-dashboard-header">
        <SectionHeader
          eyebrow={lang === "pt" ? "Operação dos próximos 30 dias" : "Next 30 days operations"}
          title={lang === "pt" ? "Próximas saídas" : "Upcoming departures"}
          subtitle={lang === "pt"
            ? "Tour, data, horário, passageiros, canais e vagas disponíveis"
            : "Tour, date, time, passengers, channels and available seats"}
          className="pmy-u-mb-0"
        />

        <div className="pmy-ds-departure-summary">
          <span className="pmy-ds-departure-summary__label">
            {lang === "pt" ? "Saídas" : "Departures"}
          </span>
          <strong className="pmy-ds-departure-summary__value">{departures.length}</strong>
        </div>
      </div>

      {visibleDepartures.length === 0 ? (
        <EmptyState
          icon="calendar"
          title={lang === "pt" ? "Nenhuma saída nos próximos 30 dias" : "No departures in the next 30 days"}
          description={lang === "pt"
            ? "As saídas confirmadas ou pendentes aparecerão aqui automaticamente."
            : "Confirmed or pending departures will appear here automatically."}
        />
      ) : (
        <div className="pmy-ds-departure-table">
          <div className="pmy-ds-departure-table__inner">
            <div className="pmy-ds-departure-head">
              <span>Tour</span>
              <span>{lang === "pt" ? "Data" : "Date"}</span>
              <span>{lang === "pt" ? "Horário" : "Time"}</span>
              <span>{lang === "pt" ? "Passageiros" : "Passengers"}</span>
              <span>{lang === "pt" ? "Canais" : "Channels"}</span>
              <span className="pmy-ds-departure-head__end">
                {lang === "pt" ? "Vagas disponíveis" : "Available seats"}
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

              return (
                <div key={departure.key} className="pmy-ds-departure-row">
                  <div className="pmy-ds-departure-tour">
                    {departure.image ? (
                      <img
                        src={departure.image}
                        alt={departure.imageAlt || departure.tourTitle}
                        className={`pmy-ds-departure-image ${imageShape}`}
                      />
                    ) : (
                      <div className="pmy-ds-departure-placeholder">
                        <Icon name="calendar" size={18} />
                      </div>
                    )}

                    <div className="pmy-ds-departure-copy">
                      <div className="pmy-ds-departure-title">{departure.tourTitle}</div>
                      <div className="pmy-ds-departure-meta">
                        {departure.bookings} {lang === "pt" ? "reserva(s)" : "booking(s)"}
                      </div>
                    </div>
                  </div>

                  <strong className="pmy-ds-departure-date">
                    {formatDate(departure.startTime)}
                  </strong>

                  <strong className="pmy-ds-departure-time">
                    {formatTime(departure.startTime)}
                  </strong>

                  <div className="pmy-ds-departure-pax">
                    <strong>{departure.passengers}</strong>
                    <span>pax</span>
                  </div>

                  <div className="pmy-ds-departure-channels">
                    {(departure.platforms || []).map((platform) => (
                      <Badge key={platform}>{platform}</Badge>
                    ))}
                  </div>

                  <div className="pmy-ds-departure-seats">
                    <span className={[
                      "pmy-ds-seat-count",
                      isFull ? "is-full" : "",
                      isTight ? "is-tight" : "",
                    ].filter(Boolean).join(" ")}>
                      {available}
                    </span>
                    <div className="pmy-ds-seat-meta">
                      {lang === "pt" ? `de ${capacity} vagas` : `of ${capacity} seats`}
                      {departure.capacitySource === "DEFAULT"
                        ? (lang === "pt" ? " · padrão" : " · default")
                        : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {departures.length > 8 ? (
        <div className="pmy-ds-show-more">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAll((current) => !current)}
          >
            {showAll
              ? (lang === "pt" ? "Mostrar menos" : "Show less")
              : (lang === "pt"
                ? `Ver todas as ${departures.length} saídas`
                : `View all ${departures.length} departures`)}
          </Button>
        </div>
      ) : null}
    </Card>
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
    <Card>
      <div className="pmy-ds-dashboard-header">
        <SectionHeader
          eyebrow={lang === "pt" ? "Performance dos tours" : "Tour performance"}
          title={lang === "pt" ? "Ranking de tours" : "Tour ranking"}
          subtitle={`${periodLabel} · ${lang === "pt"
            ? "reservas confirmadas, passageiros e receita real"
            : "confirmed bookings, passengers and real revenue"}`}
          className="pmy-u-mb-0"
        />

        <div className="pmy-ds-ranking-controls">
          {metricOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`pmy-ds-ranking-control ${rankingMetric === option.key ? "is-active" : ""}`}
              onClick={() => setRankingMetric(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {topRows.length === 0 ? (
        <EmptyState
          icon="ranking"
          title={lang === "pt" ? "Ainda não há ranking para este período" : "There is no ranking for this period yet"}
          description={lang === "pt"
            ? "O ranking aparecerá quando houver reservas confirmadas no período selecionado."
            : "The ranking will appear when confirmed bookings exist in the selected period."}
        />
      ) : (
        <div className="pmy-ds-ranking-list">
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
                className={`pmy-ds-ranking-row ${index === 0 ? "is-first" : ""}`}
              >
                <div className="pmy-ds-ranking-position">{index + 1}</div>

                <div className="pmy-ds-ranking-tour">
                  {row.image ? (
                    <img
                      src={row.image}
                      alt={row.imageAlt}
                      className={`pmy-ds-ranking-image ${imageShape}`}
                    />
                  ) : (
                    <div className="pmy-ds-ranking-placeholder">
                      <Icon name="ranking" size={18} />
                    </div>
                  )}

                  <div className="pmy-ds-ranking-copy">
                    <div className="pmy-ds-ranking-name">{row.title}</div>
                    {row.missingRevenue > 0 ? (
                      <div className="pmy-ds-ranking-warning">
                        {lang === "pt"
                          ? `${row.missingRevenue} reserva(s) sem receita comparável`
                          : `${row.missingRevenue} booking(s) without comparable revenue`}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="pmy-ds-ranking-track">
                  <div
                    className="pmy-ds-ranking-fill"
                    style={{
                      "--pmy-bar-width": `${barWidth}%`,
                      "--pmy-bar-min": metricValue > 0 ? "5px" : "0px",
                    }}
                  />
                </div>

                <div className="pmy-ds-ranking-metric">
                  <span className="pmy-ds-ranking-metric__label">
                    {lang === "pt" ? "Reservas" : "Bookings"}
                  </span>
                  <strong className="pmy-ds-ranking-metric__value">{row.bookings}</strong>
                </div>

                <div className="pmy-ds-ranking-metric">
                  <span className="pmy-ds-ranking-metric__label">
                    {lang === "pt" ? "Passageiros" : "Passengers"}
                  </span>
                  <strong className="pmy-ds-ranking-metric__value">{row.passengers}</strong>
                </div>

                <div className="pmy-ds-ranking-revenue">
                  <span className="pmy-ds-ranking-metric__label">
                    {lang === "pt" ? "Receita real" : "Real revenue"}
                  </span>
                  <strong className="pmy-ds-ranking-metric__value">
                    {formatMoney(row.revenue, dashboardCurrency)}
                  </strong>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="pmy-ds-ranking-note">
        {lang === "pt"
          ? `Receita considera apenas valores reais na moeda ${dashboardCurrency}. Reservas sem valor ou em outra moeda não são convertidas nem estimadas.`
          : `Revenue includes only real values in ${dashboardCurrency}. Bookings without value or in another currency are not converted or estimated.`}
      </div>
    </Card>
  );
};

const OperationalOccupancyPanel = ({ summary = {}, lang }) => {
  const occupancy = Math.max(0, Math.min(100, Number(summary?.occupancyRate || 0)));
  const items = [
    {
      key: "occupancy",
      label: lang === "pt" ? "Ocupação média" : "Average occupancy",
      value: `${occupancy.toFixed(0)}%`,
      tone: occupancy >= 85 ? "warning" : "success",
      detail: lang === "pt" ? "capacidade ponderada" : "weighted capacity",
    },
    {
      key: "available",
      label: lang === "pt" ? "Vagas disponíveis" : "Available seats",
      value: Number(summary?.availableSeats || 0),
      tone: Number(summary?.availableSeats || 0) <= 10 ? "warning" : "neutral",
      detail: lang === "pt" ? "próximos 30 dias" : "next 30 days",
    },
    {
      key: "tight",
      label: lang === "pt" ? "Capacidade baixa" : "Low capacity",
      value: Number(summary?.lowCapacityDepartures || 0),
      tone: Number(summary?.lowCapacityDepartures || 0) > 0 ? "warning" : "success",
      detail: lang === "pt" ? "até 3 vagas ou ≥80%" : "≤3 seats or ≥80%",
    },
    {
      key: "full",
      label: lang === "pt" ? "Saídas lotadas" : "Full departures",
      value: Number(summary?.fullDepartures || 0),
      tone: Number(summary?.fullDepartures || 0) > 0 ? "danger" : "success",
      detail: lang === "pt" ? "sem vagas restantes" : "no seats left",
    },
  ];

  return (
    <Card>
      <SectionHeader
        eyebrow={lang === "pt" ? "Capacidade operacional" : "Operational capacity"}
        title={lang === "pt" ? "Ocupação dos próximos 30 dias" : "Occupancy for the next 30 days"}
        subtitle={lang === "pt"
          ? "Leitura consolidada das saídas com capacidade configurada."
          : "Consolidated view of departures with configured capacity."}
      />

      <div className="pmy-ds-status-grid">
        {items.map((item) => (
          <div key={item.key} className="pmy-ds-status-card">
            <div className="pmy-ds-status-card__top">
              <Badge tone={item.tone}>{item.label}</Badge>
            </div>
            <strong className="pmy-ds-status-value">{item.value}</strong>
            <div className="pmy-ds-status-description">{item.detail}</div>
          </div>
        ))}
      </div>

      <div className="pmy-ds-status-distribution" aria-label={lang === "pt" ? "Taxa de ocupação" : "Occupancy rate"}>
        <div
          className="pmy-ds-status-segment is-confirmed"
          style={{ width: `${occupancy}%` }}
        />
      </div>
      <div className="pmy-ds-status-note">
        {Number(summary?.departuresWithCapacity || 0)} {lang === "pt"
          ? "saída(s) com capacidade configurada"
          : "departure(s) with configured capacity"}
      </div>
    </Card>
  );
};

const CriticalDeparturesPanel = ({ departures = [], lang }) => {
  const formatWhen = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", {
      timeZone: "Europe/Lisbon",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  };

  return (
    <Card>
      <SectionHeader
        eyebrow={lang === "pt" ? "Atenção operacional" : "Operational attention"}
        title={lang === "pt" ? "Próximas saídas críticas" : "Critical upcoming departures"}
        subtitle={lang === "pt"
          ? "Saídas lotadas, com até 3 vagas ou ocupação a partir de 80%."
          : "Full departures, departures with 3 or fewer seats, or at least 80% occupancy."}
      />

      {departures.length === 0 ? (
        <EmptyState
          icon="check"
          title={lang === "pt" ? "Nenhuma saída crítica agora" : "No critical departures right now"}
          description={lang === "pt"
            ? "As próximas saídas estão fora da faixa de atenção."
            : "Upcoming departures are outside the attention threshold."}
        />
      ) : (
        <div className="pmy-ds-list-plain">
          {departures.slice(0, 8).map((departure) => (
            <div key={departure.key} className="pmy-ds-list-plain__row">
              <span className="pmy-ds-list-plain__title">
                <Icon name="calendar" size={16} />
                <span>
                  <strong>{departure.tourTitle}</strong>
                  <span className="pmy-ds-list-item__description">
                    {formatWhen(departure.startTime)} · {Number(departure.passengers || 0)} pax · {Number(departure.occupancyRate || 0).toFixed(0)}%
                  </span>
                </span>
              </span>
              <Badge tone={departure.criticality === "FULL" ? "danger" : "warning"}>
                {departure.criticality === "FULL"
                  ? (lang === "pt" ? "Lotado" : "Full")
                  : `${Number(departure.availableSeats || 0)} ${lang === "pt" ? "vaga(s)" : "seat(s)"}`}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

const SyncBookingIssuesPanel = ({
  bookings = [],
  syncQueueData = {},
  syncQueueLoading = false,
  syncQueueError = "",
  lang,
}) => {
  const byId = new Map((bookings || []).map((booking) => [booking.id, booking]));
  const issues = (syncQueueData?.jobs || [])
    .filter((job) => job?.bookingId)
    .filter((job) => ["RETRY", "DEAD"].includes(String(job?.status || "").toUpperCase()))
    .slice(0, 8);

  return (
    <Card>
      <SectionHeader
        eyebrow={lang === "pt" ? "Fila de sincronização" : "Sync queue"}
        title={lang === "pt" ? "Reservas com erro de sincronização" : "Bookings with sync errors"}
        subtitle={lang === "pt"
          ? "Erros em retry ou dead-letter que exigem acompanhamento."
          : "Retry or dead-letter errors that require follow-up."}
        actions={
          syncQueueLoading ? <Badge tone="neutral">{lang === "pt" ? "Atualizando..." : "Refreshing..."}</Badge> : null
        }
      />

      {syncQueueError ? (
        <div className="pmy-ds-state-panel is-warning">
          <div className="pmy-ds-state-title is-warning">{syncQueueError}</div>
        </div>
      ) : issues.length === 0 ? (
        <EmptyState
          icon="check"
          title={lang === "pt" ? "Nenhuma reserva com erro ativo" : "No booking sync errors"}
          description={lang === "pt"
            ? "A fila não possui reservas em retry ou dead-letter."
            : "The queue has no bookings in retry or dead-letter."}
        />
      ) : (
        <div className="pmy-ds-list-plain">
          {issues.map((job) => {
            const booking = job.booking || byId.get(job.bookingId);
            const bookingRef = booking?.bookingRef || booking?.externalBookingId || job.bookingId;
            const status = String(job.status || "").toUpperCase();
            const tourTitle = booking?.tour?.title || null;

            return (
              <div key={job.id} className="pmy-ds-list-plain__row">
                <span className="pmy-ds-list-plain__title">
                  <Icon name="warning" size={16} />
                  <span>
                    <strong>{bookingRef}</strong>
                    <span className="pmy-ds-list-item__description">
                      {job.provider} · {job.eventType}
                      {tourTitle ? ` · ${tourTitle}` : ""}
                      {job.error ? ` · ${String(job.error).slice(0, 120)}` : ""}
                    </span>
                  </span>
                </span>
                <Badge tone={status === "DEAD" ? "danger" : "warning"}>{status}</Badge>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

const IntegrationHealthPanel = ({
  platformConnections = {},
  reservationPlatforms = [],
  syncQueueData = {},
  lang,
}) => {
  const jobs = syncQueueData?.jobs || [];
  const queueStats = syncQueueData?.stats || {};
  const queueAttention = Number(queueStats.attention || 0);
  const queueHealth = String(queueStats.health || "healthy");
  const providerForKey = {
    shopify: "SHOPIFY",
    viator: "VIATOR",
    getyourguide: "GETYOURGUIDE",
    headout: "HEADOUT",
    civitatis: "CIVITATIS",
  };

  const healthRows = reservationPlatforms.map((platform) => {
    const connection = platformConnections?.[platform.key] || {};
    const provider = providerForKey[platform.key] || String(platform.key || "").toUpperCase();
    const providerJobs = jobs.filter((job) => String(job?.provider || "").toUpperCase() === provider);
    const retryCount = providerJobs.filter((job) => String(job?.status || "").toUpperCase() === "RETRY").length;
    const deadCount = providerJobs.filter((job) => String(job?.status || "").toUpperCase() === "DEAD").length;
    const blockedCount = providerJobs.filter((job) => String(job?.status || "").toUpperCase() === "BLOCKED").length;

    let health = "OFF";
    let tone = "neutral";
    let label = lang === "pt" ? "Não configurado" : "Not configured";

    if (connection.validationError || deadCount > 0) {
      health = "ERROR";
      tone = "danger";
      label = lang === "pt" ? "Erro" : "Error";
    } else if (retryCount > 0) {
      health = "WARNING";
      tone = "warning";
      label = lang === "pt" ? "Retry pendente" : "Retry pending";
    } else if (connection.onboardingPending || connection.available === false) {
      health = "PENDING";
      tone = "warning";
      label = lang === "pt" ? "Onboarding pendente" : "Onboarding pending";
    } else if (blockedCount > 0) {
      health = "WARNING";
      tone = "warning";
      label = lang === "pt" ? "Entrega bloqueada" : "Delivery blocked";
    } else if (connection.connected) {
      health = "HEALTHY";
      tone = "success";
      label = lang === "pt" ? "Operacional" : "Operational";
    } else if (connection.configured) {
      health = "CONFIGURED";
      tone = "accent";
      label = lang === "pt" ? "Configurado" : "Configured";
    }

    return {
      platform,
      connection,
      retryCount,
      deadCount,
      blockedCount,
      health,
      tone,
      label,
    };
  });

  const healthy = healthRows.filter((row) => row.health === "HEALTHY").length;
  const channelAttention = healthRows.filter((row) => ["ERROR", "WARNING"].includes(row.health)).length;
  const attention = channelAttention + (queueAttention > 0 ? 1 : 0);

  return (
    <Card>
      <SectionHeader
        eyebrow={lang === "pt" ? "Integrações" : "Integrations"}
        title={lang === "pt" ? "Health dos canais" : "Channel health"}
        subtitle={lang === "pt"
          ? "Conexão, validação de credenciais e problemas recentes da fila."
          : "Connection, credential validation and recent queue issues."}
        actions={
          <Badge tone={attention > 0 ? "warning" : "success"}>
            {healthy}/{healthRows.length} {lang === "pt" ? "operacionais" : "operational"}
          </Badge>
        }
      />

      <div className="pmy-ds-state-panel pmy-u-mb-4">
        <div className={`pmy-ds-state-title ${queueHealth === "critical" ? "is-danger" : queueHealth === "degraded" ? "is-warning" : "is-success"}`}>
          {lang === "pt" ? "Fila de sincronização" : "Sync queue"} · {queueHealth === "critical"
            ? (lang === "pt" ? "atenção crítica" : "critical attention")
            : queueHealth === "degraded"
              ? (lang === "pt" ? "atenção necessária" : "attention needed")
              : (lang === "pt" ? "saudável" : "healthy")}
        </div>
        <div className="pmy-ds-state-text">
          {queueAttention > 0
            ? `${queueAttention} ${lang === "pt" ? "job(s) exigindo acompanhamento" : "job(s) requiring follow-up"}`
            : (lang === "pt" ? "Sem jobs em retry, bloqueados ou mortos." : "No retry, blocked or dead jobs.")}
        </div>
      </div>

      <div className="pmy-ds-list-plain">
        {healthRows.map((row) => (
          <div key={row.platform.key} className="pmy-ds-list-plain__row">
            <span className="pmy-ds-list-plain__title">
              <Icon name={row.platform.icon || "link"} size={16} />
              <span>
                <strong>{row.platform.name}</strong>
                <span className="pmy-ds-list-item__description">
                  {row.deadCount > 0 ? `${row.deadCount} dead · ` : ""}
                  {row.retryCount > 0 ? `${row.retryCount} retry · ` : ""}
                  {row.blockedCount > 0 ? `${row.blockedCount} blocked · ` : ""}
                  {row.connection.lastSync || (lang === "pt" ? "sem sync recente" : "no recent sync")}
                </span>
              </span>
            </span>
            <Badge tone={row.tone}>{row.label}</Badge>
          </div>
        ))}
      </div>
    </Card>
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
    bookingsLoading,
    bookingsLoadError,
    categoriesData,
    toggleCategory,
    openCategories,
    realConfirmedBookings,
    dashboardBookingStatusSummary,
    dashboardTrendData,
    dashboardTrendGranularity,
    dashboardCurrency,
    imageShape,
    operationalCapacity,
    criticalDepartures,
    platformConnections,
    reservationPlatforms,
    platformLabel,
    syncQueueData,
    syncQueueLoading,
    syncQueueError
  } = props;

  return (
    <>
{/* ===== TAB: DASHBOARD ===== */}
          {activeTab==='dashboard' && (
            <div className="pmy-dashboard">
              {bookingsLoading ? (
                <div className="pmy-ds-actions pmy-ds-mb-2">
                  <Badge tone="neutral">
                    {lang === "pt"
                      ? "Atualizando reservas do período..."
                      : "Refreshing bookings for this period..."}
                  </Badge>
                </div>
              ) : null}
              {bookingsLoadError ? (
                <div className="pmy-ds-actions pmy-ds-mb-2">
                  <Badge tone="warning">{bookingsLoadError}</Badge>
                </div>
              ) : null}
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
                    icon: "calendar",
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
                            <span className="pmy-kpi-icon"><Icon name={item.icon} size={20} /></span>
                            <Icon name="external" size={17} className="pmy-kpi-expand" />
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

              <div className="pmy-grid pmy-ds-performance-grid">
                <OperationalOccupancyPanel
                  summary={operationalCapacity || {}}
                  lang={lang}
                />
                <CriticalDeparturesPanel
                  departures={criticalDepartures || []}
                  lang={lang}
                />
              </div>

              <div className="pmy-grid pmy-ds-performance-grid">
                <SyncBookingIssuesPanel
                  bookings={bookings}
                  syncQueueData={syncQueueData}
                  syncQueueLoading={syncQueueLoading}
                  syncQueueError={syncQueueError}
                  lang={lang}
                />
                <IntegrationHealthPanel
                  platformConnections={platformConnections}
                  reservationPlatforms={reservationPlatforms}
                  syncQueueData={syncQueueData}
                  lang={lang}
                />
              </div>

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

              <div className="pmy-grid pmy-ds-performance-grid">
                <div className="pmy-card pmy-ds-performance-card">
                  <div className="pmy-ds-performance-header">
                    <div className="pmy-trend-eyebrow">
                      {lang === 'pt' ? 'Performance dos produtos' : 'Product performance'}
                    </div>
                    <h2 className="pmy-trend-title pmy-ds-performance-title">
                      {t.dash_performance}
                    </h2>
                    <div className="pmy-trend-subtitle">
                      {getPeriodLabel()} · {lang === 'pt' ? 'reservas confirmadas por passeio' : 'confirmed bookings by tour'}
                    </div>
                  </div>
                  {categoriesData.map(cat => (
                    <div key={cat.name}>
                      <button
                        type="button"
                        className="pmy-accordion-header"
                        aria-expanded={openCategories.includes(cat.name)}
                        onClick={() => toggleCategory(cat.name)}
                      >
                        <span className="pmy-accordion-title">{cat.name}</span>
                        <Icon
                          name="chevronDown"
                          size={16}
                          className={`pmy-ds-accordion-chevron ${openCategories.includes(cat.name) ? "is-open" : ""}`}
                        />
                      </button>
                      <div className={`pmy-accordion-content ${openCategories.includes(cat.name)?'open':''}`}>
                        {cat.toursList.length === 0 ? (
                          <p className="pmy-ds-performance-empty">{lang === "pt" ? "Nenhum passeio nesta categoria." : "No tours in this category."}</p>
                        ) : cat.toursList.map(tour => {
                          const masterTourId = tour.masterTourId || tour.id;
                          const tourBookings = realConfirmedBookings.filter(b => b.tourId === masterTourId);
                          const normalizeChannelKey = (value) => {
                            const normalized = String(value || "").trim().toUpperCase();
                            if (["GETYOURGUIDE", "GET_YOUR_GUIDE", "GYG"].includes(normalized)) return "getyourguide";
                            if (normalized === "SHOPIFY") return "shopify";
                            if (normalized === "VIATOR") return "viator";
                            if (normalized === "CIVITATIS") return "civitatis";
                            if (normalized === "HEADOUT") return "headout";
                            if (normalized === "MANUAL") return "manual";
                            if (normalized === "CENTRAL") return "central";
                            return normalized.toLowerCase() || "other";
                          };
                          const channelCounts = tourBookings.reduce((acc, booking) => {
                            const key = normalizeChannelKey(booking.platform);
                            acc[key] = (acc[key] || 0) + 1;
                            return acc;
                          }, {});
                          const configuredChannels = (reservationPlatforms || [])
                            .filter((platform) =>
                              platformConnections?.[platform.key]?.connected ||
                              Number(channelCounts[platform.key] || 0) > 0
                            )
                            .map((platform) => ({
                              key: platform.key,
                              label: platform.name,
                              count: Number(channelCounts[platform.key] || 0),
                            }));
                          const knownKeys = new Set(configuredChannels.map((channel) => channel.key));
                          const extraChannels = Object.entries(channelCounts)
                            .filter(([key]) => !knownKeys.has(key))
                            .map(([key, count]) => ({
                              key,
                              label: platformLabel ? platformLabel(key) : key,
                              count,
                            }));
                          const visibleChannels = [...configuredChannels, ...extraChannels];
                          return (
                            <div className="pmy-tour-item" key={tour.id}>
                              {tour.image
                                ? <img src={tour.image} alt={tour.imageAlt || tour.title} className={`pmy-tour-img ${imageShape}`} />
                                : <div className={`pmy-tour-img ${imageShape} pmy-ds-performance-placeholder`}>
                                    <Icon name="calendar" size={20} />
                                  </div>
                              }
                              <div className="pmy-tour-details">
                                <div className="pmy-tour-name">{tour.title||"Tour sem título"}</div>
                                {tour.price && <div className="pmy-ds-performance-price">{tour.price}</div>}
                                <div className="pmy-tag-row">
                                  {visibleChannels.length > 0 ? visibleChannels.map((channel) => (
                                    <Badge key={channel.key} tone={channel.count > 0 ? "accent" : "neutral"}>
                                      {channel.label}: {channel.count} {lang === "pt" ? "reserva(s)" : "booking(s)"}
                                    </Badge>
                                  )) : (
                                    <Badge tone="neutral">
                                      {lang === "pt" ? "Sem reservas por canal" : "No channel bookings"}
                                    </Badge>
                                  )}
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

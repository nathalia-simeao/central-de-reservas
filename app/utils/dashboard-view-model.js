import { getDashboardRangeForPeriod } from "../config/pmy-central-config";

export function buildDashboardViewModel({
  bookings,
  selectedPeriod,
  customStart,
  customEnd,
  lang,
  tours,
  shopifyProducts,
}) {
  // Dashboard financeiro calculado somente com dados reais persistidos em Booking.
  const dashboardNow = new Date();
  const dashboardPeriodRange = getDashboardRangeForPeriod(
    selectedPeriod,
    customStart,
    customEnd,
  );
  
  const bookingStatus = (booking) => String(booking?.status || "").toUpperCase();
  const bookingCreatedAt = (booking) => new Date(booking?.externalCreatedAt || booking?.createdAt || 0);
  const bookingUpdatedAt = (booking) => new Date(booking?.externalUpdatedAt || booking?.updatedAt || booking?.createdAt || 0);
  const isInDashboardRange = (date) =>
    date instanceof Date &&
    !Number.isNaN(date.getTime()) &&
    date >= dashboardPeriodRange.start &&
    date <= dashboardPeriodRange.end;
  
  const periodBookings = (bookings || []).filter((booking) =>
    isInDashboardRange(bookingCreatedAt(booking))
  );
  const realConfirmedBookings = periodBookings.filter(
    (booking) => bookingStatus(booking) === "CONFIRMED"
  );
  const realCanceledBookings = (bookings || []).filter((booking) =>
    ["CANCELED", "CANCELLED"].includes(bookingStatus(booking)) &&
    isInDashboardRange(bookingUpdatedAt(booking))
  );
  
  const dashboardBookingStatusSummary = periodBookings.reduce(
    (summary, booking) => {
      const status = bookingStatus(booking);
      const startTime = new Date(booking?.startTime || 0);
      const hasValidStart = !Number.isNaN(startTime.getTime());
  
      if (["CANCELED", "CANCELLED"].includes(status)) {
        summary.canceled += 1;
      } else if (status === "PENDING") {
        summary.pending += 1;
      } else if (["COMPLETED", "COMPLETE", "FINISHED"].includes(status)) {
        summary.completed += 1;
      } else if (status === "CONFIRMED") {
        if (hasValidStart && startTime < dashboardNow) summary.completed += 1;
        else summary.confirmed += 1;
      } else {
        summary.unclassified += 1;
      }
  
      return summary;
    },
    { confirmed: 0, pending: 0, canceled: 0, completed: 0, unclassified: 0 },
  );
  
  dashboardBookingStatusSummary.total =
    dashboardBookingStatusSummary.confirmed +
    dashboardBookingStatusSummary.pending +
    dashboardBookingStatusSummary.canceled +
    dashboardBookingStatusSummary.completed;
  
  const moneyValue = (booking) => {
    if (booking?.totalPrice === null || booking?.totalPrice === undefined || booking?.totalPrice === "") return null;
    const parsed = Number(booking.totalPrice);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const bookingCurrency = (booking) => String(booking?.currency || "").trim().toUpperCase();
  
  const revenueByCurrency = realConfirmedBookings.reduce((totals, booking) => {
    const amount = moneyValue(booking);
    const currency = bookingCurrency(booking);
    if (amount === null || !currency) return totals;
    totals[currency] = (totals[currency] || 0) + amount;
    return totals;
  }, {});
  
  const revenueCurrencies = Object.keys(revenueByCurrency);
  const dashboardCurrency = revenueCurrencies.includes("EUR")
    ? "EUR"
    : (revenueCurrencies[0] || "EUR");
  const confirmedRevenueValue = revenueByCurrency[dashboardCurrency] || 0;
  const pricedConfirmedBookings = realConfirmedBookings.filter(
    (booking) => moneyValue(booking) !== null && bookingCurrency(booking) === dashboardCurrency
  );
  const missingFinancialBookings = realConfirmedBookings.filter(
    (booking) => moneyValue(booking) === null || !bookingCurrency(booking)
  );
  const averageTicketValue = pricedConfirmedBookings.length > 0
    ? confirmedRevenueValue / pricedConfirmedBookings.length
    : 0;
  
  const formatMoney = (amount, currency = dashboardCurrency) => {
    if (!Number.isFinite(Number(amount))) return "—";
    try {
      return new Intl.NumberFormat(lang === "pt" ? "pt-PT" : "en-GB", {
        style: "currency",
        currency: currency || "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(amount));
    } catch {
      return `${currency || "EUR"} ${Number(amount).toFixed(2)}`;
    }
  };
  
  const platformLabel = (platform) => ({
    SHOPIFY: "Shopify",
    GETYOURGUIDE: "GetYourGuide",
    VIATOR: "Viator",
    CIVITATIS: "Civitatis",
    HEADOUT: "Headout",
    MANUAL: lang === "pt" ? "Manual" : "Manual",
    CENTRAL: "Central PMY",
  }[String(platform || "").toUpperCase()] || String(platform || "Outro"));
  
  const salesByChannel = Object.values(
    realConfirmedBookings.reduce((groups, booking) => {
      const platform = String(booking?.platform || "OTHER").toUpperCase();
      if (!groups[platform]) {
        groups[platform] = {
          platform,
          label: platformLabel(platform),
          bookings: 0,
          passengers: 0,
          revenueByCurrency: {},
          missingValue: 0,
        };
      }
  
      const group = groups[platform];
      group.bookings += 1;
      group.passengers += Number(booking?.totalParticipants || 0);
  
      const amount = moneyValue(booking);
      const currency = bookingCurrency(booking);
      if (amount === null || !currency) {
        group.missingValue += 1;
      } else {
        group.revenueByCurrency[currency] =
          (group.revenueByCurrency[currency] || 0) + amount;
      }
  
      return groups;
    }, {})
  ).sort((a, b) => b.bookings - a.bookings);
  
  const totalSalesCount = realConfirmedBookings.length;
  
  // Série temporal real do Dashboard. A granularidade muda automaticamente
  // conforme a amplitude do período selecionado.
  const dashboardRangeDays = Math.max(
    1,
    Math.ceil(
      (dashboardPeriodRange.end.getTime() - dashboardPeriodRange.start.getTime()) /
        (24 * 60 * 60 * 1000),
    ),
  );
  const dashboardTrendGranularity =
    dashboardRangeDays <= 31
      ? "day"
      : dashboardRangeDays <= 150
        ? "week"
        : "month";
  
  const dateOnly = (value) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate());
  
  const startOfWeek = (value) => {
    const result = dateOnly(value);
    const mondayOffset = (result.getDay() + 6) % 7;
    result.setDate(result.getDate() - mondayOffset);
    return result;
  };
  
  const startOfMonth = (value) =>
    new Date(value.getFullYear(), value.getMonth(), 1);
  
  const bucketStartForDate = (value, granularity) => {
    if (granularity === "week") return startOfWeek(value);
    if (granularity === "month") return startOfMonth(value);
    return dateOnly(value);
  };
  
  const bucketKeyForDate = (value, granularity) => {
    const start = bucketStartForDate(value, granularity);
    return [
      start.getFullYear(),
      String(start.getMonth() + 1).padStart(2, "0"),
      String(start.getDate()).padStart(2, "0"),
    ].join("-");
  };
  
  const compactDateLabel = (value, withYear = false) =>
    new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", {
      day: "2-digit",
      month: "short",
      ...(withYear ? { year: "2-digit" } : {}),
    })
      .format(value)
      .replace(".", "");
  
  const monthLabel = (value) =>
    new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", {
      month: "short",
      year: "2-digit",
    })
      .format(value)
      .replace(".", "");
  
  const trendBuckets = new Map();
  let trendCursor = bucketStartForDate(
    dashboardPeriodRange.start,
    dashboardTrendGranularity,
  );
  const trendRangeEnd = dateOnly(dashboardPeriodRange.end);
  
  let trendGuard = 0;
  while (trendCursor <= trendRangeEnd && trendGuard < 500) {
    const start = new Date(trendCursor);
    const key = bucketKeyForDate(start, dashboardTrendGranularity);
    let label = compactDateLabel(start, dashboardRangeDays > 365);
    let fullLabel = label;
  
    if (dashboardTrendGranularity === "week") {
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      label = compactDateLabel(start);
      fullLabel = `${compactDateLabel(start, true)} – ${compactDateLabel(end, true)}`;
    } else if (dashboardTrendGranularity === "month") {
      label = monthLabel(start);
      fullLabel = new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", {
        month: "long",
        year: "numeric",
      }).format(start);
    } else {
      fullLabel = new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(start);
    }
  
    trendBuckets.set(key, {
      key,
      label,
      fullLabel,
      bookings: 0,
      revenue: 0,
    });
  
    if (dashboardTrendGranularity === "month") {
      trendCursor = new Date(
        trendCursor.getFullYear(),
        trendCursor.getMonth() + 1,
        1,
      );
    } else if (dashboardTrendGranularity === "week") {
      const next = new Date(trendCursor);
      next.setDate(next.getDate() + 7);
      trendCursor = next;
    } else {
      const next = new Date(trendCursor);
      next.setDate(next.getDate() + 1);
      trendCursor = next;
    }
    trendGuard += 1;
  }
  
  for (const booking of realConfirmedBookings) {
    const createdAt = bookingCreatedAt(booking);
    if (Number.isNaN(createdAt.getTime())) continue;
  
    const bucketKey = bucketKeyForDate(
      createdAt,
      dashboardTrendGranularity,
    );
    const bucket = trendBuckets.get(bucketKey);
    if (!bucket) continue;
  
    bucket.bookings += 1;
  
    const amount = moneyValue(booking);
    const currency = bookingCurrency(booking);
    if (
      amount !== null &&
      currency &&
      currency === dashboardCurrency
    ) {
      bucket.revenue += amount;
    }
  }
  
  const dashboardTrendData = [...trendBuckets.values()];
  
  const canceledCount = realCanceledBookings.length;
  const cancellationBase = totalSalesCount + canceledCount;
  const cancellationRate = cancellationBase > 0
    ? (canceledCount / cancellationBase) * 100
    : 0;
  
  const upcomingLimit = new Date(dashboardNow);
  upcomingLimit.setDate(upcomingLimit.getDate() + 30);
  const upcomingBookings = (bookings || [])
    .filter((booking) => {
      const status = bookingStatus(booking);
      const start = new Date(booking?.startTime);
      return ["CONFIRMED", "PENDING"].includes(status) &&
        !Number.isNaN(start.getTime()) &&
        start >= dashboardNow &&
        start <= upcomingLimit;
    })
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  
  const upcomingDepartureMap = new Map();
  for (const booking of upcomingBookings) {
    const start = new Date(booking.startTime);
    const key = `${booking.tourId}|${start.toISOString()}`;
    if (!upcomingDepartureMap.has(key)) {
      upcomingDepartureMap.set(key, {
        key,
        tourId: booking.tourId,
        startTime: start,
        bookings: 0,
        passengers: 0,
        platforms: new Set(),
      });
    }
    const departure = upcomingDepartureMap.get(key);
    departure.bookings += 1;
    const explicitPassengers = Number(booking?.totalParticipants || 0);
    const fallbackPassengers =
      Number(booking?.adults || 0) +
      Number(booking?.children || 0) +
      Number(booking?.youths || 0) +
      Number(booking?.seniors || 0);
    departure.passengers += explicitPassengers > 0
      ? explicitPassengers
      : (fallbackPassengers > 0 ? fallbackPassengers : 1);
    departure.platforms.add(platformLabel(booking.platform));
  }
  const upcomingDepartures = [...upcomingDepartureMap.values()]
    .sort((a, b) => a.startTime - b.startTime);
  const upcomingCount = upcomingDepartures.length;
  
  // O Dashboard usa o Tour mestre como base e enriquece com dados Shopify
  // quando disponíveis. Assim, tours ativos apenas em outros canais também entram.
  const shopifyTourOptions = (shopifyProducts || [])
    .filter((product) => {
      const type = String(product.productType || "").toLowerCase();
      const title = String(product.name || "").toLowerCase();
      return (
        !type.includes("internal") &&
        !type.includes("operational") &&
        !title.includes("rescheduling fee")
      );
    })
    .map((product) => {
      const canonical = (tours || []).find(
        (tour) => tour.shopifyProductId === product.id,
      );
      return {
        id: product.id,
        title: product.name,
        price: product.price,
        priceRaw: product.priceRaw,
        masterTourId: canonical?.id || null,
        maxCapacity: Number(canonical?.maxCapacity ?? 20),
        sku: product.sku,
        image: product.image,
        imageAlt: product.imageAlt,
        active: product.active,
        variants: product.variants,
        collections: product.collections,
        scheduleSlots: product.scheduleSlots,
        description: product.description,
      };
    });

  const representedTourIds = new Set(
    shopifyTourOptions.map((tour) => tour.masterTourId).filter(Boolean),
  );

  const nonShopifyTourOptions = (tours || [])
    .filter((tour) => !representedTourIds.has(tour.id))
    .map((tour) => ({
      id: tour.id,
      masterTourId: tour.id,
      title: tour.title,
      price: null,
      priceRaw: null,
      sku: null,
      image: tour.shopifySnapshot?.image || null,
      imageAlt: tour.shopifySnapshot?.imageAlt || tour.title,
      active: tour.shopifyStatus !== "INACTIVE",
      collections: Array.isArray(tour.shopifySnapshot?.collections)
        ? tour.shopifySnapshot.collections
        : [],
      scheduleSlots: tour.scheduleSlots || [],
      variants: tour.variants || [],
      maxCapacity: Number(tour.maxCapacity ?? 20),
      description: tour.shopifySnapshot?.description || "",
    }));

  const tourOptions = [...shopifyTourOptions, ...nonShopifyTourOptions];
  
  const dashboardUpcomingDepartures = upcomingDepartures.map((departure) => {
    const canonicalTour = (tours || []).find((tour) => tour.id === departure.tourId) || null;
    const displayTour = tourOptions.find(
      (tour) => tour.masterTourId === departure.tourId || tour.id === departure.tourId,
    ) || null;
  
    const capacity = Math.max(
      0,
      Number(canonicalTour?.maxCapacity ?? displayTour?.maxCapacity ?? 20),
    );
    const availableSeats = Math.max(0, capacity - Number(departure.passengers || 0));
  
    return {
      key: departure.key,
      tourId: departure.tourId,
      tourTitle:
        displayTour?.title ||
        canonicalTour?.title ||
        (lang === "pt" ? "Tour sem título" : "Untitled tour"),
      image: displayTour?.image || null,
      imageAlt: displayTour?.imageAlt || displayTour?.title || canonicalTour?.title || "",
      startTime: departure.startTime.toISOString(),
      bookings: departure.bookings,
      passengers: departure.passengers,
      platforms: [...departure.platforms],
      capacity,
      capacitySource: canonicalTour?.capacitySource || "DEFAULT",
      availableSeats,
    };
  });
  

  const operationalCapacity = dashboardUpcomingDepartures.reduce(
    (summary, departure) => {
      const capacity = Math.max(0, Number(departure?.capacity || 0));
      const passengers = Math.max(0, Number(departure?.passengers || 0));
      const availableSeats = Math.max(
        0,
        Number(departure?.availableSeats ?? capacity - passengers),
      );
      const occupancyRate =
        capacity > 0 ? Math.min(100, (passengers / capacity) * 100) : 0;

      if (capacity > 0) {
        summary.totalCapacity += capacity;
        summary.totalPassengers += Math.min(passengers, capacity);
        summary.departuresWithCapacity += 1;
      }

      if (capacity > 0 && availableSeats === 0) {
        summary.fullDepartures += 1;
      } else if (
        capacity > 0 &&
        (availableSeats <= 3 || occupancyRate >= 80)
      ) {
        summary.lowCapacityDepartures += 1;
      }

      return summary;
    },
    {
      totalCapacity: 0,
      totalPassengers: 0,
      departuresWithCapacity: 0,
      fullDepartures: 0,
      lowCapacityDepartures: 0,
    },
  );

  operationalCapacity.occupancyRate =
    operationalCapacity.totalCapacity > 0
      ? (operationalCapacity.totalPassengers / operationalCapacity.totalCapacity) * 100
      : 0;
  operationalCapacity.availableSeats = Math.max(
    0,
    operationalCapacity.totalCapacity - operationalCapacity.totalPassengers,
  );

  const criticalDepartures = dashboardUpcomingDepartures
    .map((departure) => {
      const capacity = Math.max(0, Number(departure?.capacity || 0));
      const passengers = Math.max(0, Number(departure?.passengers || 0));
      const availableSeats = Math.max(
        0,
        Number(departure?.availableSeats ?? capacity - passengers),
      );
      const occupancyRate =
        capacity > 0 ? Math.min(100, (passengers / capacity) * 100) : 0;

      return {
        ...departure,
        occupancyRate,
        criticality:
          capacity > 0 && availableSeats === 0
            ? "FULL"
            : capacity > 0 && (availableSeats <= 3 || occupancyRate >= 80)
              ? "LOW_CAPACITY"
              : "NORMAL",
      };
    })
    .filter((departure) => departure.criticality !== "NORMAL")
    .sort((left, right) => {
      const seatDifference =
        Number(left.availableSeats || 0) - Number(right.availableSeats || 0);
      if (seatDifference !== 0) return seatDifference;
      return new Date(left.startTime) - new Date(right.startTime);
    });

  // Categorias: agrupa pelas coleções do Shopify (dinâmico)
  const allCollections = [...new Set(
    tourOptions.flatMap(t => (t.collections || []).map(c => c.title))
  )].filter(Boolean);
  
  // Se não tiver coleções, fallback por nome
  const categoriesData = allCollections.length > 0
    ? allCollections.map(colName => ({
        name: colName,
        toursList: tourOptions.filter(t => (t.collections || []).some(c => c.title === colName))
      })).filter(c => c.toursList.length > 0)
    : [
        { name: "Day Trips", toursList: tourOptions.filter(t => !t.title.toLowerCase().includes("walking")) },
        { name: "Walking Tours", toursList: tourOptions.filter(t =>  t.title.toLowerCase().includes("walking")) },
      ];

  return {
    realConfirmedBookings,
    realCanceledBookings,
    dashboardBookingStatusSummary,
    moneyValue,
    bookingCurrency,
    revenueByCurrency,
    revenueCurrencies,
    dashboardCurrency,
    confirmedRevenueValue,
    pricedConfirmedBookings,
    missingFinancialBookings,
    averageTicketValue,
    formatMoney,
    platformLabel,
    salesByChannel,
    totalSalesCount,
    dashboardTrendGranularity,
    dashboardTrendData,
    canceledCount,
    cancellationRate,
    upcomingCount,
    upcomingDepartures,
    tourOptions,
    dashboardUpcomingDepartures,
    operationalCapacity,
    criticalDepartures,
    categoriesData,
  };
}

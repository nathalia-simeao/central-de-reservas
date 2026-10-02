export function createCalendarModel({
  blockedDates,
  bookings,
  currentMonth,
  currentYear,
  guideAssignmentsList,
  selectedCalendarDay,
  tours,
}) {
  const guideAssignmentDateKey = (day = selectedCalendarDay) => {
    const month = String(currentMonth + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");
    return `${currentYear}-${month}-${date}`;
  };

  const getCalendarDayBlocks = (day) => {
    const month = String(currentMonth + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");
    const dateKey = `${currentYear}-${month}-${date}`;
    const weekday = String(
      new Date(currentYear, currentMonth, day, 12, 0, 0).getDay(),
    );

    return (blockedDates || []).filter((block) => {
      if (!block?.active) return false;
      const storedDate = block.date ? String(block.date).slice(0, 10) : null;
      return (
        (storedDate && storedDate === dateKey) ||
        (block.dayOfWeek && String(block.dayOfWeek) === weekday)
      );
    });
  };

  const getLisbonBookingParts = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Lisbon",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(date)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );

    return {
      dateKey: `${parts.year}-${parts.month}-${parts.day}`,
      timeKey: `${parts.hour}:${parts.minute}`,
    };
  };

  const getBookingPassengers = (booking) => {
    const explicit = Number(booking?.totalParticipants || 0);
    if (explicit > 0) return explicit;

    const fallback =
      Number(booking?.adults || 0) +
      Number(booking?.children || 0) +
      Number(booking?.youths || 0) +
      Number(booking?.seniors || 0);

    return fallback > 0 ? fallback : 1;
  };

  const isBookingActiveForCapacity = (booking) => {
    if (!booking || booking.status === "CANCELED") return false;
    if (!["CONFIRMED", "PENDING"].includes(booking.status)) return false;

    if (booking.status === "PENDING" && booking.holdExpiresAt) {
      const expires = new Date(booking.holdExpiresAt);
      if (!Number.isNaN(expires.getTime()) && expires <= new Date()) {
        return false;
      }
    }

    return true;
  };

  const getCalendarDayBookings = (day) => {
    const month = String(currentMonth + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");
    const dateKey = `${currentYear}-${month}-${date}`;

    return (bookings || [])
      .filter(isBookingActiveForCapacity)
      .filter(
        (booking) =>
          getLisbonBookingParts(booking.startTime)?.dateKey === dateKey,
      )
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  };

  const getCalendarDayAssignments = (day) => {
    const dateKey = guideAssignmentDateKey(day);
    return (guideAssignmentsList || [])
      .filter((assignment) => assignment?.status === "ASSIGNED")
      .filter(
        (assignment) =>
          getLisbonBookingParts(assignment.startTime)?.dateKey === dateKey,
      )
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  };

  const getCalendarDayStats = (day) => {
    const dayBookings = getCalendarDayBookings(day);
    const slots = new Map();

    for (const booking of dayBookings) {
      const parts = getLisbonBookingParts(booking.startTime);
      if (!parts) continue;

      const tour = (tours || []).find((item) => item.id === booking.tourId);
      const capacity = Math.max(0, Number(tour?.maxCapacity ?? 20));
      const key = `${booking.tourId}|${parts.timeKey}`;

      if (!slots.has(key)) {
        slots.set(key, {
          tourId: booking.tourId,
          timeKey: parts.timeKey,
          capacity,
          occupied: 0,
        });
      }

      slots.get(key).occupied += getBookingPassengers(booking);
    }

    const occupied = [...slots.values()].reduce(
      (sum, slot) => sum + slot.occupied,
      0,
    );
    const capacity = [...slots.values()].reduce(
      (sum, slot) => sum + slot.capacity,
      0,
    );
    const remaining = Math.max(0, capacity - occupied);
    const dayAssignments = getCalendarDayAssignments(day);

    return {
      bookings: dayBookings,
      assignments: dayAssignments,
      assignmentCount: dayAssignments.length,
      bookingCount: dayBookings.length,
      tourCount: new Set(dayBookings.map((booking) => booking.tourId)).size,
      passengers: occupied,
      capacity,
      remaining,
    };
  };

  return {
    getBookingPassengers,
    getCalendarDayAssignments,
    getCalendarDayBlocks,
    getCalendarDayBookings,
    getCalendarDayStats,
    getLisbonBookingParts,
    guideAssignmentDateKey,
    isBookingActiveForCapacity,
  };
}

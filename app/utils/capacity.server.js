import {
  blockMatchesCalendarSlot,
  getActiveAvailabilityBlocks,
  getLisbonDateParts,
  normalizePlatform,
} from "./availability.server";

const ACTIVE_BOOKING_STATUSES = ["CONFIRMED", "PENDING"];

function positiveInt(value, fallback = 0) {
  const parsed = Number.parseInt(value ?? fallback, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function bookingSeatCount(booking, now = new Date()) {
  if (!booking || !ACTIVE_BOOKING_STATUSES.includes(booking.status)) return 0;

  if (
    booking.status === "PENDING" &&
    booking.holdExpiresAt &&
    new Date(booking.holdExpiresAt) <= now
  ) {
    return 0;
  }

  if (booking.totalParticipants > 0) return booking.totalParticipants;

  const fallback =
    (booking.adults || 0) +
    (booking.children || 0) +
    (booking.youths || 0) +
    (booking.seniors || 0);

  return fallback > 0 ? fallback : 1;
}

export function slotParts(startTime) {
  const parts = getLisbonDateParts(startTime);
  if (!parts) throw new Error("Invalid startTime");
  return parts;
}

export function bookingMatchesSlot(booking, parts) {
  const bookingParts = getLisbonDateParts(booking.startTime);
  return (
    bookingParts &&
    bookingParts.dateKey === parts.dateKey &&
    bookingParts.timeKey === parts.timeKey
  );
}

export function calculateAvailabilityFromLoaded({
  tour,
  bookings = [],
  blocks = [],
  startTime,
  platform,
  requestedSeats = 0,
  now = new Date(),
}) {
  if (!tour) throw new Error("Tour not found");

  const parts = slotParts(startTime);
  const normalizedPlatform = normalizePlatform(platform || "central");

  const blockingRule =
    blocks.find((block) =>
      blockMatchesCalendarSlot(block, {
        tourId: tour.id,
        dateKey: parts.dateKey,
        timeKey: parts.timeKey,
        dayOfWeek: parts.dayOfWeek,
        platform: normalizedPlatform,
      }),
    ) || null;

  const capacity = Math.max(0, Number(tour.maxCapacity ?? 20));
  const occupiedSeats = bookings.reduce((total, booking) => {
    if (!bookingMatchesSlot(booking, parts)) return total;
    return total + bookingSeatCount(booking, now);
  }, 0);

  const remainingSeats = blockingRule
    ? 0
    : Math.max(0, capacity - occupiedSeats);

  const requested = Math.max(0, positiveInt(requestedSeats, 0));

  return {
    tourId: tour.id,
    platform: normalizedPlatform,
    date: parts.dateKey,
    time: parts.timeKey,
    capacity,
    occupiedSeats,
    remainingSeats,
    requestedSeats: requested,
    available: !blockingRule && remainingSeats > 0,
    canAccept:
      !blockingRule &&
      (requested === 0 ? remainingSeats > 0 : requested <= remainingSeats),
    blocked: Boolean(blockingRule),
    blockingRule,
  };
}

export function calculateAvailabilityForCalendarSlotFromLoaded({
  tour,
  bookings = [],
  blocks = [],
  dateKey,
  timeKey,
  platform,
  requestedSeats = 0,
  now = new Date(),
}) {
  if (!tour) throw new Error("Tour not found");

  const normalizedPlatform = normalizePlatform(platform || "central");
  const dayOfWeek = new Date(`${dateKey}T12:00:00Z`).getUTCDay();

  const blockingRule =
    blocks.find((block) =>
      blockMatchesCalendarSlot(block, {
        tourId: tour.id,
        dateKey,
        timeKey,
        dayOfWeek,
        platform: normalizedPlatform,
      }),
    ) || null;

  const capacity = Math.max(0, Number(tour.maxCapacity ?? 20));
  const occupiedSeats = bookings.reduce((total, booking) => {
    const parts = getLisbonDateParts(booking.startTime);
    if (!parts || parts.dateKey !== dateKey || parts.timeKey !== timeKey) {
      return total;
    }
    return total + bookingSeatCount(booking, now);
  }, 0);

  const remainingSeats = blockingRule
    ? 0
    : Math.max(0, capacity - occupiedSeats);

  const requested = Math.max(0, positiveInt(requestedSeats, 0));

  return {
    tourId: tour.id,
    platform: normalizedPlatform,
    date: dateKey,
    time: timeKey,
    capacity,
    occupiedSeats,
    remainingSeats,
    requestedSeats: requested,
    available: !blockingRule && remainingSeats > 0,
    canAccept:
      !blockingRule &&
      (requested === 0 ? remainingSeats > 0 : requested <= remainingSeats),
    blocked: Boolean(blockingRule),
    blockingRule,
  };
}

function queryWindow(startTime) {
  const center = new Date(startTime);
  return {
    gte: new Date(center.getTime() - 18 * 60 * 60 * 1000),
    lte: new Date(center.getTime() + 18 * 60 * 60 * 1000),
  };
}

export async function getCentralAvailability(
  prisma,
  {
    tourId,
    startTime,
    platform = "central",
    requestedSeats = 0,
    excludeBookingId = null,
  },
) {
  const tour = await prisma.tour.findUnique({
    where: { id: tourId },
  });

  if (!tour) throw new Error("Tour not found");

  const bookings = await prisma.booking.findMany({
    where: {
      tourId,
      status: { in: ACTIVE_BOOKING_STATUSES },
      startTime: queryWindow(startTime),
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
  });

  const blocks = await getActiveAvailabilityBlocks(prisma, tourId);

  return calculateAvailabilityFromLoaded({
    tour,
    bookings,
    blocks,
    startTime,
    platform,
    requestedSeats,
  });
}

async function lockTourCapacity(tx, tourId) {
  // Row lock: reservations from different channels for the same Tour are
  // serialized before checking capacity. This closes the classic race where
  // two channels both see the last seats and sell them at the same instant.
  await tx.$queryRaw`
    SELECT "id"
    FROM "Tour"
    WHERE "id" = ${tourId}
    FOR UPDATE
  `;
}

export async function createBookingWithCapacityGuard(
  prisma,
  {
    tourId,
    startTime,
    platform,
    externalBookingId = null,
    requestedSeats,
    bookingData,
  },
) {
  const seats = positiveInt(requestedSeats, 0);
  const bookingPlatform = String(platform || "CENTRAL").trim().toUpperCase();

  if (seats < 1) {
    return {
      accepted: false,
      reason: "INVALID_PARTICIPANT_COUNT",
      message: "Reservation must contain at least one participant.",
    };
  }

  return prisma.$transaction(
    async (tx) => {
      await lockTourCapacity(tx, tourId);

      if (externalBookingId) {
        const existing = await tx.booking.findFirst({
          where: {
            platform: bookingPlatform,
            externalBookingId,
          },
        });

        if (existing) {
          const availability = await getCentralAvailability(tx, {
            tourId,
            startTime,
            platform: bookingPlatform,
            excludeBookingId: existing.id,
          });

          return {
            accepted: true,
            idempotent: true,
            booking: existing,
            availabilityAfter: {
              ...availability,
              occupiedSeats:
                availability.occupiedSeats + bookingSeatCount(existing),
              remainingSeats: Math.max(
                0,
                availability.capacity -
                  availability.occupiedSeats -
                  bookingSeatCount(existing),
              ),
            },
          };
        }
      }

      const availability = await getCentralAvailability(tx, {
        tourId,
        startTime,
        platform: bookingPlatform,
        requestedSeats: seats,
      });

      if (!availability.canAccept) {
        return {
          accepted: false,
          reason: availability.blocked
            ? "BLOCKED_BY_AGENDA"
            : "INSUFFICIENT_CAPACITY",
          message: availability.blocked
            ? "Timeslot is blocked by the PMY Central Agenda."
            : `Only ${availability.remainingSeats} seat(s) remain.`,
          availability,
        };
      }

      const booking = await tx.booking.create({
        data: {
          ...bookingData,
          tourId,
          startTime,
          platform: bookingPlatform,
          totalParticipants: seats,
        },
      });

      return {
        accepted: true,
        idempotent: false,
        booking,
        availabilityAfter: {
          ...availability,
          occupiedSeats: availability.occupiedSeats + seats,
          remainingSeats: Math.max(
            0,
            availability.remainingSeats - seats,
          ),
          requestedSeats: 0,
          canAccept: availability.remainingSeats - seats > 0,
          available: availability.remainingSeats - seats > 0,
        },
      };
    },
    {
      maxWait: 5000,
      timeout: 10000,
    },
  );
}

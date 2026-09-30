import {
  blockMatchesCalendarSlot,
  getActiveAvailabilityBlocks,
  getDatePartsInTimeZone,
  normalizePlatform,
} from "./availability.server";
import { classifyCommercialSource } from "./commercial-source.server";

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

export function slotParts(startTime, timeZone = "Europe/Lisbon") {
  const parts = getDatePartsInTimeZone(startTime, timeZone);
  if (!parts) throw new Error("Invalid startTime");
  return parts;
}

export function bookingMatchesSlot(booking, parts, timeZone = "Europe/Lisbon") {
  const bookingParts = getDatePartsInTimeZone(booking.startTime, timeZone);
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

  const timeZone = tour.timezone || "Europe/Lisbon";
  const parts = slotParts(startTime, timeZone);
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
    if (!bookingMatchesSlot(booking, parts, timeZone)) return total;
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
    const parts = getDatePartsInTimeZone(
      booking.startTime,
      tour.timezone || "Europe/Lisbon",
    );
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


export async function convertBookingHoldWithCapacityGuard(
  prisma,
  {
    holdId,
    tourId,
    startTime,
    platform = "SHOPIFY",
    externalBookingId = null,
    requestedSeats,
    bookingData,
  },
) {
  const seats = positiveInt(requestedSeats, 0);
  const bookingPlatform = String(platform || "SHOPIFY").trim().toUpperCase();

  if (!holdId) {
    return {
      accepted: false,
      reason: "HOLD_ID_REQUIRED",
      message: "A checkout hold ID is required.",
    };
  }

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
        const existingOrderBooking = await tx.booking.findFirst({
          where: {
            platform: bookingPlatform,
            externalBookingId,
          },
        });

        if (existingOrderBooking) {
          return {
            accepted: true,
            idempotent: true,
            reusedHold: existingOrderBooking.id === holdId,
            booking: existingOrderBooking,
          };
        }
      }

      const hold = await tx.booking.findUnique({
        where: { id: holdId },
      });

      if (!hold) {
        return {
          accepted: false,
          reason: "HOLD_NOT_FOUND",
          message: "The checkout hold no longer exists.",
        };
      }

      const holdStart = new Date(hold.startTime);
      const requestedStart = new Date(startTime);
      const sameSlot =
        hold.tourId === tourId &&
        !Number.isNaN(holdStart.getTime()) &&
        !Number.isNaN(requestedStart.getTime()) &&
        Math.abs(holdStart.getTime() - requestedStart.getTime()) < 60 * 1000;
      const sameSeats = bookingSeatCount(hold) === seats || hold.totalParticipants === seats;

      if (!sameSlot || !sameSeats) {
        return {
          accepted: false,
          reason: "HOLD_MISMATCH",
          message: "The paid order does not match the reserved checkout hold.",
          hold,
        };
      }

      const now = new Date();
      const expiresAt = hold.holdExpiresAt ? new Date(hold.holdExpiresAt) : null;
      const activeHold =
        hold.status === "PENDING" &&
        (!expiresAt || expiresAt > now);
      const nextStatus = bookingData?.status || "CONFIRMED";

      if (!activeHold && nextStatus !== "CONFIRMED") {
        return {
          accepted: false,
          reason: "HOLD_EXPIRED",
          message: "The checkout hold expired before payment was confirmed.",
          hold,
        };
      }

      let availability = null;

      if (!activeHold) {
        availability = await getCentralAvailability(tx, {
          tourId,
          startTime,
          platform: bookingPlatform,
          requestedSeats: seats,
          excludeBookingId: hold.id,
        });

        if (!availability.canAccept) {
          return {
            accepted: false,
            reason: availability.blocked
              ? "HOLD_EXPIRED_SLOT_BLOCKED"
              : "HOLD_EXPIRED_INSUFFICIENT_CAPACITY",
            message: availability.blocked
              ? "The checkout hold expired and the slot is now blocked."
              : `The checkout hold expired and only ${availability.remainingSeats} seat(s) remain.`,
            availability,
            hold,
          };
        }
      }

      const booking = await tx.booking.update({
        where: { id: hold.id },
        data: {
          ...bookingData,
          tourId,
          startTime,
          platform: bookingPlatform,
          externalBookingId:
            externalBookingId || bookingData?.externalBookingId || hold.externalBookingId,
          totalParticipants: seats,
          holdExpiresAt:
            nextStatus === "CONFIRMED"
              ? null
              : activeHold
                ? hold.holdExpiresAt
                : null,
          cancelReason: null,
        },
      });

      return {
        accepted: true,
        idempotent: false,
        reusedHold: true,
        reacquiredCapacity: !activeHold,
        booking,
        availability,
      };
    },
    {
      maxWait: 5000,
      timeout: 10000,
    },
  );
}

export async function releaseBookingHold(
  prisma,
  holdId,
  reason = "checkout_hold_released",
) {
  if (!holdId) return { released: false, booking: null };

  const current = await prisma.booking.findUnique({
    where: { id: holdId },
  });

  if (!current || current.status !== "PENDING") {
    return { released: false, booking: current || null };
  }

  const now = new Date();
  const updated = await prisma.booking.updateMany({
    where: {
      id: holdId,
      status: "PENDING",
    },
    data: {
      status: "CANCELED",
      syncStatus: "HOLD_RELEASED",
      holdExpiresAt: now,
      cancelReason: reason,
      lastSyncedAt: now,
    },
  });

  if (updated.count !== 1) {
    return {
      released: false,
      booking: await prisma.booking.findUnique({ where: { id: holdId } }),
    };
  }

  return {
    released: true,
    booking: {
      ...current,
      status: "CANCELED",
      syncStatus: "HOLD_RELEASED",
      holdExpiresAt: now,
      cancelReason: reason,
      lastSyncedAt: now,
    },
  };
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
          commercialSource:
            bookingData?.commercialSource ||
            classifyCommercialSource({ platform: bookingPlatform }),
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

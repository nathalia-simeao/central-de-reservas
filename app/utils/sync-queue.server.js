import crypto from "node:crypto";

export const SYNC_EVENT_TYPES = Object.freeze({
  BOOKING_CREATED: "BOOKING_CREATED",
  BOOKING_UPDATED: "BOOKING_UPDATED",
  BOOKING_CANCELLED: "BOOKING_CANCELLED",
  AVAILABILITY_CHANGED: "AVAILABILITY_CHANGED",
  BLOCK_CREATED: "BLOCK_CREATED",
  BLOCK_REMOVED: "BLOCK_REMOVED",
  CAPACITY_CHANGED: "CAPACITY_CHANGED",
});

const RESERVATION_PROVIDERS = [
  "GETYOURGUIDE",
  "VIATOR",
  "HEADOUT",
  "CIVITATIS",
];

const PROVIDER_ALIASES = {
  GYG: "GETYOURGUIDE",
  GETYOURGUIDE: "GETYOURGUIDE",
  GET_YOUR_GUIDE: "GETYOURGUIDE",
  VIATOR: "VIATOR",
  HEADOUT: "HEADOUT",
  CIVITATIS: "CIVITATIS",
};

const MAPPING_FIELDS = {
  GETYOURGUIDE: "gygActivityId",
  VIATOR: "viatorProductCode",
  HEADOUT: "headoutId",
  CIVITATIS: "civitatisId",
};

const TERMINAL_STATUSES = new Set([
  "COMPLETED",
  "SKIPPED",
  "BLOCKED",
  "DEAD",
]);

const RETRY_DELAYS_SECONDS = [60, 300, 900, 3600, 10800, 21600, 43200, 86400];

function normalizeProvider(value) {
  const raw = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_");
  return PROVIDER_ALIASES[raw] || raw;
}

function normalizeProviders(values = []) {
  return [
    ...new Set(
      (Array.isArray(values) ? values : [values])
        .map(normalizeProvider)
        .filter((provider) => RESERVATION_PROVIDERS.includes(provider)),
    ),
  ];
}

function asDate(value) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isRetryableHttpStatus(status) {
  const value = Number(status);
  return (
    !Number.isFinite(value) ||
    value === 408 ||
    value === 409 ||
    value === 425 ||
    value === 429 ||
    value >= 500
  );
}

async function mappedProvidersForTour(prisma, tourId) {
  if (!tourId) return [];

  const tour = await prisma.tour.findUnique({
    where: { id: tourId },
    select: {
      gygActivityId: true,
      viatorProductCode: true,
      headoutId: true,
      civitatisId: true,
    },
  });

  if (!tour) return [];

  return RESERVATION_PROVIDERS.filter((provider) => {
    const field = MAPPING_FIELDS[provider];
    return field && Boolean(tour[field]);
  });
}

async function createEventAndJobs(
  prisma,
  {
    eventId = crypto.randomUUID(),
    eventType,
    sourcePlatform = null,
    aggregateType = null,
    aggregateId = null,
    tourId = null,
    bookingId = null,
    startTime = null,
    scope = "SLOT",
    force = false,
    payload = null,
    targetProviders = null,
    maxAttempts = 8,
  },
) {
  if (!eventType) throw new Error("eventType is required.");

  const normalizedSource = sourcePlatform
    ? normalizeProvider(sourcePlatform)
    : null;

  const explicitTargets =
    targetProviders == null ? null : normalizeProviders(targetProviders);

  const targets =
    explicitTargets ??
    (await mappedProvidersForTour(prisma, tourId));

  const filteredTargets = targets.filter(
    (provider) => provider !== normalizedSource,
  );

  const normalizedStartTime = asDate(startTime);

  return prisma.$transaction(async (tx) => {
    const event = await tx.syncEvent.upsert({
      where: { id: eventId },
      create: {
        id: eventId,
        eventType,
        sourcePlatform: normalizedSource,
        aggregateType,
        aggregateId,
        tourId,
        bookingId,
        startTime: normalizedStartTime,
        scope,
        force: Boolean(force),
        payload: payload || undefined,
      },
      update: {
        eventType,
        sourcePlatform: normalizedSource,
        aggregateType,
        aggregateId,
        tourId,
        bookingId,
        startTime: normalizedStartTime,
        scope,
        force: Boolean(force),
        payload: payload || undefined,
      },
    });

    const jobs = [];

    for (const provider of filteredTargets) {
      const where = {
        provider_eventId: {
          provider,
          eventId,
        },
      };

      const existing = await tx.syncJob.findUnique({ where });

      if (existing && TERMINAL_STATUSES.has(existing.status)) {
        jobs.push(existing);
        continue;
      }

      const jobData = {
        eventType,
        provider,
        sourcePlatform: normalizedSource,
        aggregateType,
        aggregateId,
        tourId,
        bookingId,
        startTime: normalizedStartTime,
        scope,
        force: Boolean(force),
        payload: payload || undefined,
        maxAttempts,
      };

      const job = existing
        ? await tx.syncJob.update({
            where,
            data: {
              ...jobData,
              status: "PENDING",
              nextAttemptAt: new Date(),
              error: null,
              lockedAt: null,
              lockedBy: null,
            },
          })
        : await tx.syncJob.create({
            data: {
              eventId,
              ...jobData,
              status: "PENDING",
              nextAttemptAt: new Date(),
            },
          });

      jobs.push(job);
    }

    return { event, jobs };
  });
}

export async function enqueueSyncEvent(prisma, input) {
  return createEventAndJobs(prisma, input);
}

export async function enqueueBookingSync(
  prisma,
  {
    eventId,
    eventType,
    booking,
    sourcePlatform = null,
    targetProviders = null,
    force = true,
    payload = null,
  },
) {
  if (!booking?.id || !booking?.tourId || !booking?.startTime) {
    throw new Error("booking with id, tourId and startTime is required.");
  }

  return createEventAndJobs(prisma, {
    eventId,
    eventType,
    sourcePlatform: sourcePlatform || booking.platform,
    aggregateType: "BOOKING",
    aggregateId: booking.id,
    tourId: booking.tourId,
    bookingId: booking.id,
    startTime: booking.startTime,
    scope: "SLOT",
    force,
    payload: {
      bookingStatus: booking.status,
      bookingPlatform: booking.platform,
      ...(payload || {}),
    },
    targetProviders,
  });
}

export async function enqueueAvailabilitySync(
  prisma,
  {
    eventId,
    eventType = SYNC_EVENT_TYPES.AVAILABILITY_CHANGED,
    tourId,
    startTime = null,
    scope = startTime ? "SLOT" : "TOUR",
    sourcePlatform = null,
    targetProviders = null,
    force = false,
    aggregateType = "TOUR",
    aggregateId = null,
    payload = null,
  },
) {
  if (!tourId) throw new Error("tourId is required.");

  return createEventAndJobs(prisma, {
    eventId,
    eventType,
    sourcePlatform,
    aggregateType,
    aggregateId || tourId,
    tourId,
    startTime,
    scope,
    force,
    payload,
    targetProviders,
  });
}

async function claimNextJob(prisma, workerId) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 5 * 60 * 1000);

  await prisma.syncJob.updateMany({
    where: {
      status: "PROCESSING",
      lockedAt: { lt: staleBefore },
    },
    data: {
      status: "RETRY",
      lockedAt: null,
      lockedBy: null,
      nextAttemptAt: now,
      error: "Recovered stale worker lock.",
    },
  });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = await prisma.syncJob.findFirst({
      where: {
        status: { in: ["PENDING", "RETRY"] },
        nextAttemptAt: { lte: now },
        lockedAt: null,
      },
      orderBy: [
        { nextAttemptAt: "asc" },
        { createdAt: "asc" },
      ],
    });

    if (!candidate) return null;

    const claimed = await prisma.syncJob.updateMany({
      where: {
        id: candidate.id,
        status: { in: ["PENDING", "RETRY"] },
        nextAttemptAt: { lte: now },
        lockedAt: null,
      },
      data: {
        status: "PROCESSING",
        lockedAt: now,
        lockedBy: workerId,
        lastAttemptAt: now,
        attempts: { increment: 1 },
        error: null,
      },
    });

    if (claimed.count === 1) {
      return prisma.syncJob.findUnique({ where: { id: candidate.id } });
    }
  }

  return null;
}

function classifyGygResult(result) {
  if (result?.sent === true) {
    return { status: "COMPLETED", result };
  }

  const reason = String(result?.reason || "");
  if (
    [
      "PUSH_NOT_REQUIRED",
      "TOUR_NOT_MAPPED_TO_GYG",
      "TOUR_SCHEDULE_NOT_CONFIGURED",
      "NO_FUTURE_SLOTS",
      "INVALID_SLOT",
      "INVALID_START_TIME",
    ].includes(reason)
  ) {
    return { status: "SKIPPED", result };
  }

  if (reason === "OUTGOING_GYG_NOT_CONFIGURED") {
    return { status: "BLOCKED", result };
  }

  if (result?.status && !isRetryableHttpStatus(result.status)) {
    return { status: "DEAD", result };
  }

  const error = new Error(
    result?.error ||
      reason ||
      `GetYourGuide delivery failed with status ${result?.status || "unknown"}.`,
  );
  error.deliveryResult = result;
  throw error;
}

async function dispatchToProvider(job) {
  const provider = normalizeProvider(job.provider);

  if (provider === "GETYOURGUIDE") {
    const {
      notifyGygSlotAvailability,
      notifyGygTourAvailabilityWindow,
    } = await import("./gyg-v1.server");

    if (!job.tourId) {
      return {
        status: "DEAD",
        result: { reason: "TOUR_ID_REQUIRED" },
      };
    }

    if (job.scope === "TOUR" || !job.startTime) {
      const result = await notifyGygTourAvailabilityWindow({
        tourId: job.tourId,
        days: 30,
      });
      return classifyGygResult(result);
    }

    const result = await notifyGygSlotAvailability({
      tourId: job.tourId,
      startTime: job.startTime,
      force: Boolean(job.force),
    });
    return classifyGygResult(result);
  }

  if (provider === "VIATOR" || provider === "CIVITATIS") {
    return {
      status: "COMPLETED",
      result: {
        mode: "PULL",
        reason: "NO_OUTBOUND_DELIVERY_REQUIRED",
        detail:
          "This provider reads availability/bookings from the PMY supplier API in real time.",
      },
    };
  }

  if (provider === "HEADOUT") {
    return {
      status: "BLOCKED",
      result: {
        reason: "HEADOUT_ADAPTER_PENDING_ONBOARDING",
        detail:
          "The Headout supply-side contract is still pending external onboarding.",
      },
    };
  }

  return {
    status: "BLOCKED",
    result: {
      reason: "PROVIDER_ADAPTER_NOT_IMPLEMENTED",
      provider,
    },
  };
}

function retryDelayMs(attempts) {
  const index = Math.min(
    Math.max(Number(attempts || 1) - 1, 0),
    RETRY_DELAYS_SECONDS.length - 1,
  );
  return RETRY_DELAYS_SECONDS[index] * 1000;
}

async function finalizeJob(prisma, job, outcome) {
  const terminal = TERMINAL_STATUSES.has(outcome.status)
    ? outcome.status
    : "COMPLETED";

  await prisma.syncJob.update({
    where: { id: job.id },
    data: {
      status: terminal,
      result: outcome.result || undefined,
      error: null,
      processedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
    },
  });

  return terminal;
}

async function failJob(prisma, job, error) {
  const attempts = Number(job.attempts || 1);
  const maxAttempts = Number(job.maxAttempts || 8);
  const dead = attempts >= maxAttempts;

  const deliveryResult =
    error?.deliveryResult && typeof error.deliveryResult === "object"
      ? error.deliveryResult
      : null;

  await prisma.syncJob.update({
    where: { id: job.id },
    data: {
      status: dead ? "DEAD" : "RETRY",
      nextAttemptAt: dead
        ? job.nextAttemptAt
        : new Date(Date.now() + retryDelayMs(attempts)),
      result: deliveryResult || undefined,
      error: error?.message || String(error),
      processedAt: dead ? new Date() : null,
      lockedAt: null,
      lockedBy: null,
    },
  });

  return dead ? "DEAD" : "RETRY";
}

export async function expireStaleBookingHolds(
  prisma,
  { limit = 50 } = {},
) {
  const now = new Date();
  const expired = await prisma.booking.findMany({
    where: {
      status: "PENDING",
      holdExpiresAt: { lte: now },
    },
    orderBy: { holdExpiresAt: "asc" },
    take: Math.max(1, Number(limit) || 1),
  });

  let count = 0;

  for (const booking of expired) {
    const updated = await prisma.booking.updateMany({
      where: {
        id: booking.id,
        status: "PENDING",
        holdExpiresAt: { lte: now },
      },
      data: {
        status: "CANCELED",
        syncStatus: "EXPIRED",
        cancelReason: booking.cancelReason || "reservation_hold_expired",
        lastSyncedAt: now,
      },
    });

    if (updated.count !== 1) continue;

    const canceled = {
      ...booking,
      status: "CANCELED",
      syncStatus: "EXPIRED",
      cancelReason: booking.cancelReason || "reservation_hold_expired",
      lastSyncedAt: now,
    };

    await enqueueBookingSync(prisma, {
      eventId: `hold-expired:${booking.id}`,
      eventType: SYNC_EVENT_TYPES.BOOKING_CANCELLED,
      booking: canceled,
      sourcePlatform: booking.platform,
      force: true,
      payload: { reason: "reservation_hold_expired" },
    });

    count += 1;
  }

  return count;
}

export async function processSyncQueue(
  prisma,
  { limit = 10, workerId = null } = {},
) {
  const id =
    workerId ||
    `worker-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;

  const summary = {
    expiredHolds: 0,
    claimed: 0,
    completed: 0,
    skipped: 0,
    blocked: 0,
    retried: 0,
    dead: 0,
  };

  summary.expiredHolds = await expireStaleBookingHolds(prisma, {
    limit: Math.max(10, Number(limit) || 10),
  });

  for (let i = 0; i < Math.max(1, Number(limit) || 1); i += 1) {
    const job = await claimNextJob(prisma, id);
    if (!job) break;

    summary.claimed += 1;

    try {
      const outcome = await dispatchToProvider(job);
      const status = await finalizeJob(prisma, job, outcome);

      if (status === "COMPLETED") summary.completed += 1;
      else if (status === "SKIPPED") summary.skipped += 1;
      else if (status === "BLOCKED") summary.blocked += 1;
      else if (status === "DEAD") summary.dead += 1;
    } catch (error) {
      console.error(
        `[SYNC_QUEUE] ${job.provider} ${job.eventType} failed:`,
        error,
      );
      const status = await failJob(prisma, job, error);
      if (status === "DEAD") summary.dead += 1;
      else summary.retried += 1;
    }
  }

  return summary;
}

export async function getSyncQueueStats(prisma) {
  const rows = await prisma.syncJob.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const stats = Object.fromEntries(
    rows.map((row) => [row.status, row._count._all]),
  );

  return {
    pending: stats.PENDING || 0,
    processing: stats.PROCESSING || 0,
    retry: stats.RETRY || 0,
    completed: stats.COMPLETED || 0,
    skipped: stats.SKIPPED || 0,
    blocked: stats.BLOCKED || 0,
    dead: stats.DEAD || 0,
  };
}

export async function requeueSyncJob(prisma, jobId) {
  return prisma.syncJob.update({
    where: { id: jobId },
    data: {
      status: "PENDING",
      attempts: 0,
      nextAttemptAt: new Date(),
      lockedAt: null,
      lockedBy: null,
      processedAt: null,
      result: undefined,
      error: null,
    },
  });
}

const WORKER_GLOBAL_KEY = "__pmySyncQueueWorker";

export function startSyncQueueWorker(
  prisma,
  {
    intervalMs = Number(process.env.SYNC_QUEUE_INTERVAL_MS || 30000),
    batchSize = Number(process.env.SYNC_QUEUE_BATCH_SIZE || 10),
  } = {},
) {
  if (
    process.env.SYNC_QUEUE_WORKER_ENABLED === "false" ||
    (process.env.npm_lifecycle_event !== "start" &&
      process.env.SYNC_QUEUE_WORKER_ENABLED !== "true")
  ) {
    return null;
  }

  if (globalThis[WORKER_GLOBAL_KEY]) {
    return globalThis[WORKER_GLOBAL_KEY];
  }

  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await processSyncQueue(prisma, { limit: batchSize });
    } catch (error) {
      console.error("[SYNC_QUEUE] worker tick failed:", error);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, Math.max(5000, intervalMs));
  timer.unref?.();

  const handle = { timer, tick };
  globalThis[WORKER_GLOBAL_KEY] = handle;

  setTimeout(tick, 5000).unref?.();

  console.log(
    `[SYNC_QUEUE] worker started (interval=${Math.max(5000, intervalMs)}ms, batch=${batchSize})`,
  );

  return handle;
}

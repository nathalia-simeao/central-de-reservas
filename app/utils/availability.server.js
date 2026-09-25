const LISBON_TIMEZONE = "Europe/Lisbon";

const PLATFORM_ALIASES = {
  gyg: "getyourguide",
  get_your_guide: "getyourguide",
  site: "shopify",
  own_site: "shopify",
};

export function normalizePlatform(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return PLATFORM_ALIASES[normalized] || normalized;
}

function normalizeTimeSlot(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw || raw === "ALL") return "ALL";

  const match = raw.match(/^(\d{1,2})[:H](\d{2})$/i);
  if (!match) return raw;

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

export function getDatePartsInTimeZone(value, timeZone = LISBON_TIMEZONE) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timeZone || LISBON_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
  const timeKey = `${parts.hour}:${parts.minute}`;
  const dayOfWeek = new Date(`${dateKey}T12:00:00Z`).getUTCDay();

  return { dateKey, timeKey, dayOfWeek };
}

export function getLisbonDateParts(value) {
  return getDatePartsInTimeZone(value, LISBON_TIMEZONE);
}

function getStoredDateKey(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function blockTargetsPlatform(block, platform) {
  const target = normalizePlatform(platform);
  const platforms = (block?.platforms || []).map(normalizePlatform).filter(Boolean);

  // Empty platform list means the rule applies to all channels.
  return platforms.length === 0 || platforms.includes(target);
}

export function blockMatchesCalendarSlot(
  block,
  { tourId, dateKey, timeKey, dayOfWeek = null, platform },
) {
  if (!block?.active) return false;
  if (block.tourId && block.tourId !== tourId) return false;
  if (!blockTargetsPlatform(block, platform)) return false;

  const specificDate = getStoredDateKey(block.date);
  const recurringDay = block.dayOfWeek == null ? null : String(block.dayOfWeek);

  // Old/empty rows must never become accidental "block everything" rules.
  if (!specificDate && !recurringDay) return false;

  const resolvedDay =
    dayOfWeek == null
      ? new Date(`${dateKey}T12:00:00Z`).getUTCDay()
      : Number(dayOfWeek);

  if (specificDate && specificDate !== dateKey) return false;
  if (recurringDay && recurringDay !== String(resolvedDay)) return false;

  const ruleTime = normalizeTimeSlot(block.timeSlot);
  const normalizedSlot = normalizeTimeSlot(timeKey);
  if (ruleTime !== "ALL" && ruleTime !== normalizedSlot) return false;

  return true;
}

export function blockMatchesSlot(block, { tourId, startTime, platform }) {
  const parts = getLisbonDateParts(startTime);
  if (!parts) return false;

  return blockMatchesCalendarSlot(block, {
    tourId,
    dateKey: parts.dateKey,
    timeKey: parts.timeKey,
    dayOfWeek: parts.dayOfWeek,
    platform,
  });
}

export async function getActiveAvailabilityBlocks(prisma, tourId) {
  return prisma.blockedDate.findMany({
    where: {
      active: true,
      OR: [{ tourId }, { tourId: null }],
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function findBlockingRule(
  prisma,
  { tourId, startTime, platform, preloadedBlocks = null },
) {
  const blocks = preloadedBlocks || (await getActiveAvailabilityBlocks(prisma, tourId));

  return (
    blocks.find((block) =>
      blockMatchesSlot(block, { tourId, startTime, platform }),
    ) || null
  );
}

export async function findBlockingRuleForCalendarSlot(
  prisma,
  { tourId, dateKey, timeKey, dayOfWeek = null, platform, preloadedBlocks = null },
) {
  const blocks = preloadedBlocks || (await getActiveAvailabilityBlocks(prisma, tourId));

  return (
    blocks.find((block) =>
      blockMatchesCalendarSlot(block, {
        tourId,
        dateKey,
        timeKey,
        dayOfWeek,
        platform,
      }),
    ) || null
  );
}

export async function isTourSlotBlocked(prisma, input) {
  return Boolean(await findBlockingRule(prisma, input));
}

export function parseRecurringDays(value) {
  const values = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number.parseInt(item, 10))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);

  return [...new Set(values)];
}

export function normalizePlatforms(values) {
  const list = Array.isArray(values) ? values : [];
  return [...new Set(list.map(normalizePlatform).filter(Boolean))];
}

export function dateInputToUtcMidnight(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function serializeAvailabilityBlock(block) {
  return {
    id: block.id,
    tourId: block.tourId,
    date: getStoredDateKey(block.date),
    dayOfWeek: block.dayOfWeek,
    timeSlot: normalizeTimeSlot(block.timeSlot),
    platforms: block.platforms || [],
    reason: block.reason,
    source: block.source,
    active: block.active,
    syncStatus: block.syncStatus,
    lastSyncedAt: block.lastSyncedAt,
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
  };
}

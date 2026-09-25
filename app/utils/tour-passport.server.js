const PLATFORM_TOUR_FIELD = {
  SHOPIFY: "shopifyProductId",
  GETYOURGUIDE: "gygActivityId",
  VIATOR: "viatorProductCode",
  HEADOUT: "headoutId",
  CIVITATIS: "civitatisId",
  TRIPADVISOR: "tripadvisorProductCode",
  AIRBNB: "airbnbExperienceId",
};

function clean(value) {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed || null;
}

function extractTimeSlot(value) {
  const text = String(value || "");
  const match = text.match(/\b([01]?\d|2[0-3])[:hH](\d{2})\b/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function passengerCategoryFromTitle(value) {
  const title = String(value || "").toLowerCase();

  if (/\b(private|group|grupo)\b/.test(title)) return "GROUP";
  if (/\b(child|children|kid|kids|crian[cç]a|infant)\b/.test(title)) return "CHILD";
  if (/\b(youth|young|jovem|junior|teen)\b/.test(title)) return "YOUTH";
  if (/\b(senior|idos[oa]|64\+|65\+)\b/.test(title)) return "SENIOR";
  if (/\b(adult|adulto|adulta)\b/.test(title)) return "ADULT";

  return null;
}

function parseCapacity(value) {
  const match = String(value || "").match(/\b(\d{1,3})\b/);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 999 ? parsed : null;
}

function deriveSchedule(product) {
  const configured = Array.isArray(product?.scheduleSlots)
    ? product.scheduleSlots
        .map(extractTimeSlot)
        .filter(Boolean)
    : [];

  if (configured.length) {
    return {
      slots: [...new Set(configured)].sort(),
      source: "SHOPIFY_METAFIELD",
    };
  }

  const fromVariants = (product?.variants || [])
    .filter((variant) => variant?.available !== false)
    .map((variant) => extractTimeSlot(variant?.title))
    .filter(Boolean);

  if (fromVariants.length) {
    return {
      slots: [...new Set(fromVariants)].sort(),
      source: "SHOPIFY_VARIANTS",
    };
  }

  return { slots: [], source: "UNCONFIGURED" };
}

function parseBlockedWeekdays(value) {
  return [
    ...new Set(
      String(value || "")
        .split(/[,;|\s]+/)
        .map((item) => Number.parseInt(item, 10))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
    ),
  ];
}

function parseBlockedSpecificDates(value) {
  const currentYear = new Date().getUTCFullYear();

  return [
    ...new Set(
      String(value || "")
        .split(/[,;|\s]+/)
        .map((item) => item.trim())
        .filter((item) => /^20\d{2}-\d{2}-\d{2}$/.test(item))
        .filter((item) => {
          const date = new Date(`${item}T00:00:00.000Z`);
          if (Number.isNaN(date.getTime())) return false;
          const year = date.getUTCFullYear();
          return year >= currentYear - 1 && year <= currentYear + 5;
        }),
    ),
  ];
}

async function syncCatalogAvailabilityBlocks(prisma, tour, product) {
  const weekdays = parseBlockedWeekdays(product?.metafields?.blocked_days);
  const dates = parseBlockedSpecificDates(product?.metafields?.blocked_specific_dates);

  const desired = [
    ...weekdays.map((day) => ({
      key: `weekday:${day}`,
      dayOfWeek: String(day),
      date: null,
      reason: "Shopify catalog: blocked weekday",
    })),
    ...dates.map((dateKey) => ({
      key: `date:${dateKey}`,
      dayOfWeek: null,
      date: new Date(`${dateKey}T00:00:00.000Z`),
      reason: "Shopify catalog: blocked date",
    })),
  ];

  const existing = await prisma.blockedDate.findMany({
    where: {
      tourId: tour.id,
      source: "SHOPIFY_CATALOG",
    },
  });

  const existingByKey = new Map(
    existing.map((block) => {
      const key = block.dayOfWeek != null
        ? `weekday:${block.dayOfWeek}`
        : block.date
          ? `date:${new Date(block.date).toISOString().slice(0, 10)}`
          : `unknown:${block.id}`;
      return [key, block];
    }),
  );

  const keepIds = [];

  for (const rule of desired) {
    const current = existingByKey.get(rule.key);
    if (current) {
      keepIds.push(current.id);
      if (!current.active) {
        await prisma.blockedDate.update({
          where: { id: current.id },
          data: { active: true, syncStatus: "CENTRAL_ACTIVE" },
        });
      }
      continue;
    }

    const created = await prisma.blockedDate.create({
      data: {
        tourId: tour.id,
        date: rule.date,
        dayOfWeek: rule.dayOfWeek,
        timeSlot: "ALL",
        platforms: [],
        reason: rule.reason,
        source: "SHOPIFY_CATALOG",
        active: true,
        syncStatus: "CENTRAL_ACTIVE",
      },
    });
    keepIds.push(created.id);
  }

  const staleIds = existing
    .filter((block) => !keepIds.includes(block.id) && block.active)
    .map((block) => block.id);

  if (staleIds.length) {
    await prisma.blockedDate.updateMany({
      where: { id: { in: staleIds } },
      data: { active: false, syncStatus: "CATALOG_RELEASED" },
    });
  }
}

export function isOperationalShopifyProduct(product) {
  const type = String(product?.productType || "").toLowerCase();
  const title = String(product?.name || product?.title || "").toLowerCase();

  return (
    type.includes("internal") ||
    type.includes("operational") ||
    title.includes("rescheduling fee")
  );
}

export async function syncShopifyCatalogToMasterTours(prisma, products = []) {
  const eligibleProducts = products.filter(
    (product) => product?.id && !isOperationalShopifyProduct(product),
  );

  if (!eligibleProducts.length) {
    return { created: 0, updated: 0, variantsCreated: 0, variantsUpdated: 0 };
  }

  const productIds = eligibleProducts.map((product) => product.id);
  const existingTours = await prisma.tour.findMany({
    where: { shopifyProductId: { in: productIds } },
    include: { variants: true },
  });

  const byProductId = new Map(
    existingTours.map((tour) => [tour.shopifyProductId, tour]),
  );

  let created = 0;
  let updated = 0;
  let variantsCreated = 0;
  let variantsUpdated = 0;

  for (const product of eligibleProducts) {
    const shopifyStatus = product.active ? "ACTIVE" : "INACTIVE";
    const productType = clean(product.productType);
    const derivedSchedule = deriveSchedule(product);
    const parsedCapacity = parseCapacity(product?.metafields?.group_size);
    const productCurrency = clean(product?.currency || "EUR")?.toUpperCase()?.slice(0, 3) || "EUR";
    let tour = byProductId.get(product.id);

    if (!tour) {
      tour = await prisma.tour.create({
        data: {
          title: product.name,
          productType,
          shopifyStatus,
          shopifyProductId: product.id,
          ...(parsedCapacity
            ? { maxCapacity: parsedCapacity, capacitySource: "SHOPIFY_GROUP_SIZE" }
            : {}),
          scheduleSlots: derivedSchedule.slots,
          scheduleSource: derivedSchedule.source,
          variants: {
            create: (product.variants || [])
              .filter((variant) => variant?.id)
              .map((variant) => ({
                shopifyVariantId: variant.id,
                title: clean(variant.title),
                sku: clean(variant.sku === "—" ? null : variant.sku),
                passengerCategory: passengerCategoryFromTitle(variant.title),
                startTimeSlot: extractTimeSlot(variant.title),
                price: Number.isFinite(Number(variant.priceRaw))
                  ? Number(variant.priceRaw).toFixed(2)
                  : null,
                currency: productCurrency,
                active: variant.available !== false,
              })),
          },
        },
        include: { variants: true },
      });

      created += 1;
      variantsCreated += tour.variants.length;
      byProductId.set(product.id, tour);
      await syncCatalogAvailabilityBlocks(prisma, tour, product);
      continue;
    }

    const tourChanges = {};
    if (tour.title !== product.name) tourChanges.title = product.name;
    if ((tour.productType || null) !== productType) tourChanges.productType = productType;
    if ((tour.shopifyStatus || null) !== shopifyStatus) {
      tourChanges.shopifyStatus = shopifyStatus;
    }

    if (tour.capacitySource !== "MANUAL" && parsedCapacity) {
      if (tour.maxCapacity !== parsedCapacity) tourChanges.maxCapacity = parsedCapacity;
      if (tour.capacitySource !== "SHOPIFY_GROUP_SIZE") {
        tourChanges.capacitySource = "SHOPIFY_GROUP_SIZE";
      }
    }

    if (tour.scheduleSource !== "MANUAL") {
      const currentSlots = [...(tour.scheduleSlots || [])].sort().join("|");
      const nextSlots = [...derivedSchedule.slots].sort().join("|");
      if (currentSlots !== nextSlots) tourChanges.scheduleSlots = derivedSchedule.slots;
      if ((tour.scheduleSource || "UNCONFIGURED") !== derivedSchedule.source) {
        tourChanges.scheduleSource = derivedSchedule.source;
      }
    }

    if (Object.keys(tourChanges).length) {
      await prisma.tour.update({
        where: { id: tour.id },
        data: tourChanges,
      });
      updated += 1;
    }

    const variantByShopifyId = new Map(
      (tour.variants || [])
        .filter((variant) => variant.shopifyVariantId)
        .map((variant) => [variant.shopifyVariantId, variant]),
    );

    for (const variant of product.variants || []) {
      if (!variant?.id) continue;

      const current = variantByShopifyId.get(variant.id);
      const title = clean(variant.title);
      const sku = clean(variant.sku === "—" ? null : variant.sku);
      const active = variant.available !== false;
      const passengerCategory = passengerCategoryFromTitle(variant.title);
      const startTimeSlot = extractTimeSlot(variant.title);
      const price = Number.isFinite(Number(variant.priceRaw))
        ? Number(variant.priceRaw).toFixed(2)
        : null;

      if (!current) {
        await prisma.tourVariant.create({
          data: {
            tourId: tour.id,
            shopifyVariantId: variant.id,
            title,
            sku,
            passengerCategory,
            startTimeSlot,
            price,
            currency: productCurrency,
            active,
          },
        });
        variantsCreated += 1;
        continue;
      }

      const variantChanges = {};
      if ((current.title || null) !== title) variantChanges.title = title;
      if ((current.sku || null) !== sku) variantChanges.sku = sku;
      if ((current.passengerCategory || null) !== passengerCategory) {
        variantChanges.passengerCategory = passengerCategory;
      }
      if ((current.startTimeSlot || null) !== startTimeSlot) {
        variantChanges.startTimeSlot = startTimeSlot;
      }
      if (String(current.price ?? "") !== String(price ?? "")) {
        variantChanges.price = price;
      }
      if ((current.currency || null) !== productCurrency) {
        variantChanges.currency = productCurrency;
      }
      if (current.active !== active) variantChanges.active = active;

      if (Object.keys(variantChanges).length) {
        await prisma.tourVariant.update({
          where: { id: current.id },
          data: variantChanges,
        });
        variantsUpdated += 1;
      }
    }

    await syncCatalogAvailabilityBlocks(prisma, tour, product);
  }

  return { created, updated, variantsCreated, variantsUpdated };
}

export async function resolveTourByPlatformId(prisma, platform, externalId) {
  const id = clean(externalId);
  if (!id) return null;

  const normalizedPlatform = String(platform || "").toUpperCase();
  const externalField = PLATFORM_TOUR_FIELD[normalizedPlatform];

  const or = [{ id }];
  if (externalField) {
    or.push({ [externalField]: id });
  }

  return prisma.tour.findFirst({
    where: { OR: or },
    include: { variants: true },
  });
}

export function buildTourPassportUpdate(formData) {
  const fields = [
    "gygActivityId",
    "viatorProductCode",
    "headoutId",
    "civitatisId",
    "tripadvisorProductCode",
    "airbnbExperienceId",
  ];

  return Object.fromEntries(
    fields.map((field) => [field, clean(formData.get(field))]),
  );
}

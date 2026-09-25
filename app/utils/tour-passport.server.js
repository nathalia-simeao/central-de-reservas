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

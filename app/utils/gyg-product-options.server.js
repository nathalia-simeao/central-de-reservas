function clean(value) {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function deriveGygOperationalOptionTitle(variant = {}) {
  let title = normalizeWhitespace(variant.title || variant.sku || "");
  if (!title) return "PMY option";

  // Shopify variants often start with the passenger category. In GYG that
  // category belongs inside the option, not in the external product identity.
  title = title.replace(
    /^(?:adult|child|children|youth|young|senior|group)(?:\s*\([^)]*\))?\s*\/\s*/i,
    "",
  );

  return normalizeWhitespace(title) || "PMY option";
}

export function deriveGygOperationalOptionKey(title) {
  const normalized = normalizeWhitespace(title)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "option";
}

export function buildGygOperationalOptionGroups(variants = []) {
  const groups = new Map();

  for (const variant of variants || []) {
    if (!variant?.id) continue;

    const title = deriveGygOperationalOptionTitle(variant);
    const optionKey = deriveGygOperationalOptionKey(title);

    if (!groups.has(optionKey)) {
      groups.set(optionKey, {
        optionKey,
        title,
        active: false,
        variantIds: [],
        startTimes: new Set(),
        categories: new Set(),
      });
    }

    const group = groups.get(optionKey);
    group.variantIds.push(variant.id);
    if (variant.active !== false) group.active = true;

    const time = clean(variant.startTimeSlot);
    if (time) group.startTimes.add(time);

    const category = clean(variant.passengerCategory);
    if (category) group.categories.add(String(category).toUpperCase());
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      variantIds: [...new Set(group.variantIds)],
      startTimes: [...group.startTimes].sort(),
      categories: [...group.categories].sort(),
    }))
    .sort((left, right) => left.title.localeCompare(right.title));
}

export async function syncGygProductOptionsForTour(prisma, tourId) {
  const tour = await prisma.tour.findUnique({
    where: { id: tourId },
    include: {
      variants: true,
      gygProductOptions: true,
    },
  });
  if (!tour) return { created: 0, updated: 0, options: [] };

  const groups = buildGygOperationalOptionGroups(tour.variants || []);
  const existingByKey = new Map(
    (tour.gygProductOptions || []).map((option) => [option.optionKey, option]),
  );

  let created = 0;
  let updated = 0;
  const options = [];
  const groupedVariantIds = new Set();

  for (const group of groups) {
    let option = existingByKey.get(group.optionKey);

    if (!option) {
      option = await prisma.gygProductOption.create({
        data: {
          tourId,
          optionKey: group.optionKey,
          title: group.title,
          active: group.active,
        },
      });
      created += 1;
    } else {
      const changes = {};
      if (option.title !== group.title) changes.title = group.title;
      if (option.active !== group.active) changes.active = group.active;
      if (Object.keys(changes).length) {
        option = await prisma.gygProductOption.update({
          where: { id: option.id },
          data: changes,
        });
        updated += 1;
      }
    }

    for (const variantId of group.variantIds) groupedVariantIds.add(variantId);

    await prisma.tourVariant.updateMany({
      where: { id: { in: group.variantIds } },
      data: { gygProductOptionId: option.id },
    });

    options.push({
      ...option,
      supplierProductId: option.id,
      startTimes: group.startTimes,
      categories: group.categories,
      variantIds: group.variantIds,
    });
  }

  const staleOptionIds = (tour.gygProductOptions || [])
    .filter((option) => !groups.some((group) => group.optionKey === option.optionKey))
    .map((option) => option.id);

  if (staleOptionIds.length) {
    await prisma.gygProductOption.updateMany({
      where: { id: { in: staleOptionIds }, active: true },
      data: { active: false },
    });
  }

  const ungroupedVariantIds = (tour.variants || [])
    .filter((variant) => !groupedVariantIds.has(variant.id) && variant.gygProductOptionId)
    .map((variant) => variant.id);

  if (ungroupedVariantIds.length) {
    await prisma.tourVariant.updateMany({
      where: { id: { in: ungroupedVariantIds } },
      data: { gygProductOptionId: null },
    });
  }

  return { created, updated, options };
}

export async function resolveGygProduct(prisma, productId) {
  const id = clean(productId);
  if (!id) return null;

  const option = await prisma.gygProductOption.findFirst({
    where: {
      OR: [{ id }, { gygOptionId: id }],
    },
    include: {
      variants: true,
      tour: {
        include: {
          variants: true,
          gygProductOptions: {
            include: { variants: true },
          },
        },
      },
    },
  });

  if (option) {
    return {
      id: option.id,
      title: option.title,
      gygOptionId: option.gygOptionId,
      variants: option.variants || [],
      tour: option.tour,
      legacyTourProductId: false,
    };
  }

  // Backward compatibility for Phase 1/self-tests already configured with the
  // former Tour UUID. New mappings must use GygProductOption.id.
  const tour = await prisma.tour.findFirst({
    where: {
      OR: [{ id }, { gygActivityId: id }],
    },
    include: {
      variants: true,
      gygProductOptions: {
        include: { variants: true },
      },
    },
  });

  if (tour) {
    return {
      id: tour.id,
      title: tour.title,
      gygOptionId: null,
      variants: tour.variants || [],
      tour,
      legacyTourProductId: true,
    };
  }

  return null;
}

export function gygProductScheduleSlots(product) {
  const fromVariants = [...new Set(
    (product?.variants || [])
      .filter((variant) => variant?.active !== false)
      .map((variant) => clean(variant.startTimeSlot))
      .filter(Boolean),
  )].sort();

  if (fromVariants.length) return fromVariants;

  return product?.legacyTourProductId
    ? [...new Set(product?.tour?.scheduleSlots || [])].sort()
    : [];
}

export function gygProductCategories(product) {
  return new Set(
    (product?.variants || [])
      .filter((variant) => variant?.active !== false && variant.passengerCategory)
      .map((variant) => String(variant.passengerCategory).trim().toUpperCase()),
  );
}

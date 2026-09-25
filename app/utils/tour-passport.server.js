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
    let tour = byProductId.get(product.id);

    if (!tour) {
      tour = await prisma.tour.create({
        data: {
          title: product.name,
          productType,
          shopifyStatus,
          shopifyProductId: product.id,
          variants: {
            create: (product.variants || [])
              .filter((variant) => variant?.id)
              .map((variant) => ({
                shopifyVariantId: variant.id,
                title: clean(variant.title),
                sku: clean(variant.sku === "—" ? null : variant.sku),
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

      if (!current) {
        await prisma.tourVariant.create({
          data: {
            tourId: tour.id,
            shopifyVariantId: variant.id,
            title,
            sku,
            active,
          },
        });
        variantsCreated += 1;
        continue;
      }

      const variantChanges = {};
      if ((current.title || null) !== title) variantChanges.title = title;
      if ((current.sku || null) !== sku) variantChanges.sku = sku;
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

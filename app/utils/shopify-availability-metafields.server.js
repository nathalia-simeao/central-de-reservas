import { blockTargetsPlatform } from "./availability.server";

const NAMESPACE = "custom";
const BLOCKED_DAYS_KEY = "blocked_days";
const BLOCKED_DATES_KEY = "blocked_specific_dates";

function clean(value) {
  return String(value ?? "").trim();
}

function normalizeTimeSlot(value) {
  const raw = clean(value).toUpperCase();
  return !raw || raw === "ALL" ? "ALL" : raw;
}

function blockKey(block) {
  if (block?.date) {
    const date = block.date instanceof Date ? block.date : new Date(block.date);
    if (!Number.isNaN(date.getTime())) {
      return `date:${date.toISOString().slice(0, 10)}`;
    }
  }
  if (block?.dayOfWeek != null && clean(block.dayOfWeek) !== "") {
    return `weekday:${clean(block.dayOfWeek)}`;
  }
  return null;
}

function valueForMetafield(type, values) {
  const normalized = [...new Set(values.map((value) => clean(value)).filter(Boolean))];
  if (String(type || "").startsWith("list.")) {
    return JSON.stringify(normalized);
  }
  return normalized.join(",");
}

async function currentAvailabilityMetafields(admin, productId) {
  const response = await admin.graphql(
    `
      query PmyAvailabilityMetafields($id: ID!) {
        product(id: $id) {
          id
          blockedDays: metafield(namespace: "custom", key: "blocked_days") {
            id
            type
            value
          }
          blockedDates: metafield(namespace: "custom", key: "blocked_specific_dates") {
            id
            type
            value
          }
        }
      }
    `,
    { variables: { id: productId } },
  );
  const payload = await response.json();
  if (payload?.errors?.length) {
    throw new Error(
      payload.errors.map((item) => item.message).filter(Boolean).join("; "),
    );
  }
  if (!payload?.data?.product) {
    throw new Error("Produto Shopify não encontrado para sincronizar disponibilidade.");
  }
  return payload.data.product;
}

async function setAvailabilityMetafields(admin, productId, values) {
  const current = await currentAvailabilityMetafields(admin, productId);
  const inputs = [
    {
      ownerId: productId,
      namespace: NAMESPACE,
      key: BLOCKED_DAYS_KEY,
      type: current.blockedDays?.type || "single_line_text_field",
      value: valueForMetafield(current.blockedDays?.type, values.weekdays),
    },
    {
      ownerId: productId,
      namespace: NAMESPACE,
      key: BLOCKED_DATES_KEY,
      type: current.blockedDates?.type || "single_line_text_field",
      value: valueForMetafield(current.blockedDates?.type, values.dates),
    },
  ];

  const response = await admin.graphql(
    `
      mutation PmySetAvailabilityMetafields($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            type
            value
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `,
    { variables: { metafields: inputs } },
  );
  const payload = await response.json();
  if (payload?.errors?.length) {
    throw new Error(
      payload.errors.map((item) => item.message).filter(Boolean).join("; "),
    );
  }
  const userErrors = payload?.data?.metafieldsSet?.userErrors || [];
  if (userErrors.length) {
    throw new Error(
      userErrors.map((item) => item.message).filter(Boolean).join("; "),
    );
  }

  return payload?.data?.metafieldsSet?.metafields || [];
}

export async function syncShopifyAvailabilityMetafields(
  prisma,
  admin,
  tourId,
) {
  if (!tourId || !admin) return { synced: false, reason: "MISSING_CONTEXT" };

  const tour = await prisma.tour.findUnique({
    where: { id: tourId },
    select: {
      id: true,
      shopifyProductId: true,
      shopifySnapshot: true,
    },
  });
  if (!tour?.shopifyProductId) {
    return { synced: false, reason: "SHOPIFY_PRODUCT_NOT_MAPPED" };
  }

  const blocks = await prisma.blockedDate.findMany({
    where: {
      tourId,
      active: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // The storefront's existing product fields describe whole-day/weekday
  // blackouts. Slot-specific rules remain enforced by the Central availability
  // API and the signed checkout hold, without incorrectly hiding the full day.
  const eligible = blocks.filter(
    (block) =>
      normalizeTimeSlot(block.timeSlot) === "ALL" &&
      blockTargetsPlatform(block, "shopify"),
  );

  const centralKeys = new Set(
    eligible
      .filter((block) => block.source !== "SHOPIFY_CATALOG")
      .map(blockKey)
      .filter(Boolean),
  );

  const duplicateCatalogIds = eligible
    .filter(
      (block) =>
        block.source === "SHOPIFY_CATALOG" &&
        centralKeys.has(blockKey(block)),
    )
    .map((block) => block.id);

  if (duplicateCatalogIds.length) {
    await prisma.blockedDate.updateMany({
      where: { id: { in: duplicateCatalogIds } },
      data: {
        active: false,
        syncStatus: "MIRRORED_BY_CENTRAL",
      },
    });
  }

  const effective = eligible.filter(
    (block) => !duplicateCatalogIds.includes(block.id),
  );
  const weekdays = effective
    .filter((block) => block.dayOfWeek != null)
    .map((block) => clean(block.dayOfWeek))
    .filter((value) => /^[0-6]$/.test(value))
    .sort();
  const dates = effective
    .filter((block) => block.date)
    .map((block) => new Date(block.date).toISOString().slice(0, 10))
    .filter((value) => /^20\d{2}-\d{2}-\d{2}$/.test(value))
    .sort();

  const metafields = await setAvailabilityMetafields(admin, tour.shopifyProductId, {
    weekdays,
    dates,
  });

  const snapshot =
    tour.shopifySnapshot &&
    typeof tour.shopifySnapshot === "object" &&
    !Array.isArray(tour.shopifySnapshot)
      ? tour.shopifySnapshot
      : {};
  const nextMetafields = {
    ...(snapshot.metafields || {}),
    [BLOCKED_DAYS_KEY]: weekdays.join(","),
    [BLOCKED_DATES_KEY]: dates.join(","),
  };

  await prisma.tour.update({
    where: { id: tourId },
    data: {
      shopifySnapshot: {
        ...snapshot,
        metafields: nextMetafields,
      },
    },
  });

  return {
    synced: true,
    productId: tour.shopifyProductId,
    weekdays,
    dates,
    metafields,
  };
}

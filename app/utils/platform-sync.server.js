import crypto from "node:crypto";
import {
  isOperationalShopifyProduct,
  syncShopifyCatalogToMasterTours,
} from "./tour-passport.server";
import { processShopifyOrderWebhook } from "./shopify-orders.server";
import { notifyGygTourAvailabilityWindow } from "./gyg-v1.server";

function clean(value) {
  return String(value ?? "").trim();
}

function scheduleFromProduct(product) {
  const configured = Array.isArray(product?.scheduleSlots)
    ? product.scheduleSlots.filter(Boolean).map(String).sort()
    : [];
  return configured;
}

function normalizedPlatform(value) {
  const raw = clean(value).toLowerCase();
  if (raw === "gyg") return "getyourguide";
  return raw;
}

function mappedFieldForPlatform(platform) {
  return {
    shopify: "shopifyProductId",
    getyourguide: "gygActivityId",
    viator: "viatorProductCode",
    headout: "headoutId",
    civitatis: "civitatisId",
  }[platform] || null;
}

function providerCode(platform) {
  return {
    shopify: "SHOPIFY",
    getyourguide: "GETYOURGUIDE",
    viator: "VIATOR",
    headout: "HEADOUT",
    civitatis: "CIVITATIS",
  }[platform] || String(platform || "").toUpperCase();
}

function productItemFromTour(tour, platform) {
  const field = mappedFieldForPlatform(platform);
  return {
    id: field ? tour[field] || tour.id : tour.id,
    name: tour.title,
    active: tour.shopifyStatus !== "INACTIVE",
    synced: Boolean(field ? tour[field] : true),
    sku: "—",
    price: "—",
    variants: tour.variants || [],
    scheduleSlots: tour.scheduleSlots || [],
    masterTourId: tour.id,
  };
}

async function fetchShopifyCatalog(admin) {
  const response = await admin.graphql(`
    query ManualPlatformSyncCatalog {
      shop { currencyCode }
      products(first: 100) {
        edges {
          node {
            id
            title
            productType
            status
            description
            featuredImage { url altText }
            collections(first: 5) {
              edges { node { id title } }
            }
            variants(first: 50) {
              edges {
                node {
                  id
                  title
                  sku
                  price
                  compareAtPrice
                  availableForSale
                }
              }
            }
            metafields(first: 30, namespace: "custom") {
              edges { node { key value } }
            }
          }
        }
      }
    }
  `);

  const payload = await response.json();
  if (payload?.errors?.length) {
    throw new Error(payload.errors.map((item) => item.message).join("; "));
  }

  const currency = payload?.data?.shop?.currencyCode || "EUR";
  return (payload?.data?.products?.edges || []).map(({ node }) => {
    const variants = (node.variants?.edges || []).map(({ node: variant }) => ({
      id: variant.id,
      title: variant.title,
      sku: variant.sku || "—",
      price: variant.price ? `€${Number(variant.price).toFixed(0)}` : "—",
      priceRaw: Number(variant.price || 0),
      compareAtPrice: variant.compareAtPrice
        ? `€${Number(variant.compareAtPrice).toFixed(0)}`
        : null,
      available: variant.availableForSale,
    }));

    const metafields = {};
    for (const { node: metafield } of node.metafields?.edges || []) {
      metafields[metafield.key] = metafield.value;
    }

    const collections = (node.collections?.edges || []).map(({ node: collection }) => ({
      id: collection.id,
      title: collection.title,
    }));

    const scheduleRaw =
      metafields.schedule || metafields.times || metafields.horarios || "";
    const scheduleSlots = scheduleRaw
      ? scheduleRaw.split(/[,;|]/).map((item) => item.trim()).filter(Boolean)
      : [];

    const minPrice = variants.length
      ? Math.min(...variants.map((variant) => variant.priceRaw))
      : 0;

    return {
      id: node.id,
      name: node.title,
      productType: node.productType || null,
      description: node.description || "",
      sku: variants[0]?.sku || "—",
      price: minPrice > 0 ? `€${minPrice.toFixed(0)}` : "—",
      priceRaw: minPrice,
      active: node.status === "ACTIVE",
      synced: true,
      image: node.featuredImage?.url || null,
      imageAlt: node.featuredImage?.altText || node.title,
      variants,
      collections,
      scheduleSlots,
      metafields,
      currency,
    };
  });
}

function graphOrderToWebhookPayload(order) {
  const financial = clean(order?.displayFinancialStatus)
    .toLowerCase()
    .replace(/\s+/g, "_");

  return {
    admin_graphql_api_id: order.id,
    name: order.name,
    email: order.email || null,
    phone: order.phone || null,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    cancelled_at: order.cancelledAt || null,
    cancel_reason: order.cancelledAt ? "cancelled" : null,
    financial_status: financial,
    currency: order.currencyCode || "EUR",
    customer: order.customer
      ? {
          first_name: order.customer.firstName,
          last_name: order.customer.lastName,
          email: order.customer.email,
          phone: order.customer.phone,
        }
      : null,
    billing_address: order.billingAddress
      ? {
          first_name: order.billingAddress.firstName,
          last_name: order.billingAddress.lastName,
          name: order.billingAddress.name,
          phone: order.billingAddress.phone,
        }
      : null,
    shipping_address: order.shippingAddress
      ? {
          first_name: order.shippingAddress.firstName,
          last_name: order.shippingAddress.lastName,
          name: order.shippingAddress.name,
          phone: order.shippingAddress.phone,
        }
      : null,
    note_attributes: (order.customAttributes || []).map((item) => ({
      name: item.key,
      value: item.value,
    })),
    line_items: (order.lineItems?.edges || []).map(({ node: line }) => ({
      admin_graphql_api_id: line.id,
      title: line.title || line.name,
      name: line.name || line.title,
      quantity: line.quantity,
      product_id: line.variant?.product?.id || null,
      variant_id: line.variant?.id || null,
      variant_title: line.variant?.title || null,
      price: line.originalUnitPriceSet?.shopMoney?.amount || "0",
      properties: (line.customAttributes || []).map((item) => ({
        name: item.key,
        value: item.value,
      })),
    })),
  };
}

async function fetchRecentShopifyOrders(admin, limit = 50) {
  const response = await admin.graphql(`
    query ManualPlatformSyncOrders($first: Int!) {
      orders(first: $first, sortKey: UPDATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            email
            phone
            createdAt
            updatedAt
            cancelledAt
            currencyCode
            displayFinancialStatus
            customer {
              firstName
              lastName
              email
              phone
            }
            billingAddress {
              firstName
              lastName
              name
              phone
            }
            shippingAddress {
              firstName
              lastName
              name
              phone
            }
            customAttributes { key value }
            lineItems(first: 100) {
              edges {
                node {
                  id
                  name
                  title
                  quantity
                  originalUnitPriceSet {
                    shopMoney { amount currencyCode }
                  }
                  customAttributes { key value }
                  variant {
                    id
                    title
                    product { id }
                  }
                }
              }
            }
          }
        }
      }
    }
  `, { variables: { first: Math.max(1, Math.min(100, Number(limit) || 50)) } });

  const payload = await response.json();
  if (payload?.errors?.length) {
    throw new Error(payload.errors.map((item) => item.message).join("; "));
  }

  return (payload?.data?.orders?.edges || []).map(({ node }) =>
    graphOrderToWebhookPayload(node),
  );
}

function compareShopifyProducts(products, tours) {
  const eligible = products.filter(
    (product) => product?.id && !isOperationalShopifyProduct(product),
  );
  const byShopifyId = new Map(
    tours
      .filter((tour) => tour.shopifyProductId)
      .map((tour) => [tour.shopifyProductId, tour]),
  );
  const liveIds = new Set(eligible.map((product) => product.id));

  const missingInCentral = [];
  const changed = [];

  for (const product of eligible) {
    const tour = byShopifyId.get(product.id);
    if (!tour) {
      missingInCentral.push({
        id: product.id,
        name: product.name,
        reason: "Produto existe no Shopify e ainda não estava no cadastro mestre.",
      });
      continue;
    }

    const reasons = [];
    if (tour.title !== product.name) reasons.push("nome");
    if ((tour.shopifyStatus || null) !== (product.active ? "ACTIVE" : "INACTIVE")) {
      reasons.push("status");
    }

    const centralSchedule = [...(tour.scheduleSlots || [])].sort().join("|");
    const remoteSchedule = [...scheduleFromProduct(product)].sort().join("|");
    if (tour.scheduleSource !== "MANUAL" && centralSchedule !== remoteSchedule) {
      reasons.push("horários");
    }

    if (reasons.length) {
      changed.push({
        id: product.id,
        name: product.name,
        reason: `Diferença em: ${reasons.join(", ")}.`,
      });
    }
  }

  const missingInChannel = tours
    .filter((tour) => tour.shopifyProductId && !liveIds.has(tour.shopifyProductId))
    .map((tour) => ({
      id: tour.shopifyProductId,
      name: tour.title,
      reason: "Tour mestre aponta para um produto que não voltou na consulta ao Shopify.",
    }));

  return { eligible, missingInCentral, missingInChannel, changed };
}

async function writeManualSyncAudit(prisma, provider, result, status = "PROCESSED") {
  try {
    await prisma.integrationEvent.create({
      data: {
        provider,
        externalEventId: `manual-sync:${crypto.randomUUID()}`,
        topic: "MANUAL_SYNC",
        status,
        payload: {
          platform: result.platform,
          mode: result.mode,
          checkedAt: result.checkedAt,
        },
        result,
        error: status === "FAILED" ? result.error || null : null,
        processedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[PMY] unable to write manual sync audit", error);
  }
}

async function syncShopify(prisma, admin) {
  const checkedAt = new Date().toISOString();
  const [products, toursBefore, bookingsBefore] = await Promise.all([
    fetchShopifyCatalog(admin),
    prisma.tour.findMany({
      where: { shopifyProductId: { not: null } },
      include: { variants: true },
      orderBy: { title: "asc" },
    }),
    prisma.booking.count({ where: { platform: "SHOPIFY" } }),
  ]);

  const comparison = compareShopifyProducts(products, toursBefore);
  const catalogSync = await syncShopifyCatalogToMasterTours(prisma, products);

  const orders = await fetchRecentShopifyOrders(admin, 50);
  let bookingRowsTouched = 0;
  let reservationIssues = 0;
  let ignoredLines = 0;

  for (const order of orders) {
    const result = await processShopifyOrderWebhook(prisma, {
      payload: order,
      topic: order.cancelled_at ? "ORDERS_CANCELLED" : "ORDERS_UPDATED",
      sourceEventId: `manual-sync:${order.admin_graphql_api_id}:${order.updated_at || "unknown"}`,
    });
    bookingRowsTouched +=
      Number(result?.bookings?.length || 0) +
      Number(result?.cancelledBookings || 0) +
      Number(result?.cancelledRemovedBookings || 0);
    reservationIssues += Number(result?.issues?.length || 0);
    ignoredLines += Number(result?.ignored?.length || 0);
  }

  const [toursAfter, bookingsAfter] = await Promise.all([
    prisma.tour.findMany({
      where: { shopifyProductId: { not: null } },
      include: { variants: true },
      orderBy: { title: "asc" },
    }),
    prisma.booking.count({ where: { platform: "SHOPIFY" } }),
  ]);

  const differences =
    comparison.missingInCentral.length +
    comparison.missingInChannel.length +
    comparison.changed.length +
    reservationIssues;

  const result = {
    platform: "shopify",
    mode: "LIVE_API",
    checkedAt,
    scopeNote: "Catálogo completo (até 100 produtos) e os 50 pedidos mais recentemente atualizados no Shopify.",
    differences,
    products: {
      remote: comparison.eligible.length,
      centralBefore: toursBefore.length,
      centralAfter: toursAfter.length,
      created: catalogSync.created,
      updated: catalogSync.updated,
      variantsCreated: catalogSync.variantsCreated,
      variantsUpdated: catalogSync.variantsUpdated,
      missingInCentral: comparison.missingInCentral,
      missingInChannel: comparison.missingInChannel,
      changed: comparison.changed,
      items: products,
    },
    reservations: {
      remoteChecked: orders.length,
      centralBefore: bookingsBefore,
      centralAfter: bookingsAfter,
      rowsTouched: bookingRowsTouched,
      issues: reservationIssues,
      ignoredLines,
    },
    availability: {
      checked: comparison.eligible.length,
      differences: comparison.changed.filter((item) =>
        String(item.reason).includes("horários"),
      ).length,
      detail:
        "Horários e status de venda do Shopify foram comparados com o Tour mestre e reconciliados quando a origem não era MANUAL.",
    },
    notes: [
      comparison.missingInChannel.length
        ? `${comparison.missingInChannel.length} tour(s) da Central apontam para produtos que não voltaram na consulta ao Shopify.`
        : "Nenhum produto mapeado ficou ausente da consulta ao Shopify.",
      reservationIssues
        ? `${reservationIssues} linha(s) de pedido precisam de revisão porque faltou data/horário utilizável.`
        : "Pedidos consultados sem divergências estruturais de data/horário.",
    ],
  };

  await writeManualSyncAudit(prisma, "SHOPIFY", result);
  return result;
}

async function syncGetYourGuide(prisma) {
  const checkedAt = new Date().toISOString();
  const tours = await prisma.tour.findMany({
    where: { gygActivityId: { not: null } },
    include: { variants: true },
    orderBy: { title: "asc" },
  });
  const bookings = await prisma.booking.count({
    where: { platform: "GETYOURGUIDE" },
  });

  const deliveries = await Promise.all(
    tours.map(async (tour) => {
      const result = await notifyGygTourAvailabilityWindow({
        tourId: tour.id,
        days: 30,
      });
      return {
        tourId: tour.id,
        title: tour.title,
        gygActivityId: tour.gygActivityId,
        sent: Boolean(result?.sent),
        reason: result?.reason || null,
        status: result?.status || null,
        error: result?.error || null,
      };
    }),
  );

  const failed = deliveries.filter(
    (item) => !item.sent && ![
      "PUSH_NOT_REQUIRED",
      "NO_FUTURE_SLOTS",
      "TOUR_SCHEDULE_NOT_CONFIGURED",
    ].includes(item.reason),
  );
  const scheduleMissing = tours.filter(
    (tour) => !Array.isArray(tour.scheduleSlots) || tour.scheduleSlots.length === 0,
  );

  const result = {
    platform: "getyourguide",
    mode: "PUSH_API",
    checkedAt,
    scopeNote:
      "A Supplier API do GYG não oferece leitura do catálogo/reservas do parceiro nesta integração. A verificação real envia novamente a disponibilidade dos próximos 30 dias e compara mapeamentos locais.",
    differences: failed.length + scheduleMissing.length,
    products: {
      remote: null,
      centralBefore: tours.length,
      centralAfter: tours.length,
      missingInCentral: [],
      missingInChannel: [],
      changed: scheduleMissing.map((tour) => ({
        id: tour.gygActivityId,
        name: tour.title,
        reason: "Tour mapeado no GYG sem horários configurados na Central.",
      })),
      items: tours.map((tour) => productItemFromTour(tour, "getyourguide")),
    },
    reservations: {
      remoteChecked: null,
      centralBefore: bookings,
      centralAfter: bookings,
      rowsTouched: 0,
      issues: 0,
      ignoredLines: 0,
    },
    availability: {
      checked: tours.length,
      pushed: deliveries.filter((item) => item.sent).length,
      failed: failed.length,
      differences: failed.length + scheduleMissing.length,
      deliveries,
      detail:
        "A Central tentou publicar a janela de disponibilidade de 30 dias para cada tour mapeado no GYG.",
    },
    notes: [
      "Reservas do GYG entram na Central pelas chamadas da Supplier API; não existe leitura remota de reservas implementada para o botão.",
      failed.length
        ? `${failed.length} envio(s) ao GYG não foram aceitos e aparecem como diferença.`
        : "Nenhuma falha de envio de disponibilidade detectada.",
    ],
  };

  await writeManualSyncAudit(prisma, "GETYOURGUIDE", result);
  return result;
}

async function syncPullSupplier(prisma, platform) {
  const checkedAt = new Date().toISOString();
  const field = mappedFieldForPlatform(platform);
  const provider = providerCode(platform);

  const tours = await prisma.tour.findMany({
    include: { variants: true },
    orderBy: { title: "asc" },
  });
  const activeTours = tours.filter((tour) => tour.shopifyStatus !== "INACTIVE");
  const mapped = field ? activeTours.filter((tour) => Boolean(tour[field])) : activeTours;
  const scheduleMissing = mapped.filter(
    (tour) => !Array.isArray(tour.scheduleSlots) || tour.scheduleSlots.length === 0,
  );
  const bookingCount = await prisma.booking.count({ where: { platform: provider } });

  const missingMapping =
    platform === "viator" || platform === "civitatis"
      ? []
      : activeTours.filter((tour) => field && !tour[field]);

  const differences = scheduleMissing.length + missingMapping.length;
  const result = {
    platform,
    mode: "SUPPLIER_PULL",
    checkedAt,
    scopeNote:
      "Este canal usa a Central como Supplier API e consulta produtos/disponibilidade diretamente na PMY. Não há endpoint upstream configurado para listar o catálogo remoto pelo botão.",
    differences,
    products: {
      remote: null,
      centralBefore: mapped.length,
      centralAfter: mapped.length,
      missingInCentral: [],
      missingInChannel: missingMapping.map((tour) => ({
        id: tour.id,
        name: tour.title,
        reason: `Tour sem identificador de ${provider} no passaporte mestre.`,
      })),
      changed: scheduleMissing.map((tour) => ({
        id: field ? tour[field] || tour.id : tour.id,
        name: tour.title,
        reason: "Tour sem horários configurados para responder disponibilidade.",
      })),
      items: mapped.map((tour) => productItemFromTour(tour, platform)),
    },
    reservations: {
      remoteChecked: null,
      centralBefore: bookingCount,
      centralAfter: bookingCount,
      rowsTouched: 0,
      issues: 0,
      ignoredLines: 0,
    },
    availability: {
      checked: mapped.length,
      pushed: null,
      failed: 0,
      differences: scheduleMissing.length,
      detail:
        "A disponibilidade é calculada em tempo real quando o canal consulta os endpoints Supplier da PMY.",
    },
    notes: [
      "A sincronização manual executou uma auditoria real do catálogo mestre, reservas recebidas e prontidão da disponibilidade.",
      "A comparação remota completa dependerá de um endpoint de leitura fornecido pelo canal, caso seja liberado à conta PMY.",
    ],
  };

  await writeManualSyncAudit(prisma, provider, result);
  return result;
}

export async function syncPlatformNow(prisma, admin, platformValue) {
  const platform = normalizedPlatform(platformValue);

  if (platform === "shopify") return syncShopify(prisma, admin);
  if (platform === "getyourguide") return syncGetYourGuide(prisma);
  if (["viator", "civitatis", "headout"].includes(platform)) {
    return syncPullSupplier(prisma, platform);
  }

  throw new Error("Plataforma não suportada para sincronização manual.");
}

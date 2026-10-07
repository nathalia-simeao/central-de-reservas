function asString(value, max = 255) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text.slice(0, max) : null;
}

function safeLineItems(payload) {
  const items = Array.isArray(payload?.line_items)
    ? payload.line_items
    : Array.isArray(payload?.lineItems)
      ? payload.lineItems
      : [];

  return items.slice(0, 50).map((item) => ({
    id: asString(item?.admin_graphql_api_id || item?.id, 180),
    productId: asString(item?.product_id || item?.product?.id, 180),
    variantId: asString(item?.variant_id || item?.variant?.id, 180),
    sku: asString(item?.sku, 120),
    title: asString(item?.title || item?.name, 180),
    variantTitle: asString(item?.variant_title || item?.variantTitle, 180),
    quantity: Number.isFinite(Number(item?.quantity)) ? Number(item.quantity) : null,
    price: asString(
      item?.price ?? item?.price_set?.shop_money?.amount ?? item?.original_price,
      40,
    ),
  }));
}

function safeAttributes(payload) {
  const entries = Array.isArray(payload?.note_attributes)
    ? payload.note_attributes
    : Array.isArray(payload?.customAttributes)
      ? payload.customAttributes
      : [];

  const allowed = new Set([
    "date",
    "time",
    "language",
    "idioma",
    "PMY Hold ID",
    "_PMY Hold ID",
    "PMY Commercial Source",
    "PMY Session",
    "PMY Last Source",
    "PMY First Source",
    "order_referrer_source",
    "order_referrer_name",
    "order_referrer_channel",
    "PMY UTM Source",
    "PMY UTM Medium",
    "PMY UTM Campaign",
    "PMY UTM Term",
    "PMY UTM Content",
    "PMY UTM ID",
    "PMY GCLID",
    "PMY GBRAID",
    "PMY WBRAID",
    "PMY FBCLID",
    "PMY MSCLKID",
    "PMY TTCLID",
  ]);

  return entries
    .filter((entry) => allowed.has(String(entry?.name ?? entry?.key ?? "")))
    .slice(0, 50)
    .map((entry) => ({
      name: asString(entry?.name ?? entry?.key, 120),
      value: asString(entry?.value, 500),
    }));
}

export function minimizeShopifyOrderPayload(payload) {
  if (!payload || typeof payload !== "object") return null;

  return {
    kind: "SHOPIFY_ORDER_MINIMIZED",
    id: asString(payload?.admin_graphql_api_id || payload?.id, 180),
    name: asString(payload?.name, 120),
    financialStatus: asString(payload?.financial_status, 80),
    fulfillmentStatus: asString(payload?.fulfillment_status, 80),
    currency: asString(payload?.currency || payload?.current_currency, 8),
    totalPrice: asString(payload?.current_total_price ?? payload?.total_price, 40),
    createdAt: asString(payload?.created_at, 80),
    updatedAt: asString(payload?.updated_at, 80),
    processedAt: asString(payload?.processed_at, 80),
    cancelledAt: asString(payload?.cancelled_at, 80),
    cancelReason: asString(payload?.cancel_reason, 120),
    lineItems: safeLineItems(payload),
    attributes: safeAttributes(payload),
  };
}

export function minimizeCheckoutHoldPayload({
  kind,
  shop = null,
  requestId = null,
  draftOrderId = null,
  draftOrderName = null,
  invoiceUrl = null,
  date = null,
  time = null,
  language = null,
  productId = null,
  tourTitle = null,
  lineItems = [],
  groupKeys = [],
  attribution = null,
} = {}) {
  return {
    kind: asString(kind, 80),
    shop: asString(shop, 180),
    requestId: asString(requestId, 180),
    draftOrderId: asString(draftOrderId, 180),
    draftOrderName: asString(draftOrderName, 120),
    invoiceUrl: asString(invoiceUrl, 2048),
    date: asString(date, 40),
    time: asString(time, 40),
    language: asString(language, 80),
    productId: asString(productId, 180),
    tourTitle: asString(tourTitle, 180),
    groupKeys: Array.isArray(groupKeys)
      ? groupKeys.slice(0, 20).map((value) => asString(value, 180)).filter(Boolean)
      : [],
    lineItems: Array.isArray(lineItems)
      ? lineItems.slice(0, 50).map((item) => ({
          variantId: asString(item?.variantId, 180),
          quantity: Number.isFinite(Number(item?.quantity)) ? Number(item.quantity) : null,
        }))
      : [],
    attribution:
      attribution && typeof attribution === "object"
        ? {
            commercialSource: asString(attribution.commercialSource, 120),
            source: asString(attribution.source, 120),
            medium: asString(attribution.medium, 120),
            campaign: asString(attribution.campaign || attribution.utmCampaign, 180),
          }
        : null,
  };
}

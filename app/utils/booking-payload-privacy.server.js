function textValue(value, maxLength = 240) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, current]) =>
      current !== null &&
      current !== undefined &&
      current !== "" &&
      !(Array.isArray(current) && current.length === 0)
    ),
  );
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function quantity(value) {
  const parsed = Number.parseInt(value ?? 0, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export function minimizeShopifyOrderPayload(payload, topic = null) {
  const lineItems = (Array.isArray(payload?.line_items) ? payload.line_items : [])
    .map((item) => compactObject({
      id: textValue(item?.admin_graphql_api_id || item?.id, 160),
      productId: textValue(item?.product_id, 120),
      variantId: textValue(item?.variant_id, 120),
      sku: textValue(item?.sku, 120),
      quantity: quantity(item?.quantity),
    }));

  return compactObject({
    kind: "SHOPIFY_ORDER_AUDIT",
    topic: textValue(topic, 80),
    id: textValue(payload?.admin_graphql_api_id || payload?.id, 180),
    name: textValue(payload?.name, 80),
    financialStatus: textValue(payload?.financial_status, 80),
    fulfillmentStatus: textValue(payload?.fulfillment_status, 80),
    cancelReason: textValue(payload?.cancel_reason, 160),
    cancelledAt: textValue(payload?.cancelled_at, 80),
    createdAt: textValue(payload?.created_at, 80),
    updatedAt: textValue(payload?.updated_at, 80),
    currency: textValue(payload?.currency, 8),
    totalPrice: safeNumber(payload?.current_total_price ?? payload?.total_price),
    lineItems,
  });
}

export function minimizeGygPayload(data, operation) {
  const bookingItems = (Array.isArray(data?.bookingItems) ? data.bookingItems : [])
    .map((item) => compactObject({
      category: textValue(item?.category, 40),
      count: quantity(item?.count ?? item?.quantity ?? 1),
    }));

  return compactObject({
    kind: "GYG_BOOKING_AUDIT",
    operation: textValue(operation, 80),
    productId: textValue(data?.productId, 160),
    reservationReference: textValue(data?.reservationReference, 160),
    gygBookingReference: textValue(data?.gygBookingReference, 160),
    bookingReference: textValue(data?.bookingReference, 160),
    dateTime: textValue(data?.dateTime, 80),
    currency: textValue(data?.currency, 8),
    bookingItems,
  });
}

export function minimizeViatorPayload(data, operation) {
  const travellerMix = data?.TravellerMix && typeof data.TravellerMix === "object"
    ? compactObject({
        Adult: quantity(data.TravellerMix.Adult),
        Child: quantity(data.TravellerMix.Child),
        Youth: quantity(data.TravellerMix.Youth),
        Senior: quantity(data.TravellerMix.Senior),
        Infant: quantity(data.TravellerMix.Infant),
      })
    : null;

  const tickets = (Array.isArray(data?.tickets) ? data.tickets : [])
    .map((item) => compactObject({
      type: textValue(item?.type, 40),
      quantity: quantity(item?.quantity),
    }));

  return compactObject({
    kind: "VIATOR_BOOKING_AUDIT",
    operation: textValue(operation, 80),
    bookingReference: textValue(data?.BookingReference || data?.bookingReference, 180),
    holdReference: textValue(data?.AvailabilityHoldReference || data?.reference, 180),
    externalReference: textValue(data?.ExternalReference, 180),
    supplierProductCode: textValue(data?.SupplierProductCode || data?.productCode || data?.productId, 180),
    travelDate: textValue(data?.TravelDate || data?.travelDate, 40),
    startTime: textValue(data?.TourDepartureTime || data?.startTime, 40),
    currency: textValue(data?.CurrencyCode || data?.currency, 8),
    amount: safeNumber(data?.Amount ?? data?.amount),
    travellerMix,
    tickets,
  });
}

export function minimizeCivitatisPayload(body, operation, environment = null) {
  const unitItems = (Array.isArray(body?.unitItems) ? body.unitItems : [])
    .map((item) => compactObject({
      unitId: textValue(item?.unitId, 80),
    }));

  const units = (Array.isArray(body?.units) ? body.units : [])
    .map((item) => compactObject({
      id: textValue(item?.id, 80),
      quantity: quantity(item?.quantity),
    }));

  return compactObject({
    kind: "CIVITATIS_BOOKING_AUDIT",
    operation: textValue(operation, 80),
    environment: textValue(environment, 40),
    productId: textValue(body?.productId, 180),
    optionId: textValue(body?.optionId, 180),
    availabilityId: textValue(body?.availabilityId, 500),
    resellerReference: textValue(body?.resellerReference, 180),
    localDateStart: textValue(body?.localDateStart, 40),
    localDateEnd: textValue(body?.localDateEnd, 40),
    unitItems,
    units,
  });
}

export function containsDirectCustomerPii(value) {
  if (!value || typeof value !== "object") return false;
  const serialized = JSON.stringify(value).toLowerCase();
  return [
    "emailaddress",
    "phonenumber",
    "firstname",
    "lastname",
    "fullname",
    "\"email\"",
    "\"phone\"",
    "\"customer\"",
    "\"travelers\"",
    "\"traveller\"",
    "\"contact\"",
    "shipping_address",
    "billing_address",
  ].some((needle) => serialized.includes(needle));
}

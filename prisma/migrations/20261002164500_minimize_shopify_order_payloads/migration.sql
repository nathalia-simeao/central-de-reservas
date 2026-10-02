-- Minimize historical Shopify order payloads that duplicated customer PII.
-- Canonical customer fields remain in Booking; operational identifiers remain here.

UPDATE "Booking"
SET "rawPayload" = jsonb_strip_nulls(
  jsonb_build_object(
    'kind', 'SHOPIFY_ORDER_MINIMIZED_LEGACY',
    'id', COALESCE("rawPayload"->>'admin_graphql_api_id', "rawPayload"->>'id'),
    'name', "rawPayload"->>'name',
    'financialStatus', "rawPayload"->>'financial_status',
    'fulfillmentStatus', "rawPayload"->>'fulfillment_status',
    'currency', COALESCE("rawPayload"->>'currency', "rawPayload"->>'current_currency'),
    'totalPrice', COALESCE("rawPayload"->>'current_total_price', "rawPayload"->>'total_price'),
    'createdAt', "rawPayload"->>'created_at',
    'updatedAt', "rawPayload"->>'updated_at',
    'processedAt', "rawPayload"->>'processed_at',
    'cancelledAt', "rawPayload"->>'cancelled_at',
    'cancelReason', "rawPayload"->>'cancel_reason',
    'lineItemCount', jsonb_array_length(COALESCE("rawPayload"->'line_items', '[]'::jsonb))
  )
)
WHERE "platform" = 'SHOPIFY'
  AND "rawPayload" IS NOT NULL
  AND (
    "rawPayload" ? 'customer'
    OR "rawPayload" ? 'billing_address'
    OR "rawPayload" ? 'shipping_address'
    OR "rawPayload" ? 'email'
    OR "rawPayload" ? 'phone'
  );

UPDATE "IntegrationEvent"
SET "payload" = jsonb_strip_nulls(
  jsonb_build_object(
    'kind', 'SHOPIFY_ORDER_MINIMIZED_LEGACY',
    'id', COALESCE("payload"->>'admin_graphql_api_id', "payload"->>'id'),
    'name', "payload"->>'name',
    'financialStatus', "payload"->>'financial_status',
    'fulfillmentStatus', "payload"->>'fulfillment_status',
    'currency', COALESCE("payload"->>'currency', "payload"->>'current_currency'),
    'totalPrice', COALESCE("payload"->>'current_total_price', "payload"->>'total_price'),
    'createdAt', "payload"->>'created_at',
    'updatedAt', "payload"->>'updated_at',
    'processedAt', "payload"->>'processed_at',
    'cancelledAt', "payload"->>'cancelled_at',
    'cancelReason', "payload"->>'cancel_reason',
    'lineItemCount', jsonb_array_length(COALESCE("payload"->'line_items', '[]'::jsonb))
  )
)
WHERE "provider" = 'SHOPIFY'
  AND "payload" IS NOT NULL
  AND (
    "payload" ? 'customer'
    OR "payload" ? 'billing_address'
    OR "payload" ? 'shipping_address'
    OR "payload" ? 'email'
    OR "payload" ? 'phone'
  );

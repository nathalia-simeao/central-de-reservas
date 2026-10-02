-- Minimize legacy booking/webhook payloads that may contain more customer PII
-- than the PMY Central needs for operations or audit.
--
-- Booking already has normalized customer/contact fields, external references,
-- passenger counts, financial values and timestamps. rawPayload therefore keeps
-- only a small technical trace. Civitatis additionally needs availabilityId and
-- unit unitIds to reconstruct supplier responses.

UPDATE "Booking"
SET "rawPayload" = jsonb_build_object(
  'legacyMinimized', true,
  'platform', "platform"
)
WHERE "rawPayload" IS NOT NULL
  AND "platform" IN ('SHOPIFY', 'GETYOURGUIDE', 'VIATOR');

UPDATE "Booking"
SET "rawPayload" = jsonb_strip_nulls(
  jsonb_build_object(
    'legacyMinimized', true,
    'civitatisEnvironment', "rawPayload"->'civitatisEnvironment',
    'civitatisRequest',
      jsonb_strip_nulls(
        jsonb_build_object(
          'kind', 'CIVITATIS_BOOKING_AUDIT',
          'operation', 'legacy',
          'environment', "rawPayload"->'civitatisEnvironment',
          'productId', "rawPayload"->'civitatisRequest'->'productId',
          'optionId', "rawPayload"->'civitatisRequest'->'optionId',
          'availabilityId', "rawPayload"->'civitatisRequest'->'availabilityId',
          'resellerReference', "rawPayload"->'civitatisRequest'->'resellerReference',
          'unitItems',
            COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_strip_nulls(
                    jsonb_build_object('unitId', item->'unitId')
                  )
                )
                FROM jsonb_array_elements(
                  CASE
                    WHEN jsonb_typeof("rawPayload"->'civitatisRequest'->'unitItems') = 'array'
                      THEN "rawPayload"->'civitatisRequest'->'unitItems'
                    ELSE '[]'::jsonb
                  END
                ) AS item
              ),
              '[]'::jsonb
            )
        )
      )
  )
)
WHERE "rawPayload" IS NOT NULL
  AND "platform" = 'CIVITATIS';

UPDATE "IntegrationEvent"
SET "payload" = jsonb_strip_nulls(
  jsonb_build_object(
    'kind', 'SHOPIFY_ORDER_AUDIT',
    'legacyMinimized', true,
    'id', COALESCE("payload"->'admin_graphql_api_id', "payload"->'id'),
    'name', "payload"->'name',
    'financialStatus', "payload"->'financial_status',
    'fulfillmentStatus', "payload"->'fulfillment_status',
    'cancelReason', "payload"->'cancel_reason',
    'cancelledAt', "payload"->'cancelled_at',
    'createdAt', "payload"->'created_at',
    'updatedAt', "payload"->'updated_at',
    'currency', "payload"->'currency',
    'totalPrice', COALESCE("payload"->'current_total_price', "payload"->'total_price')
  )
)
WHERE "provider" = 'SHOPIFY'
  AND "payload" IS NOT NULL;

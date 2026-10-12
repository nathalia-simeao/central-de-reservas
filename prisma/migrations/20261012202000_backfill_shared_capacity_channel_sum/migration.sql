-- Reconcile previously saved per-channel allocations with the shared capacity.
-- Only tours with at least one configured nonnegative channel limit are affected.
UPDATE "Tour" AS t
SET "maxCapacity" = sums.total_capacity,
    "capacitySource" = 'CHANNEL_SUM',
    "updatedAt" = NOW()
FROM (
  SELECT t2.id,
         SUM((pair.value #>> '{}')::integer)::integer AS total_capacity
  FROM "Tour" AS t2
  CROSS JOIN LATERAL jsonb_each(t2."platformCapacityLimits") AS pair(key, value)
  WHERE jsonb_typeof(t2."platformCapacityLimits") = 'object'
    AND pair.key IN ('shopify', 'getyourguide', 'viator', 'civitatis', 'headout')
    AND jsonb_typeof(pair.value) = 'number'
    AND (pair.value #>> '{}') ~ '^[0-9]+$'
  GROUP BY t2.id
) AS sums
WHERE t.id = sums.id;

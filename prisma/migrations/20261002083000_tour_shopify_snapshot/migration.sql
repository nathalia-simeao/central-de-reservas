-- Cache the storefront-facing Shopify catalog fields on the canonical Tour.
-- This lets the Central render from PostgreSQL while Shopify refreshes happen off the request path.
ALTER TABLE "Tour" ADD COLUMN "shopifySnapshot" JSONB;

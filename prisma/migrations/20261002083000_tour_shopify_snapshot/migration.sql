-- Cache the storefront-facing Shopify catalog fields on the canonical Tour.
-- This lets the Central render from PostgreSQL while Shopify refreshes happen off the request path.
ALTER TABLE "Tour" ADD COLUMN "shopifySnapshot" JSONB;

-- Support server-side dashboard filtering without scanning the full booking table.
CREATE INDEX "Booking_startTime_idx" ON "Booking"("startTime");
CREATE INDEX "Booking_createdAt_idx" ON "Booking"("createdAt");
CREATE INDEX "Booking_updatedAt_idx" ON "Booking"("updatedAt");
CREATE INDEX "Booking_externalCreatedAt_idx" ON "Booking"("externalCreatedAt");
CREATE INDEX "Booking_externalUpdatedAt_idx" ON "Booking"("externalUpdatedAt");
CREATE INDEX "Media_shop_active_createdAt_idx" ON "Media"("shop", "active", "createdAt");

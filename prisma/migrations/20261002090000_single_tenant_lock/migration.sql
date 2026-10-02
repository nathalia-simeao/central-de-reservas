-- PMY Central is intentionally single-tenant.
-- This table permanently locks one database to one Shopify shop so
-- operational models without a shop column cannot be mixed across stores.
CREATE TABLE "AppTenantLock" (
  "key" TEXT NOT NULL DEFAULT 'PRIMARY',
  "shop" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'AUTO',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AppTenantLock_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "AppTenantLock_shop_key" ON "AppTenantLock"("shop");
CREATE INDEX "AppTenantLock_shop_idx" ON "AppTenantLock"("shop");

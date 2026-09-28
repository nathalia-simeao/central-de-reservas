CREATE TABLE "PlatformFieldMapping" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "mappings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformFieldMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformFieldMapping_shop_platform_key"
ON "PlatformFieldMapping"("shop", "platform");

CREATE INDEX "PlatformFieldMapping_shop_idx"
ON "PlatformFieldMapping"("shop");

CREATE INDEX "PlatformFieldMapping_platform_idx"
ON "PlatformFieldMapping"("platform");

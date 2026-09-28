CREATE TABLE "BusinessSetting" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "logoUrl" TEXT,
    "theme" JSONB,
    "imageShape" TEXT NOT NULL DEFAULT 'rounded',
    "fieldMappings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessSetting_shop_key" ON "BusinessSetting"("shop");
CREATE INDEX "BusinessSetting_shop_idx" ON "BusinessSetting"("shop");

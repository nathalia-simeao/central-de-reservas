-- AlterTable
ALTER TABLE "Guide"
ADD COLUMN "description" TEXT,
ADD COLUMN "videoUrl" TEXT,
ADD COLUMN "galleryUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "exclusiveProducts" JSONB,
ADD COLUMN "shopifyMetaobjectId" TEXT,
ADD COLUMN "shopifyHandle" TEXT,
ADD COLUMN "shopifyActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "shopifyUpdatedAt" TIMESTAMP(3),
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'CENTRAL',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Guide_shopifyMetaobjectId_key" ON "Guide"("shopifyMetaobjectId");

-- CreateIndex
CREATE INDEX "Guide_shopifyHandle_idx" ON "Guide"("shopifyHandle");

-- CreateIndex
CREATE INDEX "Guide_shopifyActive_idx" ON "Guide"("shopifyActive");

-- CreateIndex
CREATE INDEX "Guide_source_idx" ON "Guide"("source");

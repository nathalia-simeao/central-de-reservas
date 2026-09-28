ALTER TABLE "Media"
ADD COLUMN "shop" TEXT,
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'pmy_upload',
ADD COLUMN "externalId" TEXT,
ADD COLUMN "productTitle" TEXT,
ADD COLUMN "width" INTEGER,
ADD COLUMN "height" INTEGER,
ADD COLUMN "metadata" JSONB,
ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Media"
ALTER COLUMN "url" TYPE TEXT;

CREATE UNIQUE INDEX "Media_shop_source_externalId_key"
ON "Media"("shop", "source", "externalId");

CREATE INDEX "Media_shop_active_idx"
ON "Media"("shop", "active");

CREATE INDEX "Media_source_idx"
ON "Media"("source");

CREATE INDEX "Media_category_idx"
ON "Media"("category");

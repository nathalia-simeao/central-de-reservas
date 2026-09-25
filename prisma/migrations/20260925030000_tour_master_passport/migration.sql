-- Turn Tour into the PMY master passport and add variant-level channel mapping.

ALTER TABLE "Tour"
RENAME COLUMN "shopifyId" TO "shopifyProductId";

ALTER TABLE "Tour"
ADD COLUMN "productType" TEXT,
ADD COLUMN "shopifyStatus" TEXT,
ADD COLUMN "gygActivityId" TEXT,
ADD COLUMN "viatorProductCode" TEXT,
ADD COLUMN "headoutId" TEXT,
ADD COLUMN "civitatisId" TEXT,
ADD COLUMN "tripadvisorProductCode" TEXT,
ADD COLUMN "airbnbExperienceId" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "Tour_shopifyProductId_key"
ON "Tour"("shopifyProductId");

CREATE UNIQUE INDEX "Tour_gygActivityId_key"
ON "Tour"("gygActivityId");

CREATE UNIQUE INDEX "Tour_viatorProductCode_key"
ON "Tour"("viatorProductCode");

CREATE UNIQUE INDEX "Tour_headoutId_key"
ON "Tour"("headoutId");

CREATE UNIQUE INDEX "Tour_civitatisId_key"
ON "Tour"("civitatisId");

CREATE UNIQUE INDEX "Tour_tripadvisorProductCode_key"
ON "Tour"("tripadvisorProductCode");

CREATE UNIQUE INDEX "Tour_airbnbExperienceId_key"
ON "Tour"("airbnbExperienceId");

CREATE INDEX "Tour_title_idx"
ON "Tour"("title");

CREATE INDEX "Tour_productType_idx"
ON "Tour"("productType");

CREATE TABLE "TourVariant" (
  "id" TEXT NOT NULL,
  "tourId" TEXT NOT NULL,
  "shopifyVariantId" TEXT,
  "gygOptionId" TEXT,
  "viatorOptionCode" TEXT,
  "headoutVariantId" TEXT,
  "civitatisOptionId" TEXT,
  "title" TEXT,
  "sku" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TourVariant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TourVariant_shopifyVariantId_key"
ON "TourVariant"("shopifyVariantId");

CREATE UNIQUE INDEX "TourVariant_gygOptionId_key"
ON "TourVariant"("gygOptionId");

CREATE UNIQUE INDEX "TourVariant_viatorOptionCode_key"
ON "TourVariant"("viatorOptionCode");

CREATE UNIQUE INDEX "TourVariant_headoutVariantId_key"
ON "TourVariant"("headoutVariantId");

CREATE UNIQUE INDEX "TourVariant_civitatisOptionId_key"
ON "TourVariant"("civitatisOptionId");

CREATE INDEX "TourVariant_tourId_idx"
ON "TourVariant"("tourId");

CREATE INDEX "TourVariant_sku_idx"
ON "TourVariant"("sku");

ALTER TABLE "TourVariant"
ADD CONSTRAINT "TourVariant_tourId_fkey"
FOREIGN KEY ("tourId") REFERENCES "Tour"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

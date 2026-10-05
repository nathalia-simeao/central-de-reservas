-- GetYourGuide conecta cada option vendável a um product ID do sistema da PMY.
-- O UUID de GygProductOption passa a ser o supplier productId canônico.
CREATE TABLE "GygProductOption" (
  "id" TEXT NOT NULL,
  "tourId" TEXT NOT NULL,
  "optionKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "gygOptionId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GygProductOption_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TourVariant"
ADD COLUMN "gygProductOptionId" TEXT;

CREATE UNIQUE INDEX "GygProductOption_gygOptionId_key"
ON "GygProductOption"("gygOptionId");

CREATE UNIQUE INDEX "GygProductOption_tourId_optionKey_key"
ON "GygProductOption"("tourId", "optionKey");

CREATE INDEX "GygProductOption_tourId_idx"
ON "GygProductOption"("tourId");

CREATE INDEX "GygProductOption_active_idx"
ON "GygProductOption"("active");

CREATE INDEX "TourVariant_gygProductOptionId_idx"
ON "TourVariant"("gygProductOptionId");

ALTER TABLE "GygProductOption"
ADD CONSTRAINT "GygProductOption_tourId_fkey"
FOREIGN KEY ("tourId") REFERENCES "Tour"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TourVariant"
ADD CONSTRAINT "TourVariant_gygProductOptionId_fkey"
FOREIGN KEY ("gygProductOptionId") REFERENCES "GygProductOption"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

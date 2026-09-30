ALTER TABLE "Booking"
ADD COLUMN "commercialSource" TEXT NOT NULL DEFAULT 'Outro';

UPDATE "Booking"
SET "commercialSource" = CASE
  WHEN UPPER(COALESCE("platform", '')) = 'VIATOR' THEN 'Viator'
  WHEN UPPER(COALESCE("platform", '')) IN ('GETYOURGUIDE', 'GET_YOUR_GUIDE', 'GYG') THEN 'GetYourGuide'
  WHEN UPPER(COALESCE("platform", '')) = 'HEADOUT' THEN 'Headout'
  WHEN UPPER(COALESCE("platform", '')) = 'CIVITATIS' THEN 'Civitatis'
  WHEN UPPER(COALESCE("platform", '')) IN ('MANUAL', 'CENTRAL') THEN 'Manual'
  WHEN UPPER(COALESCE("platform", '')) = 'SHOPIFY' THEN 'Site'
  ELSE 'Outro'
END;

CREATE INDEX "Booking_commercialSource_idx"
ON "Booking"("commercialSource");

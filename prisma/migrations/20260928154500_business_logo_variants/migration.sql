ALTER TABLE "BusinessSetting"
ADD COLUMN "logoOnLightUrl" TEXT,
ADD COLUMN "logoOnDarkUrl" TEXT;

UPDATE "BusinessSetting"
SET "logoOnLightUrl" = "logoUrl"
WHERE "logoOnLightUrl" IS NULL
  AND "logoUrl" IS NOT NULL;

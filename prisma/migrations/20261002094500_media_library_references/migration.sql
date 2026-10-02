ALTER TABLE "Guide"
ADD COLUMN "photoMediaId" TEXT;

CREATE INDEX "Guide_photoMediaId_idx" ON "Guide"("photoMediaId");

ALTER TABLE "BusinessSetting"
ADD COLUMN "logoOnLightMediaId" TEXT,
ADD COLUMN "logoOnDarkMediaId" TEXT;

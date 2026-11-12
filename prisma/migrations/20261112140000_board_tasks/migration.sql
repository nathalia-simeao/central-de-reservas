-- Quadro: cartões de demanda sem passeio (12/11/2026) reaproveitam SupportCard.
ALTER TABLE "SupportCard" ADD COLUMN "dateKey" TEXT;
ALTER TABLE "SupportCard" ADD COLUMN "time" TEXT;
ALTER TABLE "SupportCard" ADD COLUMN "assigneeIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "SupportCard" ADD COLUMN "done" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "SupportCard_dateKey_idx" ON "SupportCard"("dateKey");

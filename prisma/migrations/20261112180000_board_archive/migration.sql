-- Quadro: arquivar cartões (12/11/2026).
ALTER TABLE "TourDeparture" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "SupportCard" ADD COLUMN "archivedAt" TIMESTAMP(3);

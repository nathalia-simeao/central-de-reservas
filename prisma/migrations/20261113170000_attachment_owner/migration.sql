-- Anexos por guia quando a saída tem um cartão por guia
ALTER TABLE "DepartureAttachment" ADD COLUMN "guideId" TEXT;
ALTER TABLE "DepartureAttachment" ADD COLUMN "trelloCardId" TEXT;

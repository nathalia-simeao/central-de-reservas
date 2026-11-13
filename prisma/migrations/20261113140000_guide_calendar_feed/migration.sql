-- Agenda do guia no Google Agenda / iPhone / Outlook (link de assinatura)
ALTER TABLE "Guide" ADD COLUMN "calendarToken" TEXT;
CREATE UNIQUE INDEX "Guide_calendarToken_key" ON "Guide"("calendarToken");

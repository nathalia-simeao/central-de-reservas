-- Checklists dos cartões do Quadro (estilo Trello): listas manuais + estado dos checklists automáticos.
ALTER TABLE "TourDeparture" ADD COLUMN "checklists" JSONB;

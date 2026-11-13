-- Cartão finalizado no Quadro (como o "concluído" do Trello), por cartão: { "all" | guideId | "sem-guia": { at, by } }.
ALTER TABLE "TourDeparture" ADD COLUMN "completed" JSONB;

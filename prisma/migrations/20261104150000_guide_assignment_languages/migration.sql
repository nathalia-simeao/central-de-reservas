-- Uma saída pode ter um guia por grupo de idioma (pedido 04/11/2026).
ALTER TABLE "GuideAssignment" ADD COLUMN "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
DROP INDEX IF EXISTS "GuideAssignment_active_tour_start_key";
-- Continua valendo: um guia não fica em duas saídas no mesmo horário.

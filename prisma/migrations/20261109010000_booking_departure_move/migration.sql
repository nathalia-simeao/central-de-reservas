-- Quadro: mover a saída (todas as reservas e a escala) para outra data.
ALTER TABLE "Booking" ADD COLUMN "movedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "movedFromStartTime" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "movedBy" TEXT;

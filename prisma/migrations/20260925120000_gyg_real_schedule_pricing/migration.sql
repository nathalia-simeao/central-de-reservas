ALTER TABLE "Tour"
ADD COLUMN "scheduleSlots" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "scheduleSource" TEXT NOT NULL DEFAULT 'UNCONFIGURED',
ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Europe/Lisbon',
ADD COLUMN "bookingCutoffSeconds" INTEGER;

ALTER TABLE "TourVariant"
ADD COLUMN "passengerCategory" TEXT,
ADD COLUMN "startTimeSlot" TEXT,
ADD COLUMN "price" DECIMAL(12,2),
ADD COLUMN "currency" VARCHAR(3);

CREATE INDEX "TourVariant_passengerCategory_idx"
ON "TourVariant"("passengerCategory");

CREATE INDEX "TourVariant_startTimeSlot_idx"
ON "TourVariant"("startTimeSlot");

-- Persist the shared capacity used by every sales channel.
ALTER TABLE "Tour"
ADD COLUMN "maxCapacity" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN "capacitySource" TEXT NOT NULL DEFAULT 'DEFAULT';

ALTER TABLE "Tour"
ADD CONSTRAINT "Tour_maxCapacity_check"
CHECK ("maxCapacity" >= 0);

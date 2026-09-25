-- Make BlockedDate the central source of truth for availability.

ALTER TABLE "BlockedDate"
ADD COLUMN "platforms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "reason" TEXT,
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "BlockedDate_tourId_date_idx"
ON "BlockedDate"("tourId", "date");

CREATE INDEX "BlockedDate_dayOfWeek_idx"
ON "BlockedDate"("dayOfWeek");

CREATE INDEX "BlockedDate_active_idx"
ON "BlockedDate"("active");

ALTER TABLE "BlockedDate"
ADD CONSTRAINT "BlockedDate_tourId_fkey"
FOREIGN KEY ("tourId") REFERENCES "Tour"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

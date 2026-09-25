-- Expand Booking for multichannel reservations and synchronization.
ALTER TABLE "Booking"
ADD COLUMN "bookingRef" TEXT,
ADD COLUMN "externalBookingId" TEXT,
ADD COLUMN "externalProductId" TEXT,
ADD COLUMN "externalVariantId" TEXT,
ADD COLUMN "adults" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "children" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "youths" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "seniors" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "totalParticipants" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "totalPrice" DECIMAL(12,2),
ADD COLUMN "currency" VARCHAR(3),
ADD COLUMN "voucherCode" TEXT,
ADD COLUMN "voucherFormat" TEXT,
ADD COLUMN "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN "externalCreatedAt" TIMESTAMP(3),
ADD COLUMN "externalUpdatedAt" TIMESTAMP(3),
ADD COLUMN "holdExpiresAt" TIMESTAMP(3),
ADD COLUMN "cancelReason" TEXT,
ADD COLUMN "rawPayload" JSONB,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "Booking_platform_externalBookingId_key"
ON "Booking"("platform", "externalBookingId");

CREATE INDEX "Booking_bookingRef_idx"
ON "Booking"("bookingRef");

CREATE INDEX "Booking_tourId_startTime_idx"
ON "Booking"("tourId", "startTime");

CREATE INDEX "Booking_platform_status_idx"
ON "Booking"("platform", "status");

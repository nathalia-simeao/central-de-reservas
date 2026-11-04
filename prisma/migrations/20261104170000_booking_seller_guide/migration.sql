ALTER TABLE "Booking" ADD COLUMN "sellerGuideId" TEXT;
CREATE INDEX "Booking_sellerGuideId_idx" ON "Booking"("sellerGuideId");

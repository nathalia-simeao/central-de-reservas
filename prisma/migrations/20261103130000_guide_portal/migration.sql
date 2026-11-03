ALTER TABLE "Guide" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "Guide" ADD COLUMN "portalEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Guide" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

ALTER TABLE "TourDeparture" ADD COLUMN "checkStartAt" TIMESTAMP(3);
ALTER TABLE "TourDeparture" ADD COLUMN "checkMidAt" TIMESTAMP(3);
ALTER TABLE "TourDeparture" ADD COLUMN "checkEndAt" TIMESTAMP(3);
ALTER TABLE "TourDeparture" ADD COLUMN "checkedBy" TEXT;
ALTER TABLE "TourDeparture" ADD COLUMN "guideNotes" JSONB;

ALTER TABLE "Booking" ADD COLUMN "attendanceMarkedBy" TEXT;

CREATE TABLE "DepartureAttachment" (
    "id" TEXT NOT NULL,
    "departureId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DepartureAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DepartureAttachment_departureId_idx" ON "DepartureAttachment"("departureId");
ALTER TABLE "DepartureAttachment" ADD CONSTRAINT "DepartureAttachment_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "TourDeparture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GuideSession" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuideSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GuideSession_tokenHash_key" ON "GuideSession"("tokenHash");
CREATE INDEX "GuideSession_guideId_idx" ON "GuideSession"("guideId");
ALTER TABLE "GuideSession" ADD CONSTRAINT "GuideSession_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

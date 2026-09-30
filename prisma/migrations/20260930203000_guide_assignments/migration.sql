-- CreateTable
CREATE TABLE "GuideAssignment" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuideAssignment_pkey" PRIMARY KEY ("id")
);

-- Only one active guide can own a departure, while cancelled history remains.
CREATE UNIQUE INDEX "GuideAssignment_active_tour_start_key"
ON "GuideAssignment"("tourId", "startTime")
WHERE "status" = 'ASSIGNED';

-- A guide cannot be actively assigned to two tours at the exact same start.
CREATE UNIQUE INDEX "GuideAssignment_active_guide_start_key"
ON "GuideAssignment"("guideId", "startTime")
WHERE "status" = 'ASSIGNED';

-- CreateIndex
CREATE INDEX "GuideAssignment_guideId_startTime_idx" ON "GuideAssignment"("guideId", "startTime");

-- CreateIndex
CREATE INDEX "GuideAssignment_tourId_startTime_idx" ON "GuideAssignment"("tourId", "startTime");

-- CreateIndex
CREATE INDEX "GuideAssignment_status_startTime_idx" ON "GuideAssignment"("status", "startTime");

-- AddForeignKey
ALTER TABLE "GuideAssignment" ADD CONSTRAINT "GuideAssignment_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideAssignment" ADD CONSTRAINT "GuideAssignment_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

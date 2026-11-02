CREATE TABLE "TourDeparture" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "tagIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TourDeparture_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TourDeparture_tourId_startTime_key" ON "TourDeparture"("tourId", "startTime");
CREATE INDEX "TourDeparture_startTime_idx" ON "TourDeparture"("startTime");

ALTER TABLE "TourDeparture" ADD CONSTRAINT "TourDeparture_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

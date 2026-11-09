-- Lista de espera por saída (passeio + data/hora).
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "language" TEXT,
    "pax" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "notifiedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WaitlistEntry_tourId_startTime_idx" ON "WaitlistEntry"("tourId", "startTime");
CREATE INDEX "WaitlistEntry_status_startTime_idx" ON "WaitlistEntry"("status", "startTime");

ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

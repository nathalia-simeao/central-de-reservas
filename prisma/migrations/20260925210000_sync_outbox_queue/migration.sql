CREATE TABLE IF NOT EXISTS "SyncEvent" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "sourcePlatform" TEXT,
  "aggregateType" TEXT,
  "aggregateId" TEXT,
  "tourId" TEXT,
  "bookingId" TEXT,
  "startTime" TIMESTAMP(3),
  "scope" TEXT NOT NULL DEFAULT 'SLOT',
  "force" BOOLEAN NOT NULL DEFAULT false,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SyncEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SyncEvent_eventType_aggregateId_idx"
ON "SyncEvent"("eventType", "aggregateId");

CREATE INDEX IF NOT EXISTS "SyncEvent_tourId_startTime_idx"
ON "SyncEvent"("tourId", "startTime");

CREATE INDEX IF NOT EXISTS "SyncEvent_bookingId_idx"
ON "SyncEvent"("bookingId");

CREATE TABLE IF NOT EXISTS "SyncJob" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "sourcePlatform" TEXT,
  "aggregateType" TEXT,
  "aggregateId" TEXT,
  "tourId" TEXT,
  "bookingId" TEXT,
  "startTime" TIMESTAMP(3),
  "scope" TEXT NOT NULL DEFAULT 'SLOT',
  "force" BOOLEAN NOT NULL DEFAULT false,
  "payload" JSONB,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 8,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "lockedBy" TEXT,
  "lastAttemptAt" TIMESTAMP(3),
  "processedAt" TIMESTAMP(3),
  "result" JSONB,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SyncJob_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "SyncEvent"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "SyncJob_provider_eventId_key"
ON "SyncJob"("provider", "eventId");

CREATE INDEX IF NOT EXISTS "SyncJob_status_nextAttemptAt_idx"
ON "SyncJob"("status", "nextAttemptAt");

CREATE INDEX IF NOT EXISTS "SyncJob_eventType_aggregateId_idx"
ON "SyncJob"("eventType", "aggregateId");

CREATE INDEX IF NOT EXISTS "SyncJob_tourId_startTime_idx"
ON "SyncJob"("tourId", "startTime");

CREATE INDEX IF NOT EXISTS "SyncJob_bookingId_idx"
ON "SyncJob"("bookingId");

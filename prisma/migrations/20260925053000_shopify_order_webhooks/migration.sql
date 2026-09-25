-- Shopify order ingestion: parent order linkage + webhook audit trail.

ALTER TABLE "Booking"
ADD COLUMN "externalOrderId" TEXT,
ADD COLUMN "externalLineItemIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "Booking_externalOrderId_idx"
ON "Booking"("externalOrderId");

CREATE INDEX "Booking_platform_externalOrderId_idx"
ON "Booking"("platform", "externalOrderId");

CREATE TABLE "IntegrationEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "externalEventId" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "shop" TEXT,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "payload" JSONB,
  "result" JSONB,
  "error" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "IntegrationEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationEvent_provider_externalEventId_key"
ON "IntegrationEvent"("provider", "externalEventId");

CREATE INDEX "IntegrationEvent_provider_topic_idx"
ON "IntegrationEvent"("provider", "topic");

CREATE INDEX "IntegrationEvent_status_idx"
ON "IntegrationEvent"("status");

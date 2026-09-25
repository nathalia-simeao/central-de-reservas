CREATE TABLE "IntegrationConnection" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "displayName" TEXT,
  "mode" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
  "environment" TEXT,
  "credentialCiphertext" TEXT,
  "credentialIv" TEXT,
  "credentialTag" TEXT,
  "credentialVersion" INTEGER NOT NULL DEFAULT 1,
  "config" JSONB,
  "externalAccountId" TEXT,
  "lastValidatedAt" TIMESTAMP(3),
  "lastValidationStatus" TEXT,
  "lastValidationMessage" TEXT,
  "connectedAt" TIMESTAMP(3),
  "disconnectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationConnection_provider_key"
ON "IntegrationConnection"("provider");

CREATE INDEX "IntegrationConnection_status_idx"
ON "IntegrationConnection"("status");

CREATE INDEX "IntegrationConnection_mode_idx"
ON "IntegrationConnection"("mode");

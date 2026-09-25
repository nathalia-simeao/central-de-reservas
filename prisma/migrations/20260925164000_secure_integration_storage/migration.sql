CREATE TABLE IF NOT EXISTS "IntegrationSecret" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CONFIGURED',
  "environment" TEXT,
  "credentialCiphertext" TEXT NOT NULL,
  "credentialIv" TEXT NOT NULL,
  "credentialTag" TEXT NOT NULL,
  "credentialKeyVersion" TEXT NOT NULL DEFAULT 'v1',
  "credentialFingerprint" TEXT,
  "metadata" JSONB,
  "lastValidatedAt" TIMESTAMP(3),
  "lastValidationStatus" TEXT,
  "lastValidationMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationSecret_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "IntegrationSecret"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'CONFIGURED',
  ADD COLUMN IF NOT EXISTS "environment" TEXT,
  ADD COLUMN IF NOT EXISTS "credentialCiphertext" TEXT,
  ADD COLUMN IF NOT EXISTS "credentialIv" TEXT,
  ADD COLUMN IF NOT EXISTS "credentialTag" TEXT,
  ADD COLUMN IF NOT EXISTS "credentialKeyVersion" TEXT NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS "credentialFingerprint" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "lastValidatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastValidationStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "lastValidationMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationSecret_provider_key"
ON "IntegrationSecret"("provider");

CREATE INDEX IF NOT EXISTS "IntegrationSecret_status_idx"
ON "IntegrationSecret"("status");

CREATE INDEX IF NOT EXISTS "IntegrationSecret_environment_idx"
ON "IntegrationSecret"("environment");

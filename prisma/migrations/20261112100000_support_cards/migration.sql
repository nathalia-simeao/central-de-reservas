-- Quadro: coluna fixa "Documentos de suporte" (importada do Trello em 12/11/2026).
CREATE TABLE "SupportCard" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "links" JSONB,
    "checklists" JSONB,
    "position" INTEGER NOT NULL DEFAULT 0,
    "visibleToGuides" BOOLEAN NOT NULL DEFAULT true,
    "trelloId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportCard_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SupportCard_trelloId_key" ON "SupportCard"("trelloId");
CREATE INDEX "SupportCard_position_idx" ON "SupportCard"("position");

CREATE TABLE "SupportCardAttachment" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportCardAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupportCardAttachment_cardId_idx" ON "SupportCardAttachment"("cardId");
ALTER TABLE "SupportCardAttachment" ADD CONSTRAINT "SupportCardAttachment_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "SupportCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

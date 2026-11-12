-- Quadro: comentários e atividade dos cartões (12/11/2026).
CREATE TABLE "BoardActivity" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'event',
    "text" TEXT NOT NULL,
    "authorName" TEXT,
    "authorPersonId" TEXT,
    "mentionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "readBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BoardActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BoardActivity_targetType_targetKey_createdAt_idx" ON "BoardActivity"("targetType", "targetKey", "createdAt");
CREATE INDEX "BoardActivity_createdAt_idx" ON "BoardActivity"("createdAt");

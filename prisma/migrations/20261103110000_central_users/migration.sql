CREATE TABLE "CentralUser" (
    "id" TEXT NOT NULL,
    "shopifyUserId" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CentralUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CentralUser_shopifyUserId_key" ON "CentralUser"("shopifyUserId");

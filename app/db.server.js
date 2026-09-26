import { PrismaClient } from "@prisma/client";
import { startSyncQueueWorker } from "./utils/sync-queue.server";

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
}

const prisma = global.prismaGlobal ?? new PrismaClient();

startSyncQueueWorker(prisma);

export default prisma;

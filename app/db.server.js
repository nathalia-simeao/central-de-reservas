import { PrismaClient } from "@prisma/client";
import { startSyncQueueWorker } from "./utils/sync-queue.server";

// Guide.passwordHash never leaves the database by accident: it is omitted from
// every query (including `include: { guide: true }`). Only the guide portal login
// reads it, explicitly, with `omit: { passwordHash: false }`.
const clientOptions = { omit: { guide: { passwordHash: true } } };

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient(clientOptions);
  }
}

const prisma = global.prismaGlobal ?? new PrismaClient(clientOptions);

startSyncQueueWorker(prisma);

export default prisma;

import { data } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import {
  getSyncQueueStats,
  processSyncQueue,
  requeueSyncJob,
} from "../utils/sync-queue.server";

const json = (body, init) => data(body, init);

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  const [stats, jobs] = await Promise.all([
    getSyncQueueStats(db),
    db.syncJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        eventId: true,
        eventType: true,
        provider: true,
        sourcePlatform: true,
        aggregateType: true,
        aggregateId: true,
        tourId: true,
        bookingId: true,
        startTime: true,
        scope: true,
        force: true,
        status: true,
        attempts: true,
        maxAttempts: true,
        nextAttemptAt: true,
        lastAttemptAt: true,
        processedAt: true,
        result: true,
        error: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return json({ success: true, stats, jobs });
};

export const action = async ({ request }) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  const actionName = String(formData.get("_action") || "").trim();

  if (actionName === "run") {
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(formData.get("limit") || "20", 10) || 20),
    );
    const result = await processSyncQueue(db, { limit });
    return json({ success: true, result });
  }

  if (actionName === "requeue") {
    const jobId = String(formData.get("jobId") || "").trim();
    if (!jobId) {
      return json(
        { success: false, error: "jobId is required." },
        { status: 400 },
      );
    }

    const job = await db.syncJob.findUnique({
      where: { id: jobId },
      select: { id: true, status: true },
    });

    if (!job) {
      return json(
        { success: false, error: "Sync job not found." },
        { status: 404 },
      );
    }

    await requeueSyncJob(db, jobId);
    return json({ success: true, jobId });
  }

  return json(
    { success: false, error: "Unsupported sync queue action." },
    { status: 400 },
  );
};

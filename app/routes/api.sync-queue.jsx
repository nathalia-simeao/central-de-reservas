import { data } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import {
  getSyncQueueStats,
  processSyncQueue,
  requeueProviderJobs,
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

  const bookingIds = [...new Set(jobs.map((job) => job.bookingId).filter(Boolean))];
  const bookingRows = bookingIds.length > 0
    ? await db.booking.findMany({
        where: { id: { in: bookingIds } },
        select: {
          id: true,
          bookingRef: true,
          externalBookingId: true,
          customerName: true,
          platform: true,
          status: true,
          startTime: true,
          tour: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      })
    : [];
  const bookingById = new Map(bookingRows.map((booking) => [booking.id, booking]));
  const enrichedJobs = jobs.map((job) => ({
    ...job,
    booking: job.bookingId ? bookingById.get(job.bookingId) || null : null,
  }));

  return json({ success: true, stats, jobs: enrichedJobs });
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

  if (actionName === "requeueProvider") {
    const provider = String(formData.get("provider") || "").trim();
    if (!provider) {
      return json(
        { success: false, error: "provider is required." },
        { status: 400 },
      );
    }

    try {
      const result = await requeueProviderJobs(db, provider);
      return json({ success: true, result });
    } catch (error) {
      return json(
        { success: false, error: error?.message || String(error) },
        { status: 400 },
      );
    }
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

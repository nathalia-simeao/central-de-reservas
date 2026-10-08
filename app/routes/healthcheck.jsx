import db from "../db.server";

const WORKER_STALE_MS = Math.max(60000, Number(process.env.HEALTH_WORKER_STALE_MS || 180000));
const QUEUE_OLD_MS = Math.max(60000, Number(process.env.HEALTH_QUEUE_OLD_MS || 900000));
const startedAt = Date.now();

function response(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

async function checkReadiness() {
  const checkedAt = new Date();
  const oldBefore = new Date(checkedAt.getTime() - QUEUE_OLD_MS);

  // All probes use local state; do not make network calls to external providers
  // from the load-balancer endpoint.
  const [database, states, overdue, heartbeat, sessions, webhook] = await Promise.all([
    db.$queryRaw`SELECT 1 AS ok`,
    db.syncJob.groupBy({ by: ["status"], _count: { _all: true } }),
    db.syncJob.count({
      where: { status: { in: ["PENDING", "RETRY"] }, nextAttemptAt: { lt: oldBefore } },
    }),
    db.workerHeartbeat.findUnique({ where: { name: "sync-queue" } }),
    db.session.count(),
    db.integrationEvent.findFirst({
      where: { provider: { equals: "shopify", mode: "insensitive" } },
      orderBy: { receivedAt: "desc" },
      select: { receivedAt: true, status: true },
    }),
  ]);

  const counts = Object.fromEntries(states.map((item) => [item.status, item._count._all]));
  const workerAgeSeconds = heartbeat
    ? Math.max(0, Math.floor((checkedAt.getTime() - new Date(heartbeat.lastSeenAt).getTime()) / 1000))
    : null;
  const workerEnabled = process.env.SYNC_QUEUE_WORKER_ENABLED !== "false";
  const workerFresh = !workerEnabled || (workerAgeSeconds != null && workerAgeSeconds * 1000 <= WORKER_STALE_MS);
  const workerStatus = !workerEnabled ? "disabled" : !heartbeat ? "not_started" :
    workerFresh && !heartbeat.lastError ? "healthy" : workerFresh ? "error" : "stale";

  // A lack of new orders is not itself a webhook outage: stores can go quiet.
  // This is a monitoring signal, not a false active Shopify API probe.
  const shopify = {
    sessionsPresent: sessions > 0,
    lastWebhookAt: webhook?.receivedAt || null,
    lastWebhookStatus: webhook?.status || null,
    connectivity: "not_probed",
  };

  const critical = !shopify.sessionsPresent || (workerEnabled && !workerFresh && overdue > 0);
  const degraded = workerStatus === "error" || workerStatus === "stale" ||
    (counts.DEAD || 0) > 0 || (counts.RETRY || 0) > 0 || overdue > 0;

  return {
    status: critical ? "unready" : degraded ? "degraded" : "ready",
    checkedAt: checkedAt.toISOString(),
    app: { status: "healthy", uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000) },
    database: { status: database.length ? "healthy" : "unknown" },
    worker: {
      status: workerStatus,
      enabled: workerEnabled,
      lastSeenAt: heartbeat?.lastSeenAt || null,
      lastSuccessfulAt: heartbeat?.lastOkAt || null,
      ageSeconds: workerAgeSeconds,
    },
    queue: {
      pending: counts.PENDING || 0,
      processing: counts.PROCESSING || 0,
      retry: counts.RETRY || 0,
      dead: counts.DEAD || 0,
      blocked: counts.BLOCKED || 0,
      overdue,
    },
    shopify,
  };
}

export const loader = async ({ request }) => {
  const path = new URL(request.url).pathname.replace(/\/$/, "");
  if (path.endsWith("/live")) {
    return response({ status: "alive", uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000) });
  }
  try {
    const state = await checkReadiness();
    return response(state, state.status === "unready" ? 503 : 200);
  } catch (error) {
    console.error("[HEALTH] readiness probe failed:", error);
    return response({
      status: "unready",
      checkedAt: new Date().toISOString(),
      app: { status: "healthy" },
      database: { status: "unavailable_or_probe_failed" },
    }, 503);
  }
};

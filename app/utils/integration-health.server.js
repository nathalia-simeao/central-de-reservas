import {
  integrationEnvironmentSecretStatus,
  listSafeIntegrationSecretStatuses,
} from "./integration-secrets.server";

const PROVIDERS = ["SHOPIFY", "GETYOURGUIDE", "VIATOR", "CIVITATIS", "HEADOUT"];

function normalizeProvider(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (raw === "GYG" || raw === "GET_YOUR_GUIDE") return "GETYOURGUIDE";
  return raw;
}

function countByStatus(rows, provider) {
  return rows.reduce((acc, row) => {
    if (normalizeProvider(row.provider) !== provider) return acc;
    acc[row.status] = Number(row._count?._all || 0);
    return acc;
  }, {});
}

export function deriveProviderHealth({
  provider,
  queue = {},
  secret = null,
  environment = {},
  latestEvent = null,
}) {
  const dead = Number(queue.DEAD || 0);
  const blocked = Number(queue.BLOCKED || 0);
  const retry = Number(queue.RETRY || 0);
  const processing = Number(queue.PROCESSING || 0);
  const pending = Number(queue.PENDING || 0);

  let status = "OK";
  let reason = "HEALTHY";

  if (dead > 0) {
    status = "ERROR";
    reason = "DEAD_SYNC_JOBS";
  } else if (blocked > 0 || retry > 0) {
    status = "WARNING";
    reason = blocked > 0 ? "BLOCKED_SYNC_JOBS" : "RETRYING_SYNC_JOBS";
  }

  if (provider === "VIATOR" || provider === "CIVITATIS") {
    const configured =
      Boolean(secret?.hasCredential) ||
      Boolean(environment?.configured);
    if (!configured && status === "OK") {
      status = "UNKNOWN";
      reason = "CREDENTIAL_NOT_CONFIGURED";
    } else if (secret?.lastValidationStatus === "ERROR") {
      status = "ERROR";
      reason = "CREDENTIAL_VALIDATION_ERROR";
    } else if (secret?.status === "CONFIGURED" && status === "OK") {
      status = "WARNING";
      reason = "WAITING_FOR_AUTHENTICATED_TRAFFIC";
    }
  }

  if (provider === "GETYOURGUIDE") {
    const ready =
      Boolean(environment?.incoming) &&
      Boolean(environment?.outgoing) &&
      Boolean(environment?.apiBase);
    if (!ready && status === "OK") {
      status = "WARNING";
      reason = "GYG_CONFIGURATION_INCOMPLETE";
    }
  }

  if (provider === "HEADOUT" && !environment?.configured && status === "OK") {
    status = "UNKNOWN";
    reason = "ONBOARDING_PENDING";
  }

  if (provider === "SHOPIFY" && latestEvent?.status === "FAILED") {
    status = "ERROR";
    reason = "LAST_WEBHOOK_FAILED";
  }

  return {
    provider,
    status,
    reason,
    queue: {
      pending,
      processing,
      retry,
      blocked,
      dead,
    },
    lastSignalAt:
      latestEvent?.processedAt ||
      latestEvent?.receivedAt ||
      secret?.lastValidatedAt ||
      null,
    lastSignalStatus:
      latestEvent?.status ||
      secret?.lastValidationStatus ||
      secret?.status ||
      null,
  };
}

export async function getIntegrationHealth(prisma) {
  const startedAt = Date.now();
  let database = { status: "OK", latencyMs: null, error: null };

  try {
    await prisma.$queryRaw`SELECT 1`;
    database.latencyMs = Date.now() - startedAt;
  } catch (error) {
    database = {
      status: "ERROR",
      latencyMs: Date.now() - startedAt,
      error: error?.message || String(error),
    };
  }

  const [queueRows, events, secrets] = await Promise.all([
    prisma.syncJob.groupBy({
      by: ["provider", "status"],
      _count: { _all: true },
    }),
    prisma.integrationEvent.findMany({
      orderBy: { receivedAt: "desc" },
      take: 100,
      select: {
        provider: true,
        status: true,
        topic: true,
        receivedAt: true,
        processedAt: true,
        error: true,
      },
    }),
    listSafeIntegrationSecretStatuses(prisma),
  ]);

  const environment = integrationEnvironmentSecretStatus();
  const secretByProvider = new Map(
    secrets.map((secret) => [normalizeProvider(secret.provider), secret]),
  );
  const latestEventByProvider = new Map();
  for (const event of events) {
    const provider = normalizeProvider(event.provider);
    if (!latestEventByProvider.has(provider)) {
      latestEventByProvider.set(provider, event);
    }
  }

  const providers = PROVIDERS.map((provider) => {
    const env =
      provider === "GETYOURGUIDE"
        ? environment.getyourguide
        : provider === "VIATOR"
          ? environment.viator
          : provider === "CIVITATIS"
            ? environment.civitatis
            : provider === "HEADOUT"
              ? environment.headout
              : {};

    return deriveProviderHealth({
      provider,
      queue: countByStatus(queueRows, provider),
      secret: secretByProvider.get(provider) || null,
      environment: env || {},
      latestEvent: latestEventByProvider.get(provider) || null,
    });
  });

  const actionable = providers.filter((item) =>
    ["ERROR", "WARNING"].includes(item.status),
  );
  const overall =
    database.status === "ERROR" || providers.some((item) => item.status === "ERROR")
      ? "ERROR"
      : actionable.length > 0
        ? "WARNING"
        : "OK";

  return {
    overall,
    checkedAt: new Date().toISOString(),
    database,
    providers,
    privacy: {
      exposesCustomerData: false,
      exposesCredentials: false,
    },
  };
}

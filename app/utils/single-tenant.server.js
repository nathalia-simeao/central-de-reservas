const TENANT_KEY = "PRIMARY";

function normalizeShop(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";

  return raw
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .replace(/\.+$/, "");
}

function configuredPrimaryShop() {
  return normalizeShop(
    process.env.PMY_PRIMARY_SHOP ||
      process.env.SHOPIFY_PRIMARY_SHOP ||
      "",
  );
}

function uniqueShops(values) {
  return [
    ...new Set(
      values
        .map((value) => normalizeShop(value))
        .filter((value) => value && value !== "legacy"),
    ),
  ];
}

async function readExistingCandidates(prisma) {
  const [settings, mappings, media] = await Promise.all([
    prisma.businessSetting.findMany({ select: { shop: true } }),
    prisma.platformFieldMapping.findMany({ select: { shop: true } }),
    prisma.media.findMany({
      select: { shop: true },
      distinct: ["shop"],
    }),
  ]);

  return uniqueShops([
    ...settings.map((item) => item.shop),
    ...mappings.map((item) => item.shop),
    ...media.map((item) => item.shop),
  ]);
}

async function readSessionCandidates(prisma) {
  const sessions = await prisma.session.findMany({
    select: { shop: true },
    distinct: ["shop"],
  });
  return uniqueShops(sessions.map((item) => item.shop));
}

async function createImmutableLock(prisma, shop, source) {
  const normalized = normalizeShop(shop);
  if (!normalized) return null;

  try {
    return await prisma.appTenantLock.create({
      data: {
        key: TENANT_KEY,
        shop: normalized,
        source,
      },
    });
  } catch (error) {
    // A concurrent request may have claimed the singleton first.
    // Never overwrite an existing lock automatically.
    if (error?.code !== "P2002") throw error;

    return prisma.appTenantLock.findUnique({
      where: { key: TENANT_KEY },
    });
  }
}

export class SingleTenantViolation extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "SingleTenantViolation";
    this.code = "PMY_SINGLE_TENANT_VIOLATION";
    this.details = details;
  }
}

export async function resolvePrimaryShop(
  prisma,
  {
    currentShop = null,
    allowInitialize = true,
  } = {},
) {
  const configured = configuredPrimaryShop();
  const current = normalizeShop(currentShop);

  const existingLock = await prisma.appTenantLock.findUnique({
    where: { key: TENANT_KEY },
  });

  if (existingLock) {
    const locked = normalizeShop(existingLock.shop);

    if (configured && configured !== locked) {
      throw new SingleTenantViolation(
        "PMY_PRIMARY_SHOP conflicts with the database tenant lock.",
        {
          configuredShop: configured,
          lockedShop: locked,
        },
      );
    }

    return {
      shop: locked,
      source: existingLock.source,
      locked: true,
    };
  }

  const operationalCandidates = await readExistingCandidates(prisma);

  if (configured) {
    const foreignOperationalShops = operationalCandidates.filter(
      (shop) => shop !== configured,
    );

    if (foreignOperationalShops.length > 0) {
      throw new SingleTenantViolation(
        "Existing operational data belongs to a different Shopify shop than PMY_PRIMARY_SHOP.",
        {
          configuredShop: configured,
          existingOperationalShops: operationalCandidates,
        },
      );
    }

    if (!allowInitialize) {
      return {
        shop: configured,
        source: "ENV",
        locked: false,
      };
    }

    const created = await createImmutableLock(
      prisma,
      configured,
      "ENV",
    );

    return {
      shop: normalizeShop(created?.shop || configured),
      source: created?.source || "ENV",
      locked: Boolean(created),
    };
  }

  if (operationalCandidates.length > 1) {
    throw new SingleTenantViolation(
      "More than one Shopify shop already appears in operational data. Set PMY_PRIMARY_SHOP explicitly before continuing.",
      {
        existingOperationalShops: operationalCandidates,
      },
    );
  }

  if (operationalCandidates.length === 1) {
    const inferred = operationalCandidates[0];

    if (!allowInitialize) {
      return {
        shop: inferred,
        source: "EXISTING_DATA",
        locked: false,
      };
    }

    const created = await createImmutableLock(
      prisma,
      inferred,
      "EXISTING_DATA",
    );

    return {
      shop: normalizeShop(created?.shop || inferred),
      source: created?.source || "EXISTING_DATA",
      locked: Boolean(created),
    };
  }

  const sessionCandidates = await readSessionCandidates(prisma);

  if (sessionCandidates.length > 1) {
    throw new SingleTenantViolation(
      "Multiple Shopify shops have sessions in this database and there is no tenant lock yet. Set PMY_PRIMARY_SHOP explicitly before continuing.",
      {
        sessionShops: sessionCandidates,
      },
    );
  }

  const inferredFromSession =
    sessionCandidates.length === 1 ? sessionCandidates[0] : "";

  const candidate = inferredFromSession || current;
  if (!candidate) return null;

  if (!allowInitialize) {
    return {
      shop: candidate,
      source: inferredFromSession ? "SESSION" : "CURRENT_SESSION",
      locked: false,
    };
  }

  const created = await createImmutableLock(
    prisma,
    candidate,
    inferredFromSession ? "SESSION" : "CURRENT_SESSION",
  );

  return {
    shop: normalizeShop(created?.shop || candidate),
    source:
      created?.source ||
      (inferredFromSession ? "SESSION" : "CURRENT_SESSION"),
    locked: Boolean(created),
  };
}

export async function checkSingleTenantShop(
  prisma,
  shop,
  options = {},
) {
  const requestedShop = normalizeShop(shop);
  if (!requestedShop) {
    return {
      allowed: false,
      primaryShop: null,
      requestedShop: null,
      reason: "SHOP_MISSING",
    };
  }

  const primary = await resolvePrimaryShop(prisma, {
    currentShop: requestedShop,
    allowInitialize: options.allowInitialize !== false,
  });

  if (!primary?.shop) {
    return {
      allowed: false,
      primaryShop: null,
      requestedShop,
      reason: "TENANT_NOT_INITIALIZED",
    };
  }

  return {
    allowed: primary.shop === requestedShop,
    primaryShop: primary.shop,
    requestedShop,
    source: primary.source,
    locked: primary.locked,
    reason:
      primary.shop === requestedShop
        ? "PRIMARY_SHOP"
        : "FOREIGN_SHOP",
  };
}

export async function assertSingleTenantShop(
  prisma,
  shop,
  {
    context = "request",
    allowInitialize = true,
  } = {},
) {
  const result = await checkSingleTenantShop(prisma, shop, {
    allowInitialize,
  });

  if (result.allowed) return result;

  throw new SingleTenantViolation(
    "This PMY Central database is single-tenant and cannot be used by another Shopify shop.",
    {
      context,
      requestedShop: result.requestedShop,
      primaryShop: result.primaryShop,
      reason: result.reason,
    },
  );
}

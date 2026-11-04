import { data } from "react-router";
import { isAdmin, resolveCentralUser } from "../utils/central-access.server.js";
import { authenticate, registerWebhooks } from "../shopify.server";
import db from "../db.server";
import {
  integrationEncryptionReady,
  integrationEnvironmentSecretStatus,
  listSafeIntegrationSecretStatuses,
} from "../utils/integration-secrets.server";
import {
  getCentralRefreshStatus,
  scheduleCentralRefresh,
} from "../utils/central-refresh.server";
import {
  GYG_CERTIFICATION_STEPS,
  buildGygCertificationEvidence,
  summarizeGygOptionMappings,
} from "../utils/gyg-certification";

const prisma = db;
const json = (body, init) => data(body, init);

function bookingForClient(booking) {
  return {
    ...booking,
    // Prisma Decimal is a class instance. React Router's initial single-fetch
    // payload may preserve it differently from a normal JSON resource request,
    // which made the first dashboard render lose revenue values until another
    // request happened. Send a plain primitive in every payload.
    totalPrice:
      booking?.totalPrice === null || booking?.totalPrice === undefined
        ? null
        : String(booking.totalPrice),
  };
}

export const loader = async ({ request }) => {
  const auth = await authenticate.admin(request);
  const { admin, session } = auth;
  const centralUser = await resolveCentralUser(prisma, auth);
  const userIsAdmin = isAdmin(centralUser);
  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setDate(defaultStart.getDate() - 30);
  const defaultEnd = new Date(now);
  defaultEnd.setDate(defaultEnd.getDate() + 30);

  // O carregamento da Central agora é somente leitura do PostgreSQL.
  // Shopify/webhooks/guias/mídia são atualizados em stale-while-revalidate,
  // sem bloquear a resposta da página.
  scheduleCentralRefresh({
    prisma,
    admin,
    session,
    registerWebhooks,
  });

  // Carrinhos abandonados (vaga segurada no checkout que venceu) não interessam
  // à tela e ocupavam o limite de linhas, empurrando reservas futuras para fora.
  const bookingWindowWhere = {
    AND: [
      {
        OR: [
          { createdAt: { gte: defaultStart, lte: defaultEnd } },
          { externalCreatedAt: { gte: defaultStart, lte: defaultEnd } },
          { updatedAt: { gte: defaultStart, lte: defaultEnd } },
          { externalUpdatedAt: { gte: defaultStart, lte: defaultEnd } },
          { startTime: { gte: defaultStart, lte: defaultEnd } },
        ],
      },
      { syncStatus: { not: "HOLD_RELEASED" } },
    ],
  };

  const assignmentStart = new Date(now);
  assignmentStart.setDate(assignmentStart.getDate() - 30);
  const assignmentEnd = new Date(now);
  assignmentEnd.setDate(assignmentEnd.getDate() + 180);

  const blockedEnd = new Date(now);
  blockedEnd.setDate(blockedEnd.getDate() + 400);
  const blockedStart = new Date(now);
  blockedStart.setDate(blockedStart.getDate() - 2);

  let [
    tours,
    bookings,
    bookingTotal,
    blockedDates,
    dbGuides,
    guideAssignments,
    businessSettings,
    platformFieldMappings,
  ] = await Promise.all([
    prisma.tour.findMany({
      include: {
        variants: true,
        gygProductOptions: {
          include: { variants: true },
          orderBy: { title: "asc" },
        },
      },
      orderBy: { title: "asc" },
    }),
    prisma.booking.findMany({
      where: bookingWindowWhere,
      orderBy: [{ startTime: "asc" }, { createdAt: "desc" }],
      take: 800,
    }),
    prisma.booking.count({ where: bookingWindowWhere }),
    prisma.blockedDate.findMany({
      where: {
        active: true,
        OR: [
          { dayOfWeek: { not: null } },
          { date: null },
          { date: { gte: blockedStart, lte: blockedEnd } },
        ],
      },
      include: {
        tour: {
          select: { id: true, title: true, shopifyProductId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.guide.findMany({
      where: {
        OR: [
          { shopifyMetaobjectId: null },
          { shopifyActive: true },
        ],
      },
      orderBy: { name: "asc" },
    }),
    prisma.guideAssignment.findMany({
      where: {
        status: "ASSIGNED",
        startTime: { gte: assignmentStart, lte: assignmentEnd },
      },
      include: {
        guide: true,
        tour: {
          select: {
            id: true,
            title: true,
            shopifyProductId: true,
            timezone: true,
            durationMinutes: true,
          },
        },
      },
      orderBy: { startTime: "asc" },
    }),
    session?.shop
      ? prisma.businessSetting.findUnique({ where: { shop: session.shop } })
      : Promise.resolve(null),
    session?.shop
      ? prisma.platformFieldMapping.findMany({
          where: { shop: session.shop },
          orderBy: { platform: "asc" },
        })
      : Promise.resolve([]),
  ]);

  bookings = bookings.map(bookingForClient);

  // Portal do guia: a senha nunca sai do banco; só dizemos se existe uma.
  const guidesWithPassword = new Set(
    (
      await prisma.guide
        .findMany({ where: { passwordHash: { not: null } }, select: { id: true } })
        .catch(() => [])
    ).map((item) => item.id),
  );
  // Vendas por guia (links do portal), últimos 90 dias — só para administradores.
  const guideSales = new Map();
  if (userIsAdmin) {
    const sold = await prisma.booking
      .findMany({
        where: { sellerGuideId: { not: null }, createdAt: { gte: new Date(Date.now() - 90 * 24 * 3600 * 1000) } },
        select: { sellerGuideId: true, status: true, totalPrice: true },
      })
      .catch(() => []);
    for (const row of sold) {
      const entry = guideSales.get(row.sellerGuideId) || { confirmed: 0, pending: 0, revenue: 0 };
      if (row.status === "CONFIRMED") {
        entry.confirmed += 1;
        entry.revenue += Number(row.totalPrice) || 0;
      } else if (row.status === "PENDING") entry.pending += 1;
      guideSales.set(row.sellerGuideId, entry);
    }
  }
  dbGuides = dbGuides.map((guide) => ({
    ...guide,
    portalHasPassword: guidesWithPassword.has(guide.id),
    ...(userIsAdmin ? { sales90d: guideSales.get(guide.id) || { confirmed: 0, pending: 0, revenue: 0 } } : {}),
  }));

  // Etiquetas por saída (passeio + dia + horário). Tolerante: se a migração
  // ainda não rodou, a Central abre normalmente sem etiquetas de saída.
  const tourDepartures = await prisma.tourDeparture
    .findMany({
      where: { startTime: { gte: assignmentStart, lte: assignmentEnd } },
      select: {
        id: true, tourId: true, startTime: true, tagIds: true,
        checkStartAt: true, checkMidAt: true, checkEndAt: true, guideNotes: true,
        attachments: { select: { id: true, fileName: true, mimeType: true, size: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      },
    })
    .catch((error) => {
      console.error("[PMY] tourDeparture load failed:", error?.message || error);
      return [];
    });

  // Migração legada apenas em memória: o loader não escreve mais no banco.
  if (
    platformFieldMappings.length === 0 &&
    businessSettings?.fieldMappings &&
    typeof businessSettings.fieldMappings === "object" &&
    !Array.isArray(businessSettings.fieldMappings)
  ) {
    platformFieldMappings = Object.entries(businessSettings.fieldMappings)
      .filter(
        ([, mappings]) =>
          mappings &&
          typeof mappings === "object" &&
          !Array.isArray(mappings),
      )
      .map(([platform, mappings]) => ({
        id: `legacy:${platform}`,
        shop: session?.shop || "legacy",
        platform: String(platform).toLowerCase(),
        mappings,
      }));
  }

  const shopifyProducts = tours
    .filter((tour) => Boolean(tour.shopifyProductId))
    .map((tour) => {
      const snapshot =
        tour.shopifySnapshot &&
        typeof tour.shopifySnapshot === "object" &&
        !Array.isArray(tour.shopifySnapshot)
          ? tour.shopifySnapshot
          : {};
      const variants = (tour.variants || [])
        .filter((variant) => Boolean(variant.shopifyVariantId))
        .map((variant) => {
          const priceRaw =
            variant.price == null ? 0 : Number(variant.price);
          return {
            id: variant.shopifyVariantId,
            title: variant.title || "Default Title",
            sku: variant.sku || "—",
            price:
              Number.isFinite(priceRaw) && priceRaw > 0
                ? `€${priceRaw.toFixed(0)}`
                : "—",
            priceRaw: Number.isFinite(priceRaw) ? priceRaw : 0,
            compareAtPrice: null,
            available: variant.active !== false,
            currency: variant.currency || null,
            selectedOptions:
              snapshot.variantOptions &&
              typeof snapshot.variantOptions === "object" &&
              Array.isArray(snapshot.variantOptions[variant.shopifyVariantId])
                ? snapshot.variantOptions[variant.shopifyVariantId]
                : [],
          };
        });
      const numericPrices = variants
        .map((variant) => Number(variant.priceRaw))
        .filter((value) => Number.isFinite(value) && value > 0);
      const priceRaw =
        Number.isFinite(Number(snapshot.priceRaw)) &&
        Number(snapshot.priceRaw) > 0
          ? Number(snapshot.priceRaw)
          : numericPrices.length
            ? Math.min(...numericPrices)
            : 0;

      return {
        id: tour.shopifyProductId,
        masterTourId: tour.id,
        name: tour.title,
        productType: tour.productType || null,
        description: String(snapshot.description || ""),
        sku: snapshot.sku || variants[0]?.sku || "—",
        price:
          snapshot.price ||
          (priceRaw > 0 ? `€${priceRaw.toFixed(0)}` : "—"),
        priceRaw,
        active: tour.shopifyStatus !== "INACTIVE",
        synced: true,
        image: snapshot.image || null,
        imageAlt: snapshot.imageAlt || tour.title,
        variants,
        options: Array.isArray(snapshot.options) ? snapshot.options : [],
        languages: Array.isArray(snapshot.languages) ? snapshot.languages : [],
        collections: Array.isArray(snapshot.collections)
          ? snapshot.collections
          : [],
        scheduleSlots: tour.scheduleSlots || [],
        metafields:
          snapshot.metafields && typeof snapshot.metafields === "object"
            ? snapshot.metafields
            : {},
        currency:
          snapshot.currency ||
          variants.find((variant) => variant.currency)?.currency ||
          "EUR",
      };
    });

  const shopName = session?.shop || "Minha Loja Shopify";
  const mediaFiles = [];

  const gygMappedTours = (tours || []).filter((tour) =>
    (tour.gygProductOptions || []).some(
      (option) =>
        option.active !== false &&
        Boolean(String(option.gygOptionId || "").trim()),
    ),
  );
  const gygReadyTours = gygMappedTours.filter((tour) =>
    (tour.gygProductOptions || []).some(
      (option) =>
        option.active !== false &&
        Boolean(String(option.gygOptionId || "").trim()) &&
        (option.variants || []).some(
          (variant) =>
            variant.active !== false &&
            ["ADULT", "CHILD", "YOUTH", "SENIOR", "GROUP"].includes(
              String(variant.passengerCategory || "").toUpperCase(),
            ),
        ) &&
        (option.variants || []).some(
          (variant) =>
            variant.active !== false && Boolean(variant.startTimeSlot),
        ),
    ),
  );
  const gygScheduleMissing = gygMappedTours.filter((tour) =>
    (tour.gygProductOptions || [])
      .filter(
        (option) =>
          option.active !== false &&
          Boolean(String(option.gygOptionId || "").trim()),
      )
      .some(
        (option) =>
          !(option.variants || []).some(
            (variant) =>
              variant.active !== false && Boolean(variant.startTimeSlot),
          ),
      ),
  );

  const gygCertificationEvents = await prisma.integrationEvent.findMany({
    where: {
      provider: "GETYOURGUIDE",
      topic: { in: GYG_CERTIFICATION_STEPS.map((step) => step.key) },
    },
    orderBy: { receivedAt: "desc" },
    take: 100,
  });
  const gygCertification = buildGygCertificationEvidence(
    gygCertificationEvents,
  );
  const gygOptionMappings = summarizeGygOptionMappings(tours);

  const gygIntegrationStatus = {
    incomingAuthConfigured: Boolean(
      process.env.GYG_INCOMING_USER && process.env.GYG_INCOMING_PASS,
    ),
    outgoingAuthConfigured: Boolean(
      process.env.GYG_OUTGOING_USER && process.env.GYG_OUTGOING_PASS,
    ),
    apiBaseConfigured: Boolean(process.env.GYG_API_BASE),
    credentialsReady: Boolean(
      process.env.GYG_INCOMING_USER &&
        process.env.GYG_INCOMING_PASS &&
        process.env.GYG_OUTGOING_USER &&
        process.env.GYG_OUTGOING_PASS &&
        process.env.GYG_API_BASE,
    ),
    endpointBase: `${String(process.env.SHOPIFY_APP_URL || "").replace(/\/+$/, "")}/1`,
    mappedTours: gygMappedTours.length,
    readyTours: gygReadyTours.length,
    scheduleMissing: gygScheduleMissing.length,
    activeOptions: gygOptionMappings.activeOptions,
    mappedOptions: gygOptionMappings.mappedOptions,
    optionMappingMissing: gygOptionMappings.optionMappingMissing,
    trafficVerified: gygCertification.trafficVerified,
    lastTrafficAt: gygCertification.lastTrafficAt,
    certificationEvidence: gygCertification.steps,
    certificationEvidenceVerified: gygCertification.verified,
    certificationEvidenceTotal: gygCertification.total,
    technicalEvidenceComplete: gygCertification.technicalEvidenceComplete,
  };

  let integrationCredentialStatus = {
    encryptionReady: integrationEncryptionReady(),
    environment: integrationEnvironmentSecretStatus(),
    statuses: [],
  };
  try {
    integrationCredentialStatus.statuses =
      await listSafeIntegrationSecretStatuses(prisma);
  } catch (error) {
    console.error("[PMY] integration credential status load failed:", error);
  }

  const latestRefresh = getCentralRefreshStatus(session?.shop);
  const shopifyWebhookStatus =
    latestRefresh.webhookStatus || {
      ok: null,
      callbackUrl: null,
      subscriptions: [],
      error: latestRefresh.running
        ? "Verificação em segundo plano."
        : "Verificação será atualizada em segundo plano.",
    };
  const guideShopifySync = latestRefresh.guides
    ? { success: true, ...latestRefresh.guides, error: null }
    : {
        success: null,
        total: dbGuides.filter((guide) => guide.shopifyMetaobjectId).length,
        created: 0,
        updated: 0,
        error: latestRefresh.lastError || null,
      };

  return json({
    apiKey: process.env.SHOPIFY_API_KEY || "",
    tours,
    bookings,
    bookingPage: {
      page: 1,
      pageSize: 250,
      total: bookingTotal,
      hasMore: bookingTotal > bookings.length,
      start: defaultStart.toISOString(),
      end: defaultEnd.toISOString(),
    },
    blockedDates,
    shopifyProducts,
    shopName,
    mediaFiles,
    dbGuides,
    guideAssignments,
    guideShopifySync,
    shopifyWebhookStatus,
    gygIntegrationStatus,
    integrationCredentialStatus,
    businessSettings: userIsAdmin || !businessSettings
      ? businessSettings
      : { ...businessSettings, costSettings: null, fieldMappings: null, platformPrices: null },
    platformFieldMappings: userIsAdmin ? platformFieldMappings : [],
    tourDepartures,
    centralUser: {
      id: centralUser.id,
      name: centralUser.name || null,
      role: centralUser.role,
      legacy: Boolean(centralUser.legacy),
    },
    centralUsers: userIsAdmin
      ? await prisma.centralUser
          .findMany({ orderBy: [{ role: "asc" }, { createdAt: "asc" }] })
          .catch(() => [])
      : [],
  });
};

import { data } from "react-router";
import { authenticate, registerWebhooks } from "../shopify.server";
import db from "../db.server";
import {
  buildTourPassportUpdate,
  resolveTourByPlatformId,
  syncShopifyCatalogToMasterTours,
} from "../utils/tour-passport.server";
import {
  dateInputToUtcMidnight,
  normalizePlatforms,
  parseRecurringDays,
} from "../utils/availability.server";
import { createBookingWithCapacityGuard } from "../utils/capacity.server";
import { ensureShopifyOrderWebhooks } from "../utils/shopify-webhooks.server";
import {
  enqueueAvailabilitySync,
  enqueueBookingSync,
  getSyncQueueStats,
  processSyncQueue,
  requeueSyncJob,
  SYNC_EVENT_TYPES,
} from "../utils/sync-queue.server";

// Server-only loader/actions for the PMY Central route.
const prisma = db;
const json = (body, init) => data(body, init);

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  // Keep Shopify order webhooks in sync with the installed shop.
  // registerWebhooks is idempotent: it creates missing subscriptions and
  // updates callbacks when needed.
  if (session) {
    try {
      await registerWebhooks({ session });
    } catch (webhookError) {
      console.error("[SHOPIFY] registerWebhooks on app load failed:", webhookError);
    }
  }

  // Verificação/autocorreção adicional usando o token do próprio app.
  // Isso cobre instalações em que o hook da biblioteca não criou as subscriptions.
  let shopifyWebhookStatus = {
    ok: false,
    callbackUrl: null,
    subscriptions: [],
    error: "Ainda não verificado",
  };
  try {
    shopifyWebhookStatus = await ensureShopifyOrderWebhooks(
      admin,
      process.env.SHOPIFY_APP_URL,
    );
  } catch (webhookEnsureError) {
    console.error("[SHOPIFY] ensureShopifyOrderWebhooks failed:", webhookEnsureError);
    shopifyWebhookStatus = {
      ok: false,
      callbackUrl: null,
      subscriptions: [],
      error: webhookEnsureError?.message || String(webhookEnsureError),
    };
  }

  let tours      = await prisma.tour.findMany({ include: { bookings: true, variants: true } });
  const bookings = await prisma.booking.findMany({ orderBy: { startTime: "asc" } });
  const blockedDates = await prisma.blockedDate.findMany({
    where: { active: true },
    include: { tour: { select: { id: true, title: true, shopifyProductId: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Busca nome real da loja + produtos via GraphQL
  let shopifyProducts = [];
  let shopName = session?.shop || "Minha Loja Shopify";
  try {
    const gqlResponse = await admin.graphql(`
      query {
        shop { name myshopifyDomain currencyCode }
        products(first: 100) {
          edges {
            node {
              id
              title
              productType
              status
              description
              featuredImage { url altText }
              collections(first: 5) {
                edges { node { id title } }
              }
              variants(first: 20) {
                edges {
                  node {
                    id
                    title
                    sku
                    price
                    compareAtPrice
                    availableForSale
                  }
                }
              }
              metafields(first: 30, namespace: "custom") {
                edges {
                  node { key value }
                }
              }
            }
          }
        }
      }
    `);
    const gqlData = await gqlResponse.json();
    shopName = gqlData?.data?.shop?.name || shopName;
    const shopCurrency = gqlData?.data?.shop?.currencyCode || "EUR";

    shopifyProducts = (gqlData?.data?.products?.edges || []).map(({ node }) => {
      // Pega todas as variantes (preços, categorias de passageiro, horários)
      const variants = (node.variants?.edges || []).map(({ node: v }) => ({
        id: v.id,
        title: v.title,
        sku: v.sku || "—",
        price: v.price ? "€" + parseFloat(v.price).toFixed(0) : "—",
        priceRaw: parseFloat(v.price || 0),
        compareAtPrice: v.compareAtPrice ? "€" + parseFloat(v.compareAtPrice).toFixed(0) : null,
        available: v.availableForSale,
      }));

      // Metafields customizados (horários, etc)
      const metafields = {};
      for (const { node: mf } of (node.metafields?.edges || [])) {
        metafields[mf.key] = mf.value;
      }

      // Coleções (categorias)
      const collections = (node.collections?.edges || []).map(({ node: c }) => ({
        id: c.id, title: c.title,
      }));

      // Preço base (primeira variante adulto ou a menor)
      const baseVariant = variants[0];
      const minPrice = variants.length > 0 ? Math.min(...variants.map(v => v.priceRaw)) : 0;

      // Horários do produto — tenta metafield 'schedule', depois 'times', depois padrão
      const scheduleRaw = metafields['schedule'] || metafields['times'] || metafields['horarios'] || null;
      const scheduleSlots = scheduleRaw
        ? scheduleRaw.split(/[,;|]/).map(s => s.trim()).filter(Boolean)
        : [];

      return {
        id:          node.id,
        name:        node.title,
        productType: node.productType || null,
        description: node.description || "",
        sku:         baseVariant?.sku || "—",
        price:       minPrice > 0 ? "€" + minPrice.toFixed(0) : "—",
        priceRaw:    minPrice,
        active:      node.status === "ACTIVE",
        synced:      true,
        image:       node.featuredImage?.url || null,
        imageAlt:    node.featuredImage?.altText || node.title,
        variants,
        collections,
        scheduleSlots, // horários reais do produto
        metafields,
        currency: shopCurrency,
      };
    });

    // Sincroniza o catálogo reservável da Shopify com o registro mestre Tour.
    // Produtos operacionais (ex.: taxa de reagendamento) não viram passeios.
    try {
      await syncShopifyCatalogToMasterTours(prisma, shopifyProducts);
      tours = await prisma.tour.findMany({
        include: { bookings: true, variants: true },
        orderBy: { title: "asc" },
      });
    } catch (syncError) {
      console.error("[PMY] tour passport sync error:", syncError);
    }
  } catch (e) {
    shopifyProducts = [];
  }

  // A Central não solicita read_users por padrão.
  // Esse scope é restrito no Shopify e não é necessário para reservas,
  // catálogo, Draft Orders, pedidos ou Banco de Mídia.
  const shopifyStaff = [];

  // Busca guias do banco de dados
  let dbGuides = [];
  try {
    dbGuides = await prisma.guide.findMany({ orderBy: { createdAt: 'asc' } });
  } catch (e) {
    dbGuides = [];
  }

  // Busca mídias salvas no banco (uploads próprios do app)
  let mediaFiles = [];
  try {
    mediaFiles = await prisma.media.findMany({ orderBy: { createdAt: 'desc' } });
  } catch (e) {
    mediaFiles = [];
  }

  // Busca imagens do próprio Shopify (produtos + arquivos Files)
  let shopifyImages = [];
  try {
    // ── Imagens dos produtos (todas as imagens de todos os produtos) ──────────
    const prodImgRes = await admin.graphql(`
      query {
        products(first: 100) {
          edges {
            node {
              id
              title
              images(first: 10) {
                edges {
                  node {
                    id
                    url
                    altText
                    width
                    height
                  }
                }
              }
            }
          }
        }
      }
    `);
    const prodImgData = await prodImgRes.json();
    const productImages = [];
    for (const { node: product } of (prodImgData?.data?.products?.edges || [])) {
      for (const { node: img } of (product?.images?.edges || [])) {
        if (img?.url) {
          // ID seguro sem Buffer
          const safeId = img.id?.split('/').pop() || String(Date.now() + Math.random()).replace('.','');
          productImages.push({
            id: `shopify_prod_${safeId}`,
            url: img.url,
            filename: img.url.split('/').pop().split('?')[0],
            mimetype: 'image/jpeg',
            category: 'tour',
            label: img.altText || product.title,
            source: 'shopify_product',
            productTitle: product.title,
            width: img.width,
            height: img.height,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    // ── Arquivos do Shopify Files (galeria da loja — todos os usuários) ────────
    // Requer scope read_files — tenta, se falhar retorna só os de produtos
    let fileImages = [];
    try {
      const filesRes = await admin.graphql(`
        query {
          files(first: 100, query: "media_type:IMAGE") {
            edges {
              node {
                ... on MediaImage {
                  id
                  alt
                  createdAt
                  image {
                    id
                    url
                    altText
                    width
                    height
                  }
                }
              }
            }
          }
        }
      `);
      const filesData = await filesRes.json();
      for (const { node: file } of (filesData?.data?.files?.edges || [])) {
        const url = file?.image?.url;
        if (url) {
          const safeId = file.id?.split('/').pop() || String(Date.now() + Math.random()).replace('.','');
          fileImages.push({
            id: `shopify_file_${safeId}`,
            url,
            filename: url.split('/').pop().split('?')[0],
            mimetype: 'image/jpeg',
            category: 'general',
            label: file.alt || file.image?.altText || url.split('/').pop().split('?')[0],
            source: 'shopify_files',
            width: file.image?.width,
            height: file.image?.height,
            createdAt: file.createdAt || new Date().toISOString(),
          });
        }
      }
    } catch (filesErr) {
      // Files API pode não ter permissão — apenas ignora, usa só produtos
      fileImages = [];
    }

    // Deduplica por URL
    const seen = new Set();
    shopifyImages = [...fileImages, ...productImages].filter(img => {
      if (seen.has(img.url)) return false;
      seen.add(img.url);
      return true;
    });

  } catch (e) {
    shopifyImages = [];
  }

  const gygMappedTours = (tours || []).filter((tour) => Boolean(tour.gygActivityId));
  const gygReadyTours = gygMappedTours.filter(
    (tour) =>
      Array.isArray(tour.scheduleSlots) &&
      tour.scheduleSlots.length > 0 &&
      (tour.variants || []).some(
        (variant) =>
          variant.active !== false &&
          ["ADULT", "CHILD", "YOUTH", "SENIOR"].includes(
            String(variant.passengerCategory || "").toUpperCase(),
          ),
      ),
  );
  const gygScheduleMissing = gygMappedTours.filter(
    (tour) => !Array.isArray(tour.scheduleSlots) || tour.scheduleSlots.length === 0,
  );

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
  };

  return json({
    tours,
    bookings,
    blockedDates,
    shopifyProducts,
    shopName,
    shopifyStaff,
    mediaFiles,
    shopifyImages,
    dbGuides,
    shopifyWebhookStatus,
    gygIntegrationStatus,
  });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const _action = formData.get("_action");

  if (_action === "syncQueueStats") {
    try {
      const [stats, jobs] = await Promise.all([
        getSyncQueueStats(prisma),
        prisma.syncJob.findMany({
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
    } catch (error) {
      console.error("[PMY] sync queue stats failed:", error);
      return json(
        { success: false, error: error?.message || "Falha ao consultar o log de sincronização." },
        { status: 500 },
      );
    }
  }

  if (_action === "syncQueueRun") {
    try {
      const limit = Math.min(
        100,
        Math.max(1, Number.parseInt(formData.get("limit") || "20", 10) || 20),
      );
      const result = await processSyncQueue(prisma, { limit });
      return json({ success: true, result });
    } catch (error) {
      console.error("[PMY] sync queue run failed:", error);
      return json(
        { success: false, error: error?.message || "Falha ao processar a fila." },
        { status: 500 },
      );
    }
  }

  if (_action === "syncQueueRequeue") {
    try {
      const jobId = String(formData.get("jobId") || "").trim();
      if (!jobId) {
        return json({ success: false, error: "Job ID é obrigatório." }, { status: 400 });
      }

      const job = await prisma.syncJob.findUnique({
        where: { id: jobId },
        select: { id: true },
      });
      if (!job) {
        return json({ success: false, error: "Sincronização não encontrada." }, { status: 404 });
      }

      await requeueSyncJob(prisma, jobId);
      return json({ success: true, jobId });
    } catch (error) {
      console.error("[PMY] sync queue requeue failed:", error);
      return json(
        { success: false, error: error?.message || "Falha ao reenviar a sincronização." },
        { status: 500 },
      );
    }
  }

  if (_action === "createTour") {
    const title = formData.get("title");
    await prisma.tour.create({ data: { title } });
    return json({ success: true });
  }

  if (_action === "saveTourPassport") {
    try {
      const id = formData.get("id");
      if (!id) return json({ success: false, error: "Tour ID is required" });

      const data = buildTourPassportUpdate(formData);
      const tour = await prisma.tour.update({
        where: { id },
        data,
        include: { variants: true },
      });

      await enqueueAvailabilitySync(prisma, {
        eventType: SYNC_EVENT_TYPES.AVAILABILITY_CHANGED,
        tourId: tour.id,
        scope: "TOUR",
        sourcePlatform: "CENTRAL",
        force: true,
        aggregateType: "TOUR",
        aggregateId: tour.id,
        payload: { origin: "TOUR_PASSPORT_UPDATED" },
      });

      return json({ success: true, tour });
    } catch (e) {
      return json({ success: false, error: e.message });
    }
  }

  if (_action === "saveGygTourConfig") {
    try {
      const id = String(formData.get("id") || "").trim();
      if (!id) {
        return json({ success: false, error: "Tour ID is required." }, { status: 400 });
      }

      const gygActivityId = String(formData.get("gygActivityId") || "").trim() || null;
      const timezone = String(formData.get("timezone") || "Europe/Lisbon").trim();
      try {
        new Intl.DateTimeFormat("en-GB", { timeZone: timezone }).format(new Date());
      } catch {
        return json({ success: false, error: "Fuso horário inválido." }, { status: 400 });
      }

      const cutoffRaw = String(formData.get("bookingCutoffSeconds") || "").trim();
      let bookingCutoffSeconds = null;
      if (cutoffRaw) {
        bookingCutoffSeconds = Number.parseInt(cutoffRaw, 10);
        if (
          !Number.isInteger(bookingCutoffSeconds) ||
          bookingCutoffSeconds < 0 ||
          bookingCutoffSeconds > 604800
        ) {
          return json(
            { success: false, error: "Cutoff deve ficar entre 0 e 604800 segundos." },
            { status: 400 },
          );
        }
      }

      const scheduleRaw = String(formData.get("scheduleSlots") || "").trim();
      const update = {
        gygActivityId,
        timezone,
        bookingCutoffSeconds,
        gygPriceOverApi: String(formData.get("gygPriceOverApi") || "") === "true",
      };

      if (scheduleRaw) {
        const scheduleSlots = [
          ...new Set(
            scheduleRaw
              .split(/[,;|\s]+/)
              .map((slot) => slot.trim())
              .filter(Boolean)
              .map((slot) => {
                const match = slot.match(/^([01]?\d|2[0-3])[:hH](\d{2})$/);
                return match
                  ? `${match[1].padStart(2, "0")}:${match[2]}`
                  : null;
              }),
          ),
        ].filter(Boolean).sort();

        if (scheduleSlots.length === 0) {
          return json(
            { success: false, error: "Informe horários válidos no formato HH:MM." },
            { status: 400 },
          );
        }

        update.scheduleSlots = scheduleSlots;
        update.scheduleSource = "MANUAL";
      }

      const tour = await prisma.tour.update({
        where: { id },
        data: update,
        include: { variants: true },
      });

      await enqueueAvailabilitySync(prisma, {
        eventType: SYNC_EVENT_TYPES.AVAILABILITY_CHANGED,
        tourId: tour.id,
        scope: "TOUR",
        sourcePlatform: "CENTRAL",
        force: true,
        aggregateType: "TOUR",
        aggregateId: tour.id,
        payload: { origin: "GYG_TOUR_CONFIG_UPDATED" },
      });

      return json({ success: true, tour });
    } catch (e) {
      console.error("[PMY] saveGygTourConfig error:", e);
      return json({ success: false, error: e.message }, { status: 500 });
    }
  }

  if (_action === "createBlock") {
    try {
      const shopifyProductId = formData.get("tourId");
      const specificDate = formData.get("date");
      const recurringDays = parseRecurringDays(formData.get("recurringDays"));
      const timeSlot = String(formData.get("timeSlot") || "ALL").trim() || "ALL";
      const reason = String(formData.get("reason") || "Bloqueio manual na Agenda Central").trim();

      let platforms = [];
      try {
        platforms = normalizePlatforms(JSON.parse(formData.get("platforms") || "[]"));
      } catch {
        platforms = [];
      }

      if (!shopifyProductId) {
        return json({ success: false, error: "Selecione um tour." }, { status: 400 });
      }

      if (platforms.length === 0) {
        return json({ success: false, error: "Selecione pelo menos uma plataforma." }, { status: 400 });
      }

      const tour = await resolveTourByPlatformId(prisma, "SHOPIFY", shopifyProductId);
      if (!tour) {
        return json({ success: false, error: "Tour mestre não encontrado para este produto Shopify." }, { status: 404 });
      }

      const date = specificDate ? dateInputToUtcMidnight(specificDate) : null;
      if (specificDate && !date) {
        return json({ success: false, error: "Data de bloqueio inválida." }, { status: 400 });
      }

      if (!date && recurringDays.length === 0) {
        return json({ success: false, error: "Informe uma data específica ou ao menos um dia recorrente." }, { status: 400 });
      }

      const rules = [];
      if (date) {
        rules.push({ date, dayOfWeek: null });
      }
      for (const day of recurringDays) {
        rules.push({ date: null, dayOfWeek: String(day) });
      }

      const created = [];
      const reused = [];

      for (const rule of rules) {
        const candidates = await prisma.blockedDate.findMany({
          where: {
            active: true,
            tourId: tour.id,
            date: rule.date,
            dayOfWeek: rule.dayOfWeek,
            timeSlot,
          },
        });

        const samePlatforms = candidates.find((candidate) => {
          const left = [...(candidate.platforms || [])].sort().join("|");
          const right = [...platforms].sort().join("|");
          return left === right;
        });

        if (samePlatforms) {
          reused.push(samePlatforms);
          continue;
        }

        const block = await prisma.blockedDate.create({
          data: {
            tourId: tour.id,
            date: rule.date,
            dayOfWeek: rule.dayOfWeek,
            timeSlot,
            platforms,
            reason,
            source: "MANUAL",
            active: true,
            syncStatus: "CENTRAL_ACTIVE",
          },
        });
        created.push(block);
      }

      if (created.length > 0) {
        await enqueueAvailabilitySync(prisma, {
          eventType: SYNC_EVENT_TYPES.BLOCK_CREATED,
          tourId: tour.id,
          scope: "TOUR",
          sourcePlatform: "CENTRAL",
          targetProviders: platforms,
          force: true,
          aggregateType: "BLOCK",
          aggregateId: created[0].id,
          payload: {
            blockIds: created.map((block) => block.id),
            date: specificDate || null,
            recurringDays,
            timeSlot,
          },
        });
      }

      return json({
        success: true,
        created: created.length,
        reused: reused.length,
        message: created.length
          ? `${created.length} regra(s) de disponibilidade criada(s).`
          : "Esse bloqueio já estava ativo.",
      });
    } catch (e) {
      console.error("[PMY] createBlock error:", e);
      return json({ success: false, error: e.message }, { status: 500 });
    }
  }

  if (_action === "removeBlock") {
    try {
      const id = formData.get("id");
      if (!id) return json({ success: false, error: "Block ID is required" }, { status: 400 });

      const existingBlock = await prisma.blockedDate.findUnique({
        where: { id },
        include: { tour: true },
      });

      await prisma.blockedDate.update({
        where: { id },
        data: {
          active: false,
          syncStatus: "PENDING_RELEASE",
        },
      });

      if (existingBlock?.tourId) {
        await enqueueAvailabilitySync(prisma, {
          eventType: SYNC_EVENT_TYPES.BLOCK_REMOVED,
          tourId: existingBlock.tourId,
          scope: "TOUR",
          sourcePlatform: "CENTRAL",
          targetProviders: existingBlock.platforms || [],
          force: true,
          aggregateType: "BLOCK",
          aggregateId: existingBlock.id,
          payload: {
            date: existingBlock.date
              ? new Date(existingBlock.date).toISOString().slice(0, 10)
              : null,
            dayOfWeek: existingBlock.dayOfWeek,
            timeSlot: existingBlock.timeSlot,
          },
        });
      }

      return json({ success: true });
    } catch (e) {
      console.error("[PMY] removeBlock error:", e);
      return json({ success: false, error: e.message }, { status: 500 });
    }
  }

  if (_action === "saveCapacity") {
    try {
      const shopifyProductId = formData.get("tourId");
      const parsed = Number.parseInt(formData.get("maxCapacity") || "", 10);

      if (!shopifyProductId || !Number.isInteger(parsed) || parsed < 0 || parsed > 999) {
        return json({ success: false, error: "Capacidade inválida." }, { status: 400 });
      }

      const tour = await resolveTourByPlatformId(prisma, "SHOPIFY", shopifyProductId);
      if (!tour) {
        return json({ success: false, error: "Tour mestre não encontrado." }, { status: 404 });
      }

      const updated = await prisma.tour.update({
        where: { id: tour.id },
        data: {
          maxCapacity: parsed,
          capacitySource: "MANUAL",
        },
      });

      await enqueueAvailabilitySync(prisma, {
        eventType: SYNC_EVENT_TYPES.CAPACITY_CHANGED,
        tourId: updated.id,
        scope: "TOUR",
        sourcePlatform: "CENTRAL",
        force: true,
        aggregateType: "TOUR",
        aggregateId: updated.id,
        payload: { maxCapacity: updated.maxCapacity },
      });

      return json({ success: true, maxCapacity: updated.maxCapacity });
    } catch (e) {
      console.error("[PMY] saveCapacity error:", e);
      return json({ success: false, error: e.message }, { status: 500 });
    }
  }

  if (_action === "createBooking") {
    try {
      const tourId = formData.get("tourId");
      const customerName = formData.get("customerName");
      const startTime = new Date(formData.get("startTime"));
      const platform = String(formData.get("platform") || "MANUAL").toUpperCase();
      const requestedSeats = Math.max(
        1,
        Number.parseInt(formData.get("totalParticipants") || formData.get("quantity") || "1", 10) || 1,
      );
      const rawTotalPrice = String(formData.get("totalPrice") || "").trim();
      const parsedTotalPrice = rawTotalPrice === "" ? null : Number(rawTotalPrice);
      const totalPrice =
        parsedTotalPrice !== null &&
        Number.isFinite(parsedTotalPrice) &&
        parsedTotalPrice >= 0
          ? parsedTotalPrice.toFixed(2)
          : null;
      const currency = totalPrice
        ? String(formData.get("currency") || "EUR").trim().toUpperCase().slice(0, 3)
        : null;

      if (!tourId || Number.isNaN(startTime.getTime())) {
        return json({ success: false, error: "Tour ou horário inválido." }, { status: 400 });
      }

      const guarded = await createBookingWithCapacityGuard(prisma, {
        tourId,
        startTime,
        platform,
        requestedSeats,
        bookingData: {
          customerName: customerName || "Reserva manual",
          status: "CONFIRMED",
          totalPrice,
          currency,
          syncStatus: "CENTRAL",
        },
      });

      if (!guarded.accepted) {
        return json({
          success: false,
          error: guarded.message || "Sem disponibilidade.",
          availability: guarded.availability || null,
        }, { status: 409 });
      }

      await enqueueBookingSync(prisma, {
        eventType: SYNC_EVENT_TYPES.BOOKING_CREATED,
        booking: guarded.booking,
        sourcePlatform: platform,
        force: true,
        payload: { origin: "CENTRAL_MANUAL_BOOKING" },
      });

      return json({
        success: true,
        booking: guarded.booking,
        availabilityAfter: guarded.availabilityAfter,
      });
    } catch (e) {
      console.error("[PMY] createBooking error:", e);
      return json({ success: false, error: e.message }, { status: 500 });
    }
  }

  // Upload de mídia via Shopify Files API (staged upload)
  if (_action === "uploadMedia") {
    try {
      const filename = formData.get("filename");
      const mimetype = formData.get("mimetype");
      const size     = parseInt(formData.get("size") || "0");
      const category = formData.get("category") || "general"; // logo | guide | tour | general

      // 1. Solicitar URL de upload staged ao Shopify
      const stagedRes = await admin.graphql(`
        mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
          stagedUploadsCreate(input: $input) {
            stagedTargets {
              url
              resourceUrl
              parameters { name value }
            }
            userErrors { field message }
          }
        }
      `, {
        variables: {
          input: [{
            filename,
            mimeType: mimetype,
            resource: "FILE",
            fileSize: String(size),
            httpMethod: "POST",
          }]
        }
      });
      const stagedData = await stagedRes.json();
      const target = stagedData?.data?.stagedUploadsCreate?.stagedTargets?.[0];
      if (!target) return json({ success: false, error: "Falha ao criar staged upload" });

      // 2. Retornar URL e parâmetros para o cliente fazer o upload direto
      return json({
        success: true,
        uploadUrl: target.url,
        resourceUrl: target.resourceUrl,
        parameters: target.parameters,
        category,
        filename,
        mimetype,
      });
    } catch (e) {
      return json({ success: false, error: e.message });
    }
  }

  // Registrar mídia no banco após upload concluído
  if (_action === "registerMedia") {
    try {
      const url      = formData.get("url");
      const filename = formData.get("filename");
      const mimetype = formData.get("mimetype");
      const category = formData.get("category") || "general";
      const label    = formData.get("label") || filename;

      await prisma.media.create({
        data: { url, filename, mimetype, category, label }
      });
      return json({ success: true });
    } catch (e) {
      return json({ success: false, error: e.message });
    }
  }

  // Deletar mídia
  if (_action === "deleteMedia") {
    try {
      const id = formData.get("id");
      await prisma.media.delete({ where: { id } });
      return json({ success: true });
    } catch (e) {
      return json({ success: false, error: e.message });
    }
  }

  // Criar/atualizar guia no banco
  if (_action === "saveGuide") {
    try {
      const id       = formData.get("id");
      const name     = formData.get("name");
      const email    = formData.get("email") || null;
      const whatsapp = formData.get("whatsapp");
      const photoUrl = formData.get("photoUrl") || null;
      const utmId    = formData.get("utmId") || null;
      const baseUrl  = formData.get("baseUrl") || "https://portugalmeandyou.com/";
      // Gera utm_content a partir do nome (ex: "Renan Stein" → "renan_stein")
      const utmContent = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
      const referralLink = utmId
        ? `${baseUrl}?utm_campaign=${utmId}&utm_source=guia&utm_medium=indicacao&utm_content=${utmContent}`
        : null;
      if (id) {
        await prisma.guide.update({ where: { id }, data: { name, email, whatsapp, photoUrl, utmId, referralLink } });
      } else {
        await prisma.guide.create({ data: { name, email, whatsapp, photoUrl, utmId, referralLink } });
      }
      return json({ success: true });
    } catch (e) {
      return json({ success: false, error: e.message });
    }
  }

  // Deletar guia do banco
  if (_action === "deleteGuide") {
    try {
      const id = formData.get("id");
      await prisma.guide.delete({ where: { id } });
      return json({ success: true });
    } catch (e) {
      return json({ success: false, error: e.message });
    }
  }

  return json({ success: true });
};

import { data } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  buildTourPassportUpdate,
  resolveTourByPlatformId,
} from "../utils/tour-passport.server";
import {
  dateInputToUtcMidnight,
  normalizePlatforms,
  parseRecurringDays,
} from "../utils/availability.server";
import { createBookingWithCapacityGuard } from "../utils/capacity.server";
import {
  enqueueAvailabilitySync,
  enqueueBookingSync,
  getSyncQueueStats,
  processSyncQueue,
  requeueSyncJob,
  SYNC_EVENT_TYPES,
} from "../utils/sync-queue.server";
import { localSlotToInstant } from "../utils/gyg-v1.server";
import { handleCentralMediaAction } from "./central-media-actions.server";
import { handleCentralGuideAction } from "./central-guide-actions.server";

// Server-only loader/actions for the PMY Central route. Field mappings persist per platform.
const prisma = db;
const json = (body, init) => data(body, init);

export { loader } from "./central-loader.server";

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const _action = formData.get("_action");

  const mediaAction = await handleCentralMediaAction({
    action: _action,
    formData,
    admin,
    session,
    prisma,
  });
  if (mediaAction) return mediaAction;

  const guideAction = await handleCentralGuideAction({
    action: _action,
    formData,
    prisma,
    session,
  });
  if (guideAction) return guideAction;

  if (_action === "savePlatformFieldMapping") {
    try {
      const shop = session?.shop;
      if (!shop) {
        return json({ success: false, error: "Loja Shopify não identificada." }, { status: 400 });
      }

      const platform = String(formData.get("platform") || "").trim().toLowerCase();
      const allowedPlatforms = new Set([
        "shopify",
        "viator",
        "getyourguide",
        "headout",
        "civitatis",
      ]);

      if (!allowedPlatforms.has(platform)) {
        return json({ success: false, error: "Plataforma inválida." }, { status: 400 });
      }

      const rawMappings = String(formData.get("mappings") || "").trim();
      if (!rawMappings) {
        return json({ success: false, error: "Mapeamento não informado." }, { status: 400 });
      }

      const mappings = JSON.parse(rawMappings);
      if (!mappings || typeof mappings !== "object" || Array.isArray(mappings)) {
        return json({ success: false, error: "Mapeamento inválido." }, { status: 400 });
      }

      const allowedFields = new Set([
        "customerName",
        "tourId",
        "startTime",
        "status",
        "email",
        "phone",
        "quantity",
        "price",
        "currency",
        "bookingRef",
        "language",
      ]);

      const sanitizedMappings = {};
      for (const [field, value] of Object.entries(mappings)) {
        if (!allowedFields.has(field)) continue;
        sanitizedMappings[field] = String(value ?? "").trim();
      }

      const requiredFields = [
        "customerName",
        "tourId",
        "startTime",
        "status",
        "quantity",
        "bookingRef",
      ];
      const missingRequired = requiredFields.filter(
        (field) => !sanitizedMappings[field],
      );

      if (missingRequired.length > 0) {
        return json(
          {
            success: false,
            error: `Campos obrigatórios sem mapeamento: ${missingRequired.join(", ")}.`,
          },
          { status: 400 },
        );
      }

      const saved = await prisma.platformFieldMapping.upsert({
        where: {
          shop_platform: { shop, platform },
        },
        create: {
          shop,
          platform,
          mappings: sanitizedMappings,
        },
        update: {
          mappings: sanitizedMappings,
        },
      });

      return json({
        success: true,
        mapping: {
          platform: saved.platform,
          mappings: saved.mappings,
          updatedAt: saved.updatedAt,
        },
      });
    } catch (error) {
      console.error("[PMY] savePlatformFieldMapping failed:", error);
      return json(
        {
          success: false,
          error: error?.message || "Falha ao salvar mapeamento.",
        },
        { status: 500 },
      );
    }
  }

  if (_action === "saveBusinessSettings") {
    try {
      const shop = session?.shop;
      if (!shop) {
        return json({ success: false, error: "Loja Shopify não identificada." }, { status: 400 });
      }

      const patch = {};

      if (formData.has("logoUrl")) {
        const logoUrl = String(formData.get("logoUrl") || "").trim();
        patch.logoUrl = logoUrl || null;
      }

      if (formData.has("logoOnLightUrl")) {
        const logoOnLightUrl = String(formData.get("logoOnLightUrl") || "").trim();
        if (logoOnLightUrl.startsWith("data:")) {
          return json(
            { success: false, error: "A logo deve apontar para uma mídia persistida, não para Data URL." },
            { status: 400 },
          );
        }
        patch.logoOnLightUrl = logoOnLightUrl || null;
      }

      if (formData.has("logoOnDarkUrl")) {
        const logoOnDarkUrl = String(formData.get("logoOnDarkUrl") || "").trim();
        if (logoOnDarkUrl.startsWith("data:")) {
          return json(
            { success: false, error: "A logo deve apontar para uma mídia persistida, não para Data URL." },
            { status: 400 },
          );
        }
        patch.logoOnDarkUrl = logoOnDarkUrl || null;
      }

      for (const [field, formField] of [
        ["logoOnLightMediaId", "logoOnLightMediaId"],
        ["logoOnDarkMediaId", "logoOnDarkMediaId"],
      ]) {
        if (!formData.has(formField)) continue;
        const mediaId = String(formData.get(formField) || "").trim();

        if (!mediaId) {
          patch[field] = null;
          continue;
        }

        const media = await prisma.media.findFirst({
          where: {
            id: mediaId,
            shop,
            active: true,
          },
          select: { id: true, url: true, mimetype: true },
        });

        if (!media || !String(media.mimetype || "").startsWith("image/")) {
          return json(
            { success: false, error: "Referência de logo inválida na Biblioteca PMY." },
            { status: 400 },
          );
        }

        patch[field] = media.id;
        if (field === "logoOnLightMediaId") patch.logoOnLightUrl = media.url;
        if (field === "logoOnDarkMediaId") patch.logoOnDarkUrl = media.url;
      }

      if (formData.has("theme")) {
        const rawTheme = String(formData.get("theme") || "").trim();
        if (!rawTheme) {
          patch.theme = null;
        } else {
          const parsedTheme = JSON.parse(rawTheme);
          if (!parsedTheme || typeof parsedTheme !== "object" || Array.isArray(parsedTheme)) {
            return json({ success: false, error: "Tema inválido." }, { status: 400 });
          }
          patch.theme = parsedTheme;
        }
      }

      if (formData.has("imageShape")) {
        const imageShape = String(formData.get("imageShape") || "").trim();
        if (!["circle", "rounded"].includes(imageShape)) {
          return json({ success: false, error: "Formato de imagem inválido." }, { status: 400 });
        }
        patch.imageShape = imageShape;
      }

      if (formData.has("fieldMappings")) {
        const rawMappings = String(formData.get("fieldMappings") || "").trim();
        if (!rawMappings) {
          patch.fieldMappings = null;
        } else {
          const parsedMappings = JSON.parse(rawMappings);
          if (!parsedMappings || typeof parsedMappings !== "object" || Array.isArray(parsedMappings)) {
            return json({ success: false, error: "Mapeamento de campos inválido." }, { status: 400 });
          }
          patch.fieldMappings = parsedMappings;
        }
      }

      if (Object.keys(patch).length === 0) {
        return json({ success: false, error: "Nenhuma configuração enviada." }, { status: 400 });
      }

      const settings = await prisma.businessSetting.upsert({
        where: { shop },
        create: { shop, ...patch },
        update: patch,
      });

      return json({ success: true, settings });
    } catch (error) {
      console.error("[PMY] saveBusinessSettings failed:", error);
      return json(
        { success: false, error: error?.message || "Falha ao salvar configurações." },
        { status: 500 },
      );
    }
  }

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

  if (_action === "saveGuideAssignment") {
    try {
      const externalTourId = String(formData.get("tourId") || "").trim();
      const guideId = String(formData.get("guideId") || "").trim();
      const dateKey = String(formData.get("date") || "").trim();
      const timeKey = String(formData.get("time") || "").trim();

      if (!externalTourId || !guideId || !dateKey || !timeKey) {
        return json(
          {
            success: false,
            error: "Tour, guia, data e horário são obrigatórios para publicar a escala.",
          },
          { status: 400 },
        );
      }

      const [tour, guide] = await Promise.all([
        resolveTourByPlatformId(prisma, "SHOPIFY", externalTourId),
        prisma.guide.findUnique({ where: { id: guideId } }),
      ]);

      if (!tour) {
        return json(
          { success: false, error: "Tour mestre não encontrado." },
          { status: 404 },
        );
      }
      if (!guide) {
        return json(
          { success: false, error: "Guia não encontrado." },
          { status: 404 },
        );
      }

      const startTime = localSlotToInstant(
        dateKey,
        timeKey,
        tour.timezone || "Europe/Lisbon",
      );
      if (!startTime) {
        return json(
          { success: false, error: "Data ou horário inválido para a escala." },
          { status: 400 },
        );
      }

      const [guideConflict, departureAssignment] = await Promise.all([
        prisma.guideAssignment.findFirst({
          where: {
            guideId,
            startTime,
            status: "ASSIGNED",
            tourId: { not: tour.id },
          },
          include: { tour: { select: { title: true } } },
        }),
        prisma.guideAssignment.findFirst({
          where: {
            tourId: tour.id,
            startTime,
            status: "ASSIGNED",
          },
        }),
      ]);

      if (guideConflict) {
        return json(
          {
            success: false,
            code: "GUIDE_ALREADY_ASSIGNED",
            error: `${guide.name} já está escalado(a) para ${guideConflict.tour?.title || "outro tour"} neste mesmo horário.`,
          },
          { status: 409 },
        );
      }

      const assignment = departureAssignment
        ? await prisma.guideAssignment.update({
            where: { id: departureAssignment.id },
            data: {
              guideId,
              status: "ASSIGNED",
              source: "MANUAL",
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
          })
        : await prisma.guideAssignment.create({
            data: {
              guideId,
              tourId: tour.id,
              startTime,
              status: "ASSIGNED",
              source: "MANUAL",
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
          });

      return json({
        success: true,
        assignment,
        message: `${guide.name} escalado(a) para ${tour.title} em ${dateKey} às ${timeKey}.`,
      });
    } catch (error) {
      console.error("[PMY] saveGuideAssignment failed:", error);
      if (error?.code === "P2002") {
        return json(
          {
            success: false,
            code: "GUIDE_ASSIGNMENT_CONFLICT",
            error:
              "A saída ou o guia acabou de receber outra escala neste horário. Atualize a Agenda e tente novamente.",
          },
          { status: 409 },
        );
      }
      return json(
        {
          success: false,
          error: error?.message || "Não foi possível publicar a escala do guia.",
        },
        { status: 500 },
      );
    }
  }

  if (_action === "removeGuideAssignment") {
    try {
      const id = String(formData.get("id") || "").trim();
      if (!id) {
        return json(
          { success: false, error: "Escala não informada." },
          { status: 400 },
        );
      }

      const existing = await prisma.guideAssignment.findUnique({
        where: { id },
        include: { guide: true, tour: true },
      });
      if (!existing) {
        return json(
          { success: false, error: "Escala não encontrada." },
          { status: 404 },
        );
      }

      const assignment = await prisma.guideAssignment.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      return json({
        success: true,
        assignment,
        message: `Escala de ${existing.guide.name} em ${existing.tour.title} removida.`,
      });
    } catch (error) {
      console.error("[PMY] removeGuideAssignment failed:", error);
      return json(
        {
          success: false,
          error: error?.message || "Não foi possível remover a escala.",
        },
        { status: 500 },
      );
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

    return json({ success: true });
};

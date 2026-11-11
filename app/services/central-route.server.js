import { applyChecklistOp } from "../utils/departure-checklists.js";
import { normalizePlatformPrices } from "../utils/platform-prices.js";
import { QUOTA_LANGUAGE_KEYS, languageKey, languageLabel } from "../utils/tour-languages.js";
import { data } from "react-router";
import { normalizeAgendaLabels } from "../utils/agenda-labels.js";
import { ADMIN_ONLY_ACTIONS, ROLES, isAdmin, resolveCentralUser } from "../utils/central-access.server.js";
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  ensureDeparture,
  generatePassword,
  hashPassword,
  normalizeEmail,
  passwordProblem,
  safeFileName,
} from "../utils/guide-portal.server.js";
import { normalizeCostSettings } from "../utils/profit.js";
import { authenticateCentral } from "../utils/central-auth.server";
import db from "../db.server";
import {
  buildTourPassportUpdate,
  resolveTourByPlatformId,
} from "../utils/tour-passport.server";
import {
  dateInputToUtcMidnight,
  blockTargetsPlatform,
  normalizePlatforms,
  parseRecurringDays,
} from "../utils/availability.server";
import { createBookingWithCapacityGuard, getCentralAvailability } from "../utils/capacity.server";
import {
  enqueueAvailabilitySync,
  enqueueBookingSync,
  getSyncQueueStats,
  processSyncQueue,
  requeueSyncJob,
  SYNC_EVENT_TYPES,
} from "../utils/sync-queue.server";
import { localSlotToInstant } from "../utils/gyg-v1.server";
import { moveDeparture } from "../utils/departure-move.server";
import { normalizeWaitlistInput, WAITLIST_STATUSES } from "../utils/waitlist";
import { normalizeFeatureFlags, sanitizeFeatureFlagsPatch } from "../utils/feature-flags";
import { syncShopifyAvailabilityMetafields } from "../utils/shopify-availability-metafields.server";
import { handleCentralMediaAction } from "./central-media-actions.server";
import { handleCentralGuideAction } from "./central-guide-actions.server";
import { upsertLanguageQuotaRule } from "../utils/language-quotas.js";

// Server-only loader/actions for the PMY Central route. Field mappings persist per platform.
const prisma = db;
const json = (body, init) => data(body, init);

export { loader } from "./central-loader.server";

const ASSIGNMENT_INCLUDE = {
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
};

// Escala um guia numa saída (passeio + horário).
// - Um guia não pode estar em dois passeios no mesmo horário.
// - Uma saída pode ter vários guias, um por grupo de idioma (languages).
//   Sem idioma = o guia atende todos os idiomas da saída, então não divide com ninguém.
// - replaceDeparture: comportamento antigo (um guia por saída), usado pelo editor
//   de vagas por idioma, que tem um único campo "Guia da saída".
function cleanLanguageList(values) {
  const list = Array.isArray(values) ? values : [];
  return [...new Set(list.map((value) => languageKey(value)).filter((key) => QUOTA_LANGUAGE_KEYS.includes(key)))];
}

async function assignGuideToDeparture({ tour, guide, startTime, languages = [], replaceDeparture = false }) {
  const wanted = cleanLanguageList(languages);
  const [guideConflict, departureAssignments] = await Promise.all([
    prisma.guideAssignment.findFirst({
      where: {
        guideId: guide.id,
        startTime,
        status: "ASSIGNED",
        tourId: { not: tour.id },
      },
      include: { tour: { select: { title: true } } },
    }),
    prisma.guideAssignment.findMany({
      where: { tourId: tour.id, startTime, status: "ASSIGNED" },
      include: { guide: { select: { name: true } } },
    }),
  ]);

  if (guideConflict) {
    return {
      ok: false,
      status: 409,
      code: "GUIDE_ALREADY_ASSIGNED",
      error: `${guide.name} já está escalado(a) para ${guideConflict.tour?.title || "outro tour"} neste mesmo horário.`,
    };
  }

  const mine = departureAssignments.find((item) => item.guideId === guide.id) || null;
  const others = departureAssignments.filter((item) => item.guideId !== guide.id);

  if (replaceDeparture && others.length) {
    await prisma.guideAssignment.updateMany({
      where: { id: { in: others.map((item) => item.id) } },
      data: { status: "CANCELLED" },
    });
  } else if (others.length) {
    const label = (keys) => keys.map((key) => languageLabel(key)).join(", ");
    const allLanguages = others.find((item) => !(item.languages || []).length);
    if (allLanguages) {
      return {
        ok: false,
        status: 409,
        code: "DEPARTURE_HAS_GUIDE",
        error: `${allLanguages.guide?.name || "Outro guia"} já está nesta saída atendendo todos os idiomas. Para dividir em grupos, defina o idioma de cada guia.`,
      };
    }
    if (!wanted.length) {
      return {
        ok: false,
        status: 409,
        code: "LANGUAGE_REQUIRED",
        error: `Esta saída já tem guia (${others.map((item) => `${item.guide?.name} · ${label(item.languages)}`).join("; ")}). Escolha o idioma do grupo deste guia.`,
      };
    }
    const clash = others.find((item) => (item.languages || []).some((key) => wanted.includes(key)));
    if (clash) {
      const shared = (clash.languages || []).filter((key) => wanted.includes(key));
      return {
        ok: false,
        status: 409,
        code: "LANGUAGE_TAKEN",
        error: `${label(shared)} já tem guia nesta saída: ${clash.guide?.name || "outro guia"}.`,
      };
    }
  }

  const assignment = mine
    ? await prisma.guideAssignment.update({
        where: { id: mine.id },
        data: { languages: wanted, source: "MANUAL" },
        include: ASSIGNMENT_INCLUDE,
      })
    : await prisma.guideAssignment.create({
        data: {
          guideId: guide.id,
          tourId: tour.id,
          startTime,
          languages: wanted,
          status: "ASSIGNED",
          source: "MANUAL",
        },
        include: ASSIGNMENT_INCLUDE,
      });

  return { ok: true, assignment };
}

export const action = async ({ request }) => {
  const auth = await authenticateCentral(request);
  const { admin, session } = auth;
  const formData = await request.formData();
  const _action = formData.get("_action");
  const centralUser = await resolveCentralUser(prisma, auth);

  if (ADMIN_ONLY_ACTIONS.has(String(_action || "")) && !isAdmin(centralUser)) {
    return json({ success: false, error: "Acesso restrito a administradores da Central." }, { status: 403 });
  }

  if (_action === "saveCentralUser") {
    try {
      const id = String(formData.get("id") || "").trim();
      const role = String(formData.get("role") || "").trim().toUpperCase();
      const name = formData.has("name") ? String(formData.get("name") || "").trim().slice(0, 80) : undefined;
      if (!id || (role && !ROLES.includes(role))) {
        return json({ success: false, error: "Dados inválidos." }, { status: 400 });
      }
      const target = await prisma.centralUser.findUnique({ where: { id } });
      if (!target) return json({ success: false, error: "Usuário não encontrado." }, { status: 404 });
      if (role === "STAFF" && target.role === "ADMIN") {
        const admins = await prisma.centralUser.count({ where: { role: "ADMIN" } });
        if (admins <= 1) {
          return json({ success: false, error: "A Central precisa de pelo menos um administrador." }, { status: 409 });
        }
      }
      // Ligar este acesso a uma pessoa da Equipe ("" desliga).
      let guideLink;
      if (formData.has("guideId")) {
        const guideId = String(formData.get("guideId") || "").trim();
        if (guideId) {
          const person = await prisma.guide.findUnique({ where: { id: guideId }, select: { id: true, name: true } });
          if (!person) return json({ success: false, error: "Pessoa não encontrada." }, { status: 404 });
          await prisma.centralUser.updateMany({ where: { guideId, NOT: { id } }, data: { guideId: null } });
          guideLink = { guideId, ...(name === undefined ? { name: person.name } : {}) };
        } else {
          guideLink = { guideId: null };
        }
      }
      const user = await prisma.centralUser.update({
        where: { id },
        data: { ...(role ? { role } : {}), ...(name !== undefined ? { name: name || null } : {}), ...(guideLink || {}) },
      });
      return json({ success: true, user });
    } catch (e) {
      console.error("[PMY] saveCentralUser error:", e);
      return json({ success: false, error: "Não foi possível salvar o usuário." }, { status: 500 });
    }
  }

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

  if (_action === "setBookingAttendance") {
    try {
      const bookingId = String(formData.get("bookingId") || "").trim();
      const attendance = String(formData.get("attendance") || "").trim().toUpperCase();
      if (!bookingId) return json({ success: false, error: "Reserva não informada." }, { status: 400 });
      if (attendance && !["COMPLETED", "NO_SHOW"].includes(attendance)) {
        return json({ success: false, error: "Marcação inválida." }, { status: 400 });
      }
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking) return json({ success: false, error: "Reserva não encontrada." }, { status: 404 });
      if (attendance && String(booking.status).toUpperCase() !== "CONFIRMED") {
        return json({ success: false, error: "Só reservas confirmadas podem ser marcadas como realizadas ou no-show." }, { status: 409 });
      }
      if (attendance && new Date(booking.startTime) > new Date()) {
        return json({ success: false, error: "O passeio ainda não aconteceu." }, { status: 409 });
      }
      const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          attendanceStatus: attendance || null,
          attendanceMarkedAt: attendance ? new Date() : null,
        },
        select: { id: true, attendanceStatus: true, attendanceMarkedAt: true },
      });
      return json({ success: true, booking: updated });
    } catch (e) {
      console.error("[PMY] setBookingAttendance error:", e);
      return json({ success: false, error: "Não foi possível salvar a realização." }, { status: 500 });
    }
  }

  if (_action === "setGuidePortalAccess") {
    try {
      const guideId = String(formData.get("guideId") || "").trim();
      const enabled = String(formData.get("enabled") || "") === "1";
      const generate = String(formData.get("generate") || "") === "1";
      const typed = String(formData.get("password") || "");
      const guide = await prisma.guide.findUnique({ where: { id: guideId } });
      if (!guide) return json({ success: false, error: "Guia não encontrado." }, { status: 404 });
      if (enabled && !normalizeEmail(guide.email)) {
        return json({ success: false, error: "Cadastre o e-mail do guia antes de liberar o acesso." }, { status: 400 });
      }
      if (enabled) {
        const duplicate = await prisma.guide.findFirst({
          where: { id: { not: guide.id }, portalEnabled: true, email: { equals: normalizeEmail(guide.email), mode: "insensitive" } },
          select: { name: true },
        });
        if (duplicate) {
          return json({ success: false, error: `O e-mail já é usado pelo acesso de ${duplicate.name}.` }, { status: 409 });
        }
      }
      let newPassword = null;
      if (generate) newPassword = generatePassword();
      else if (typed) {
        const problem = passwordProblem(typed);
        if (problem) return json({ success: false, error: problem }, { status: 400 });
        newPassword = typed;
      }
      const hasPassword = Boolean(newPassword) ||
        (await prisma.guide.count({ where: { id: guideId, passwordHash: { not: null } } })) > 0;
      if (enabled && !hasPassword) {
        return json({ success: false, error: "Defina uma senha para liberar o acesso." }, { status: 400 });
      }
      await prisma.guide.update({
        where: { id: guideId },
        data: { portalEnabled: enabled, ...(newPassword ? { passwordHash: hashPassword(newPassword) } : {}) },
      });
      // Nova senha ou acesso desligado: derruba as sessões abertas.
      if (newPassword || !enabled) await prisma.guideSession.deleteMany({ where: { guideId } });
      return json({
        success: true,
        guide: { id: guideId, portalEnabled: enabled, portalHasPassword: hasPassword },
        password: newPassword,
      });
    } catch (e) {
      console.error("[PMY] setGuidePortalAccess error:", e);
      return json({ success: false, error: "Não foi possível salvar o acesso do guia." }, { status: 500 });
    }
  }

  if (_action === "setBookingGroup") {
    try {
      const bookingId = String(formData.get("bookingId") || "").trim();
      const guideId = String(formData.get("guideId") || "").trim() || null;
      const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true, tourId: true, startTime: true } });
      if (!booking) return json({ success: false, error: "Reserva não encontrada." }, { status: 404 });
      if (guideId) {
        const start = new Date(booking.startTime);
        const assigned = await prisma.guideAssignment.findFirst({
          where: {
            guideId, tourId: booking.tourId, status: "ASSIGNED",
            startTime: { gte: new Date(start.getTime() - 60000), lte: new Date(start.getTime() + 60000) },
          },
          select: { id: true },
        });
        if (!assigned) return json({ success: false, error: "Esse guia não está escalado nesta saída." }, { status: 409 });
      }
      const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: { groupGuideId: guideId },
        select: { id: true, groupGuideId: true },
      });
      return json({ success: true, booking: updated });
    } catch (e) {
      console.error("[PMY] setBookingGroup error:", e);
      return json({ success: false, error: "Não foi possível mudar o grupo." }, { status: 500 });
    }
  }

  if (_action === "resetDepartureCheck") {
    try {
      const tourId = String(formData.get("tourId") || "").trim();
      const startTime = new Date(String(formData.get("startTime") || ""));
      const step = String(formData.get("step") || "");
      const order = ["start", "mid", "end"];
      const index = order.indexOf(step);
      if (!tourId || Number.isNaN(startTime.getTime()) || index < 0) {
        return json({ success: false, error: "Saída ou etapa inválida." }, { status: 400 });
      }
      // Desfazer uma etapa desfaz também as seguintes (Início → Meio → Fim).
      const fields = { start: "checkStartAt", mid: "checkMidAt", end: "checkEndAt" };
      const data = Object.fromEntries(order.slice(index).map((key) => [fields[key], null]));
      const departure = await prisma.tourDeparture.update({
        where: { tourId_startTime: { tourId, startTime } },
        data,
        select: { checkStartAt: true, checkMidAt: true, checkEndAt: true },
      });
      return json({ success: true, checks: departure });
    } catch (e) {
      console.error("[PMY] resetDepartureCheck error:", e);
      return json({ success: false, error: "Não foi possível desfazer o check." }, { status: 500 });
    }
  }

  if (_action === "uploadDepartureAttachment") {
    try {
      const tourId = String(formData.get("tourId") || "").trim();
      const startTime = new Date(String(formData.get("startTime") || ""));
      const file = formData.get("file");
      if (!tourId || Number.isNaN(startTime.getTime()) || !file || typeof file.arrayBuffer !== "function") {
        return json({ success: false, error: "Arquivo ou saída inválidos." }, { status: 400 });
      }
      const mimeType = String(file.type || "").toLowerCase();
      if (!ALLOWED_ATTACHMENT_TYPES.has(mimeType)) {
        return json({ success: false, error: "Envie PDF ou imagem (JPG, PNG, WEBP, HEIC)." }, { status: 400 });
      }
      if (!file.size || file.size > MAX_ATTACHMENT_BYTES) {
        return json({ success: false, error: "Arquivo vazio ou maior que 8 MB." }, { status: 400 });
      }
      const departure = await ensureDeparture(prisma, tourId, startTime);
      const count = await prisma.departureAttachment.count({ where: { departureId: departure.id } });
      if (count >= 20) return json({ success: false, error: "Limite de 20 arquivos por saída." }, { status: 400 });
      const attachment = await prisma.departureAttachment.create({
        data: {
          departureId: departure.id,
          fileName: safeFileName(file.name),
          mimeType,
          size: file.size,
          data: Buffer.from(await file.arrayBuffer()),
          uploadedBy: centralUser?.name || centralUser?.shopifyUserId || "central",
        },
        select: { id: true, fileName: true, mimeType: true, size: true, createdAt: true },
      });
      return json({ success: true, attachment, departureId: departure.id });
    } catch (e) {
      console.error("[PMY] uploadDepartureAttachment error:", e);
      return json({ success: false, error: "Não foi possível enviar o arquivo." }, { status: 500 });
    }
  }

  if (_action === "removeDepartureAttachment") {
    try {
      const id = String(formData.get("id") || "").trim();
      await prisma.departureAttachment.delete({ where: { id } });
      return json({ success: true, id });
    } catch (e) {
      console.error("[PMY] removeDepartureAttachment error:", e);
      return json({ success: false, error: "Não foi possível remover o arquivo." }, { status: 500 });
    }
  }

  if (_action === "updateDepartureChecklist") {
    try {
      const tourId = String(formData.get("tourId") || "").trim();
      const startTime = new Date(String(formData.get("startTime") || ""));
      let op;
      try { op = JSON.parse(String(formData.get("op") || "{}")); } catch { op = null; }
      if (!tourId || Number.isNaN(startTime.getTime()) || !op?.type) {
        return json({ success: false, error: "Saída ou checklist inválido." }, { status: 400 });
      }
      const by = centralUser?.name || centralUser?.email || "Equipe";
      const existing = await prisma.tourDeparture.findUnique({
        where: { tourId_startTime: { tourId, startTime } },
        select: { checklists: true },
      });
      const checklists = applyChecklistOp(existing?.checklists, op, by);
      const departure = await prisma.tourDeparture.upsert({
        where: { tourId_startTime: { tourId, startTime } },
        create: { tourId, startTime, checklists },
        update: { checklists },
        select: { tourId: true, startTime: true, checklists: true },
      });
      return json({ success: true, departure });
    } catch (e) {
      console.error("[PMY] updateDepartureChecklist error:", e);
      return json({ success: false, error: e?.message?.startsWith("Limite") || e?.message?.startsWith("Operação") ? e.message : "Não foi possível salvar o checklist." }, { status: 500 });
    }
  }

  // Funcionalidades opcionais (tudo novo chega desligado).
  const featureEnabled = async (key) => {
    const row = session?.shop
      ? await prisma.businessSetting.findUnique({ where: { shop: session.shop }, select: { featureFlags: true } }).catch(() => null)
      : null;
    return normalizeFeatureFlags(row?.featureFlags)[key];
  };

  if (_action === "saveFeatureFlags") {
    try {
      const shop = session?.shop;
      if (!shop) return json({ success: false, error: "Loja Shopify não identificada." }, { status: 400 });
      let patch;
      try { patch = sanitizeFeatureFlagsPatch(JSON.parse(String(formData.get("featureFlags") || "{}"))); }
      catch (e) { return json({ success: false, error: e?.message || "Funcionalidades inválidas." }, { status: 400 }); }
      const current = await prisma.businessSetting.findUnique({ where: { shop }, select: { featureFlags: true } });
      const featureFlags = { ...normalizeFeatureFlags(current?.featureFlags), ...patch };
      await prisma.businessSetting.upsert({ where: { shop }, create: { shop, featureFlags }, update: { featureFlags } });
      return json({ success: true, featureFlags });
    } catch (e) {
      console.error("[PMY] saveFeatureFlags error:", e);
      return json({ success: false, error: "Não foi possível salvar." }, { status: 500 });
    }
  }

  if ((_action === "addWaitlistEntry" || _action === "setWaitlistStatus") && !(await featureEnabled("waitlist"))) {
    return json({ success: false, error: "A lista de espera está desligada em Configurações → Funcionalidades." }, { status: 403 });
  }
  if (_action === "moveDeparture" && !(await featureEnabled("boardMove"))) {
    return json({ success: false, error: "Mover saídas está desligado em Configurações → Funcionalidades." }, { status: 403 });
  }

  if (_action === "addWaitlistEntry") {
    try {
      const tourId = String(formData.get("tourId") || "").trim();
      const startTime = new Date(String(formData.get("startTime") || ""));
      if (!tourId || Number.isNaN(startTime.getTime())) {
        return json({ success: false, error: "Saída inválida." }, { status: 400 });
      }
      let input;
      try { input = normalizeWaitlistInput(JSON.parse(String(formData.get("entry") || "{}"))); }
      catch (e) { return json({ success: false, error: e?.message || "Dados inválidos." }, { status: 400 }); }
      const entry = await prisma.waitlistEntry.create({
        data: { tourId, startTime, ...input, createdBy: centralUser?.name || centralUser?.email || "Equipe" },
      });
      return json({ success: true, entry });
    } catch (e) {
      console.error("[PMY] addWaitlistEntry error:", e);
      return json({ success: false, error: "Não foi possível adicionar à lista de espera." }, { status: 500 });
    }
  }

  if (_action === "setWaitlistStatus") {
    try {
      const id = String(formData.get("id") || "").trim();
      const status = String(formData.get("status") || "").trim().toUpperCase();
      if (!id || !WAITLIST_STATUSES.includes(status)) {
        return json({ success: false, error: "Status inválido." }, { status: 400 });
      }
      const entry = await prisma.waitlistEntry.update({
        where: { id },
        data: { status, ...(status === "NOTIFIED" ? { notifiedAt: new Date() } : {}) },
      });
      return json({ success: true, entry });
    } catch (e) {
      console.error("[PMY] setWaitlistStatus error:", e);
      return json({ success: false, error: "Não foi possível atualizar a lista de espera." }, { status: 500 });
    }
  }

  if (_action === "moveDeparture") {
    try {
      const tourId = String(formData.get("tourId") || "").trim();
      const fromStartTime = new Date(String(formData.get("fromStartTime") || ""));
      const dateKey = String(formData.get("date") || "").trim();
      const timeKey = String(formData.get("time") || "").trim();
      const tour = tourId ? await prisma.tour.findUnique({ where: { id: tourId }, select: { id: true, title: true, timezone: true } }) : null;
      if (!tour) return json({ success: false, error: "Passeio não encontrado." }, { status: 404 });
      const toStartTime = localSlotToInstant(dateKey, timeKey, tour.timezone || "Europe/Lisbon");
      if (!toStartTime) return json({ success: false, error: "Data ou horário de destino inválido." }, { status: 400 });

      const by = centralUser?.name || centralUser?.email || "Administrador";
      const moved = await moveDeparture(prisma, { tourId: tour.id, fromStartTime, toStartTime, by });

      // As vagas mudam nas duas datas: avisa as plataformas conectadas.
      for (const startTime of [fromStartTime, toStartTime]) {
        await enqueueAvailabilitySync(prisma, {
          tourId: tour.id,
          startTime,
          sourcePlatform: "CENTRAL",
          force: true,
          payload: { reason: "DEPARTURE_MOVED", by },
        }).catch((e) => console.error("[PMY] moveDeparture availability sync failed:", e?.message || e));
      }

      return json({ success: true, toStartTime: toStartTime.toISOString(), ...moved });
    } catch (e) {
      console.error("[PMY] moveDeparture error:", e);
      return json({ success: false, error: e?.status === 400 ? e.message : "Não foi possível mover a saída." }, { status: e?.status || 500 });
    }
  }

  if (_action === "saveDepartureTags") {
    try {
      const tourId = String(formData.get("tourId") || "").trim();
      const startTime = new Date(String(formData.get("startTime") || ""));
      let tagIds;
      try { tagIds = JSON.parse(String(formData.get("tagIds") || "[]")); } catch { tagIds = null; }
      if (!tourId || Number.isNaN(startTime.getTime()) || !Array.isArray(tagIds)) {
        return json({ success: false, error: "Saída ou etiquetas inválidas." }, { status: 400 });
      }
      const settings = session?.shop
        ? await prisma.businessSetting.findUnique({ where: { shop: session.shop }, select: { agendaLabels: true } })
        : null;
      const known = new Set(normalizeAgendaLabels(settings?.agendaLabels).tags.map((tag) => tag.id));
      const cleanIds = [...new Set(tagIds.map(String))].filter((id) => known.has(id));
      const departure = await prisma.tourDeparture.upsert({
        where: { tourId_startTime: { tourId, startTime } },
        create: { tourId, startTime, tagIds: cleanIds },
        update: { tagIds: cleanIds },
        select: { id: true, tourId: true, startTime: true, tagIds: true },
      });
      return json({ success: true, departure });
    } catch (e) {
      console.error("[PMY] saveDepartureTags error:", e);
      return json({ success: false, error: "Não foi possível salvar as etiquetas da saída." }, { status: 500 });
    }
  }

  if (_action === "savePlatformPrices") {
    try {
      const shop = session?.shop;
      if (!shop) return json({ success: false, error: "Loja Shopify não identificada." }, { status: 400 });
      let raw;
      try { raw = JSON.parse(String(formData.get("platformPrices") || "{}")); } catch {
        return json({ success: false, error: "Formato inválido." }, { status: 400 });
      }
      const platformPrices = normalizePlatformPrices(raw);
      await prisma.businessSetting.upsert({
        where: { shop },
        create: { shop, platformPrices },
        update: { platformPrices },
      });
      return json({ success: true, platformPrices });
    } catch (e) {
      console.error("[PMY] savePlatformPrices error:", e);
      return json({ success: false, error: "Não foi possível salvar os preços." }, { status: 500 });
    }
  }

  if (_action === "saveCostSettings") {
    try {
      const shop = session?.shop;
      if (!shop) return json({ success: false, error: "Loja Shopify não identificada." }, { status: 400 });
      let raw;
      try { raw = JSON.parse(String(formData.get("costSettings") || "{}")); } catch {
        return json({ success: false, error: "Formato inválido." }, { status: 400 });
      }
      const costSettings = normalizeCostSettings(raw);
      await prisma.businessSetting.upsert({
        where: { shop },
        create: { shop, costSettings },
        update: { costSettings },
      });
      return json({ success: true, costSettings });
    } catch (e) {
      console.error("[PMY] saveCostSettings error:", e);
      return json({ success: false, error: "Não foi possível salvar os custos." }, { status: 500 });
    }
  }

  if (_action === "saveAgendaLabels") {
    try {
      const shop = session?.shop;
      if (!shop) return json({ success: false, error: "Loja Shopify não identificada." }, { status: 400 });
      let raw;
      try { raw = JSON.parse(String(formData.get("agendaLabels") || "{}")); } catch {
        return json({ success: false, error: "Formato inválido." }, { status: 400 });
      }
      const agendaLabels = normalizeAgendaLabels(raw);
      await prisma.businessSetting.upsert({
        where: { shop },
        create: { shop, agendaLabels },
        update: { agendaLabels },
      });
      return json({ success: true, agendaLabels });
    } catch (e) {
      console.error("[PMY] saveAgendaLabels error:", e);
      return json({ success: false, error: "Não foi possível salvar as cores." }, { status: 500 });
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
        if (logoUrl.startsWith("data:")) {
          return json(
            { success: false, error: "A logo deve apontar para uma mídia persistida, não para Data URL." },
            { status: 400 },
          );
        }
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

      const existingTour = await prisma.tour.findUnique({
        where: { id },
        include: {
          variants: true,
          gygProductOptions: {
            include: { variants: true },
          },
        },
      });
      if (!existingTour) {
        return json({ success: false, error: "Tour mestre não encontrado." }, { status: 404 });
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

      let optionMappings = null;
      if (formData.has("gygOptionMappings")) {
        const rawMappings = String(formData.get("gygOptionMappings") || "").trim();
        try {
          const parsed = rawMappings ? JSON.parse(rawMappings) : {};
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("object required");
          }

          const allowedOptionIds = new Set(
            (existingTour.gygProductOptions || []).map((option) => option.id),
          );
          optionMappings = Object.fromEntries(
            Object.entries(parsed)
              .filter(([optionId]) => allowedOptionIds.has(optionId))
              .map(([optionId, value]) => [
                optionId,
                String(value || "").trim() || null,
              ]),
          );
        } catch {
          return json(
            { success: false, error: "Mapeamento de opções GYG inválido." },
            { status: 400 },
          );
        }

        const optionIds = Object.values(optionMappings).filter(Boolean);
        if (new Set(optionIds).size !== optionIds.length) {
          return json(
            {
              success: false,
              error: "Cada GYG option ID deve ser único dentro do tour.",
            },
            { status: 400 },
          );
        }

        if (optionIds.length > 0) {
          const conflict = await prisma.gygProductOption.findFirst({
            where: {
              gygOptionId: { in: optionIds },
              tourId: { not: id },
            },
            select: {
              gygOptionId: true,
              tour: { select: { title: true } },
            },
          });
          if (conflict) {
            return json(
              {
                success: false,
                error:
                  `O GYG option ID ${conflict.gygOptionId} já está vinculado ao tour "${conflict.tour?.title || "outro tour"}".`,
              },
              { status: 409 },
            );
          }
        }
      }

      const operations = [
        prisma.tour.update({
          where: { id },
          data: update,
        }),
      ];

      if (optionMappings) {
        for (const option of existingTour.gygProductOptions || []) {
          if (!Object.prototype.hasOwnProperty.call(optionMappings, option.id)) {
            continue;
          }
          operations.push(
            prisma.gygProductOption.update({
              where: { id: option.id },
              data: { gygOptionId: optionMappings[option.id] },
            }),
          );
        }
      }

      await prisma.$transaction(operations);

      const tour = await prisma.tour.findUnique({
        where: { id },
        include: {
          variants: true,
          gygProductOptions: {
            include: { variants: true },
            orderBy: { title: "asc" },
          },
        },
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

      let languages = [];
      try { languages = JSON.parse(String(formData.get("languages") || "[]")); } catch { languages = []; }
      const assigned = await assignGuideToDeparture({ tour, guide, startTime, languages });
      if (!assigned.ok) {
        return json(
          { success: false, code: assigned.code, error: assigned.error },
          { status: assigned.status },
        );
      }
      const assignment = assigned.assignment;

      return json({
        success: true,
        assignment,
        message: `${guide.name} escalado(a) para ${tour.title} em ${dateKey} às ${timeKey}${
          assignment.languages?.length ? ` (${assignment.languages.map((key) => languageLabel(key)).join(", ")})` : ""
        }.`,
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

      let shopifyMirror = null;
      if (platforms.includes("shopify")) try {
        shopifyMirror = await syncShopifyAvailabilityMetafields(
          prisma,
          admin,
          tour.id,
        );
      } catch (mirrorError) {
        console.error("[PMY] Shopify availability metafield mirror failed:", mirrorError);
        if (created.length) {
          await prisma.blockedDate.updateMany({
            where: { id: { in: created.map((block) => block.id) } },
            data: { syncStatus: "SHOPIFY_MIRROR_ERROR" },
          });
        }
        return json(
          {
            success: false,
            code: "SHOPIFY_AVAILABILITY_MIRROR_FAILED",
            protectedInCentral: true,
            error:
              "O bloqueio foi aplicado na Central, mas o campo do produto Shopify não pôde ser atualizado. A compra continua protegida pela disponibilidade da Central.",
          },
          { status: 502 },
        );
      }

      return json({
        success: true,
        created: created.length,
        shopifyMirror,
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

      if (existingBlock?.tourId && blockTargetsPlatform(existingBlock, "shopify")) {
        try {
          await syncShopifyAvailabilityMetafields(
            prisma,
            admin,
            existingBlock.tourId,
          );
        } catch (mirrorError) {
          console.error("[PMY] Shopify availability metafield release failed:", mirrorError);
          return json(
            {
              success: false,
              code: "SHOPIFY_AVAILABILITY_MIRROR_FAILED",
              releasedInCentral: true,
              error:
                "O bloqueio foi liberado na Central, mas o campo do produto Shopify não pôde ser atualizado.",
            },
            { status: 502 },
          );
        }
      }

      return json({ success: true });
    } catch (e) {
      console.error("[PMY] removeBlock error:", e);
      return json({ success: false, error: e.message }, { status: 500 });
    }
  }

  if (_action === "getSharedSeats") {
    try {
      const productId = String(formData.get("tourId") || "");
      const date = String(formData.get("date") || "");
      const time = String(formData.get("time") || "");
      const tour = await resolveTourByPlatformId(prisma, "SHOPIFY", productId);
      if (!tour) return json({success:false,error:"Passeio não encontrado."},{status:404});
      const startTime = localSlotToInstant(date, time, tour.timezone || "Europe/Lisbon");
      if (!startTime) return json({success:false,error:"Data ou horário inválido."},{status:400});
      const result = await getCentralAvailability(prisma, {
        tourId:tour.id, startTime, platform:"central",
      });
      const quota = result.languageQuota;
      return json({success:true,capacity:result.capacity,occupiedSeats:result.occupiedSeats,
        remainingSeats:Math.max(0,result.capacity-result.occupiedSeats),date,time,
        languages: quota ? quota.languages : null,
        languageRule: quota ? { date: quota.ruleDate, unassignedSeats: quota.unassignedSeats,
          poolRemaining: quota.poolRemaining } : null});
    } catch (error) {
      console.error("[PMY] getSharedSeats failed:",error);
      return json({success:false,error:"Falha ao consultar vagas."},{status:500});
    }
  }

  if (_action === "saveChannelCapacity") {
    try {
      const shopifyProductId = String(formData.get("tourId") || "");
      const platform = String(formData.get("platform") || "").toLowerCase();
      const rawLimit = String(formData.get("limit") || "");
      const allowed = ["shopify", "getyourguide", "viator", "civitatis", "headout"];
      if (!allowed.includes(platform) || !/^(0|[1-9][0-9]{0,3})$/.test(rawLimit)) {
        return json({ success:false, error:"Canal ou limite inválido (0–9999)." }, { status:400 });
      }
      const tour = await resolveTourByPlatformId(prisma, "SHOPIFY", shopifyProductId);
      if (!tour) return json({success:false,error:"Passeio mestre não encontrado."},{status:404});
      const limits = tour.platformCapacityLimits && typeof tour.platformCapacityLimits === "object" &&
        !Array.isArray(tour.platformCapacityLimits) ? tour.platformCapacityLimits : {};
      const next = { ...limits, [platform]: Number(rawLimit) };
      // Only explicitly configured channel allocations participate in the shared pool.
      // The physical tour capacity becomes their sum when the allocation model is enabled.
      const totalCapacity = allowed.reduce((sum, key) => {
        const value = next[key];
        return sum + (Number.isInteger(value) && value >= 0 ? value : 0);
      }, 0);
      const updated = await prisma.tour.update({
        where:{id:tour.id},
        data:{
          platformCapacityLimits:next,
          maxCapacity:totalCapacity,
          capacitySource:"CHANNEL_SUM",
        },
      });
      await enqueueAvailabilitySync(prisma, {
        eventType: SYNC_EVENT_TYPES.CAPACITY_CHANGED,
        tourId: tour.id, scope:"TOUR", sourcePlatform:"CENTRAL",
        force:true, aggregateType:"TOUR", aggregateId:tour.id,
        payload:{platform,channelLimit:Number(rawLimit),maxCapacity:totalCapacity},
      });
      return json({success:true,platform,limit:Number(rawLimit),limits:next,maxCapacity:updated.maxCapacity});
    } catch(e) {
      console.error("[PMY] saveChannelCapacity error:",e);
      return json({success:false,error:"Não foi possível salvar o limite do canal."},{status:500});
    }
  }

  if (_action === "saveLanguageQuotas") {
    try {
      const shopifyProductId = String(formData.get("tourId") || "");
      const date = String(formData.get("date") || "").trim() || null;
      let times = [];
      try {
        times = JSON.parse(String(formData.get("times") || "[]"));
      } catch {
        times = [];
      }
      if (!Array.isArray(times)) times = [];
      const legacyTime = String(formData.get("time") || "").trim();
      if (!times.length && legacyTime) times = [legacyTime];
      times = [...new Set(times.map((value) => String(value || "").trim()).filter(Boolean))];
      if (!times.length || times.length > 48) {
        return json({ success:false, error:"Selecione pelo menos um horário." }, { status:400 });
      }

      const skipQuotas = String(formData.get("skipQuotas") || "") === "1";
      let languages = [];
      if (!skipQuotas) {
        try {
          languages = JSON.parse(String(formData.get("languages") || "[]"));
        } catch {
          return json({ success:false, error:"Lista de idiomas inválida." }, { status:400 });
        }
        if (!Array.isArray(languages) || languages.length > 30) {
          return json({ success:false, error:"Lista de idiomas inválida." }, { status:400 });
        }
      }

      // guideId ausente = não mexer na escala; "" = retirar o guia; id = escalar.
      const guideField = formData.has("guideId") ? String(formData.get("guideId") || "").trim() : null;
      if (guideField !== null && !date) {
        return json({ success:false, error:"Escolha uma data para escalar o guia." }, { status:400 });
      }

      const tour = await resolveTourByPlatformId(prisma, "SHOPIFY", shopifyProductId);
      if (!tour) return json({success:false,error:"Passeio mestre não encontrado."},{status:404});

      const guide = guideField
        ? await prisma.guide.findUnique({ where: { id: guideField } })
        : null;
      if (guideField && !guide) {
        return json({ success:false, error:"Guia não encontrado." }, { status:404 });
      }

      const timeZone = tour.timezone || "Europe/Lisbon";
      const startTimes = new Map();
      if (date) {
        for (const time of times) {
          const startTime = localSlotToInstant(date, time, timeZone);
          if (!startTime) {
            return json({ success:false, error:`Data ou horário inválido (${time}).` }, { status:400 });
          }
          startTimes.set(time, startTime);
        }
      }

      let next = tour.languageSlotQuotas;
      if (!skipQuotas) {
        try {
          for (const time of times) {
            next = upsertLanguageQuotaRule(next, { date, time, languages });
          }
        } catch (validationError) {
          return json({ success:false, error:validationError.message }, { status:400 });
        }

        await prisma.tour.update({
          where:{ id:tour.id },
          data:{ languageSlotQuotas: next },
        });
        await enqueueAvailabilitySync(prisma, {
          eventType: SYNC_EVENT_TYPES.CAPACITY_CHANGED,
          tourId: tour.id, scope:"TOUR", sourcePlatform:"CENTRAL",
          force:true, aggregateType:"TOUR", aggregateId:tour.id,
          payload:{ languageQuota:{ date, times, languages } },
        });
      }

      const assignments = [];
      const removedAssignmentIds = [];
      const guideErrors = [];
      if (guideField !== null) {
        for (const time of times) {
          const startTime = startTimes.get(time);
          if (guide) {
            const assigned = await assignGuideToDeparture({ tour, guide, startTime, replaceDeparture: true });
            if (assigned.ok) assignments.push(assigned.assignment);
            else guideErrors.push(`${time}: ${assigned.error}`);
          } else {
            const current = await prisma.guideAssignment.findMany({
              where: { tourId: tour.id, startTime, status: "ASSIGNED" },
              select: { id: true },
            });
            if (current.length) {
              await prisma.guideAssignment.updateMany({
                where: { id: { in: current.map((item) => item.id) } },
                data: { status: "CANCELLED" },
              });
              removedAssignmentIds.push(...current.map((item) => item.id));
            }
          }
        }
      }

      const parts = [];
      if (!skipQuotas) {
        parts.push(languages.length
          ? `Vagas por idioma salvas em ${times.length} horário(s).`
          : `Controle por idioma removido de ${times.length} horário(s).`);
      }
      if (guide && assignments.length) parts.push(`${guide.name} escalado(a) em ${assignments.length} horário(s).`);
      if (guideField === "" && removedAssignmentIds.length) parts.push("Guia retirado da escala.");

      return json({
        success:true,
        rules: next,
        assignments,
        removedAssignmentIds,
        guideErrors,
        message: [...parts, ...guideErrors].join(" "),
      });
    } catch (e) {
      console.error("[PMY] saveLanguageQuotas error:", e);
      if (e?.code === "P2002") {
        return json({
          success:false,
          error:"A saída ou o guia acabou de receber outra escala neste horário. Atualize a Agenda e tente novamente.",
        }, { status:409 });
      }
      return json({success:false,error:"Não foi possível salvar as vagas por idioma."},{status:500});
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
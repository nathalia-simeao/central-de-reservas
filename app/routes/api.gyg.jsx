/**
 * app/routes/api.gyg.jsx
 *
 * Endpoints obrigatórios da GetYourGuide Supplier API
 * Documentação: https://integrator.getyourguide.com/documentation/overview
 *
 * A GYG chama ESTE servidor (supplier-side):
 *   GET  /api/gyg/get-availabilities
 *   POST /api/gyg/reserve
 *   POST /api/gyg/cancel-reservation
 *   POST /api/gyg/book
 *   POST /api/gyg/cancel-booking
 *
 * Seu servidor chama A GYG (gyg-side) — ver helper notifyGYG() no final.
 *
 * Autenticação: HTTP Basic Auth em AMBAS as direções.
 * Configure as variáveis de ambiente:
 *   GYG_INCOMING_USER=usuario_que_gyg_usa_para_chamar_voce
 *   GYG_INCOMING_PASS=senha_que_gyg_usa_para_chamar_voce
 *   GYG_OUTGOING_USER=usuario_que_voce_usa_para_chamar_gyg
 *   GYG_OUTGOING_PASS=senha_que_voce_usa_para_chamar_gyg
 *   GYG_API_BASE=https://api.getyourguide.com  (ou URL do sandbox)
 */

import db from "../db.server";

const prisma = db;

// ─────────────────────────────────────────────
// AUTENTICAÇÃO BASIC AUTH (GYG → seu sistema)
// ─────────────────────────────────────────────

function checkBasicAuth(request) {
  const authHeader = request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Basic ")) return false;

  const base64 = authHeader.slice(6);
  const decoded = Buffer.from(base64, "base64").toString("utf-8");
  const [user, pass] = decoded.split(":");

  const expectedUser = process.env.GYG_INCOMING_USER || "gyg_user";
  const expectedPass = process.env.GYG_INCOMING_PASS || "gyg_pass";

  return user === expectedUser && pass === expectedPass;
}

// Resposta padrão GYG: sempre HTTP 200, mesmo para erros
function gygResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ─────────────────────────────────────────────
// ROTEADOR PRINCIPAL
// A GYG vai chamar /api/gyg com query param ?action=
// ou você pode criar routes separados — veja comentário abaixo.
// ─────────────────────────────────────────────

/**
 * OPÇÃO RECOMENDADA: criar um arquivo por endpoint.
 * Ex: app/routes/api.gyg.get-availabilities.jsx
 *     app/routes/api.gyg.reserve.jsx
 *     etc.
 *
 * Este arquivo usa um único route com switch no action param
 * para simplificar. Adapte conforme sua estrutura de pastas.
 */

export const loader = async ({ request }) => {
  // GET /api/gyg?action=get-availabilities
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (!checkBasicAuth(request)) {
    return gygResponse({ error: "Unauthorized" }, 200); // GYG exige 200 mesmo em erro
  }

  if (action === "get-availabilities") {
    return handleGetAvailabilities(request, url);
  }

  return gygResponse({ error: "Unknown action" });
};

export const action = async ({ request }) => {
  // POST /api/gyg?action=reserve|book|cancel-reservation|cancel-booking
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (!checkBasicAuth(request)) {
    return gygResponse({ error: "Unauthorized" }, 200);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return gygResponse({ error: "Invalid JSON body" });
  }

  switch (action) {
    case "reserve":            return handleReserve(body);
    case "cancel-reservation": return handleCancelReservation(body);
    case "book":               return handleBook(body);
    case "cancel-booking":     return handleCancelBooking(body);
    default:
      return gygResponse({ error: "Unknown action" });
  }
};

// ─────────────────────────────────────────────
// GET /api/gyg?action=get-availabilities
//
// GYG pergunta: "Quais horários e vagas este tour tem?"
// Você responde com os slots disponíveis.
// ─────────────────────────────────────────────

async function handleGetAvailabilities(request, url) {
  try {
    const activityId = url.searchParams.get("activity_id");
    const dateFrom   = url.searchParams.get("date_from"); // YYYY-MM-DD
    const dateTo     = url.searchParams.get("date_to");   // YYYY-MM-DD

    if (!activityId) {
      return gygResponse({ error: "activity_id is required" });
    }

    // Busca o tour no banco pelo SKU ou ID externo GYG
    // Adapte este campo conforme você mapeia activityId → seu tourId
    const tour = await prisma.tour.findFirst({
      where: {
        // Ajuste o campo abaixo conforme seu schema:
        // Ex: gygActivityId: activityId  (se tiver esse campo)
        // Ex: title: activityId          (fallback simples)
        id: activityId,
      },
      include: { bookings: true },
    });

    if (!tour) {
      return gygResponse({
        availabilities: [],
        message: "Tour not found",
      });
    }

    // Busca reservas confirmadas no período para calcular vagas ocupadas
    const from = dateFrom ? new Date(dateFrom) : new Date();
    const to   = dateTo   ? new Date(dateTo + "T23:59:59") : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const confirmedBookings = await prisma.booking.findMany({
      where: {
        tourId: tour.id,
        status: "CONFIRMED",
        startTime: { gte: from, lte: to },
      },
    });

    // Capacidade máxima por slot (ajuste conforme sua lógica)
    const MAX_CAPACITY = 20;

    // Gera slots de disponibilidade para cada dia do período
    // Horários padrão — idealmente viriam do metafield do produto Shopify
    const DEFAULT_TIMES = ["09:00", "14:00"];

    const availabilities = [];
    const cursor = new Date(from);

    while (cursor <= to) {
      const dateStr = cursor.toISOString().split("T")[0];

      for (const time of DEFAULT_TIMES) {
        const [hh, mm] = time.split(":").map(Number);
        const slotStart = new Date(cursor);
        slotStart.setHours(hh, mm, 0, 0);

        // Conta reservas neste slot específico
        const occupied = confirmedBookings.filter(b => {
          const bt = new Date(b.startTime);
          return bt.toISOString().startsWith(dateStr) &&
                 bt.getHours() === hh &&
                 bt.getMinutes() === mm;
        }).length;

        const available = MAX_CAPACITY - occupied;

        if (available > 0) {
          availabilities.push({
            // Formato ISO 8601 com offset — obrigatório pela GYG
            datetime: slotStart.toISOString().replace("Z", "+00:00"),
            vacancies: available,
            pricing: [
              {
                category: "ADULT",
                price: {
                  amount:   tour.priceAdult || 50,
                  currency: "EUR",
                },
              },
              {
                category: "YOUTH",
                price: {
                  amount:   tour.priceYouth || 35,
                  currency: "EUR",
                },
              },
              {
                category: "CHILD",
                price: {
                  amount:   tour.priceChild || 25,
                  currency: "EUR",
                },
              },
            ],
          });
        }
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return gygResponse({ availabilities });
  } catch (err) {
    console.error("[GYG] get-availabilities error:", err);
    return gygResponse({ error: err.message, availabilities: [] });
  }
}

// ─────────────────────────────────────────────
// POST /api/gyg?action=reserve
//
// GYG solicita uma PRÉ-RESERVA (hold de vagas).
// Você deve segurar as vagas por 60 min (mín. 15 min).
// Responder com um reservationId único seu.
// ─────────────────────────────────────────────

async function handleReserve(body) {
  try {
    /*
      Payload esperado da GYG (simplificado):
      {
        bookingId: "GYG-12345",
        activityId: "seu-tour-id",
        timeslot: { startTime: "2025-06-10T09:00:00+00:00" },
        participants: { adults: 2, youths: 1, children: 0 },
        customer: { firstName: "Maria", lastName: "Silva", email: "...", phone: "..." },
        languageCode: "pt"
      }
    */

    const {
      bookingId,
      activityId,
      timeslot,
      participants,
      customer,
      languageCode,
    } = body;

    if (!bookingId || !activityId || !timeslot?.startTime) {
      return gygResponse({
        success: false,
        error: "Missing required fields: bookingId, activityId, timeslot.startTime",
      });
    }

    // Verifica se já existe reserva com esse bookingId (idempotência)
    const existing = await prisma.booking.findFirst({
      where: { bookingRef: bookingId },
    });
    if (existing) {
      return gygResponse({
        success: true,
        reservationId: existing.id,
        message: "Already reserved",
      });
    }

    // Verifica se o tour existe
    const tour = await prisma.tour.findFirst({
      where: { id: activityId },
    });
    if (!tour) {
      return gygResponse({ success: false, error: "Tour not found" });
    }

    const totalPax =
      (participants?.adults  || 0) +
      (participants?.youths  || 0) +
      (participants?.children || 0);

    // Cria a reserva com status PENDING (pré-reserva / hold)
    // Hold expira em 60 minutos — implemente um job de limpeza se necessário
    const reservation = await prisma.booking.create({
      data: {
        tourId:       tour.id,
        customerName: `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() || "GYG Customer",
        startTime:    new Date(timeslot.startTime),
        platform:     "GETYOURGUIDE",
        status:       "PENDING",
        bookingRef:   bookingId,
        // Campos opcionais — adicione ao seu schema Prisma se necessário:
        // email:        customer?.email,
        // phone:        customer?.phone,
        // quantity:     totalPax,
        // language:     languageCode,
        // holdExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    return gygResponse({
      success: true,
      reservationId: reservation.id,
      // GYG exige o hold time informado
      holdUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString().replace("Z", "+00:00"),
    });
  } catch (err) {
    console.error("[GYG] reserve error:", err);
    return gygResponse({ success: false, error: err.message });
  }
}

// ─────────────────────────────────────────────
// POST /api/gyg?action=cancel-reservation
//
// GYG cancela uma PRÉ-RESERVA antes de confirmar.
// Libera as vagas seguradas.
// ─────────────────────────────────────────────

async function handleCancelReservation(body) {
  try {
    /*
      Payload esperado:
      {
        reservationId: "seu-id-interno",
        bookingId: "GYG-12345"
      }
    */

    const { reservationId, bookingId } = body;

    const booking = await prisma.booking.findFirst({
      where: {
        OR: [
          { id: reservationId },
          { bookingRef: bookingId },
        ],
      },
    });

    if (!booking) {
      // GYG aceita "not found" como sucesso (idempotência)
      return gygResponse({ success: true, message: "Reservation not found — already released" });
    }

    if (booking.status !== "PENDING") {
      return gygResponse({
        success: false,
        error: `Cannot cancel reservation with status: ${booking.status}`,
      });
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data:  { status: "CANCELED" },
    });

    return gygResponse({ success: true });
  } catch (err) {
    console.error("[GYG] cancel-reservation error:", err);
    return gygResponse({ success: false, error: err.message });
  }
}

// ─────────────────────────────────────────────
// POST /api/gyg?action=book
//
// GYG CONFIRMA a reserva (transforma PENDING → CONFIRMED).
// Pagamento já foi processado pelo lado da GYG.
// ─────────────────────────────────────────────

async function handleBook(body) {
  try {
    /*
      Payload esperado:
      {
        reservationId: "seu-id-interno",
        bookingId:     "GYG-12345",
        voucher: {
          barcode: "ABC123",
          barcodeFormat: "QR_CODE"
        }
      }
    */

    const { reservationId, bookingId, voucher } = body;

    const booking = await prisma.booking.findFirst({
      where: {
        OR: [
          { id: reservationId },
          { bookingRef: bookingId },
        ],
      },
    });

    if (!booking) {
      return gygResponse({ success: false, error: "Reservation not found" });
    }

    if (booking.status === "CONFIRMED") {
      return gygResponse({ success: true, message: "Already confirmed" });
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CONFIRMED",
        // Salve o voucher se seu schema tiver campo para isso:
        // voucherBarcode: voucher?.barcode,
      },
    });

    // ✅ Aqui você pode disparar:
    // - Notificação WhatsApp para o guia
    // - Email de confirmação para o cliente
    // - Atualizar dashboard em tempo real

    return gygResponse({ success: true });
  } catch (err) {
    console.error("[GYG] book error:", err);
    return gygResponse({ success: false, error: err.message });
  }
}

// ─────────────────────────────────────────────
// POST /api/gyg?action=cancel-booking
//
// GYG cancela uma reserva JÁ CONFIRMADA.
// Libera a vaga e registra o cancelamento.
// ─────────────────────────────────────────────

async function handleCancelBooking(body) {
  try {
    /*
      Payload esperado:
      {
        bookingId: "GYG-12345",
        reason:    "customer_request" | "supplier_request" | "no_show"
      }
    */

    const { bookingId, reason } = body;

    const booking = await prisma.booking.findFirst({
      where: { bookingRef: bookingId },
    });

    if (!booking) {
      return gygResponse({ success: true, message: "Booking not found — treated as already canceled" });
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELED",
        // Se quiser salvar o motivo:
        // cancelReason: reason,
      },
    });

    // ✅ Aqui você pode:
    // - Notificar o guia do cancelamento
    // - Disparar lógica de reembolso interno
    // - Atualizar o calendário

    return gygResponse({ success: true });
  } catch (err) {
    console.error("[GYG] cancel-booking error:", err);
    return gygResponse({ success: false, error: err.message });
  }
}

// ─────────────────────────────────────────────
// HELPER: Notificar GYG sobre mudança de disponibilidade
//
// Você chama esta função quando:
//   - Um tour é criado/alterado/cancelado manualmente
//   - Um bloqueio manual é feito na Agenda Central
//   - A capacidade de um tour muda
//
// Uso no seu route principal:
//   import { notifyGYGAvailabilityUpdate } from "./api.gyg";
//   await notifyGYGAvailabilityUpdate("seu-activity-id");
// ─────────────────────────────────────────────

export async function notifyGYGAvailabilityUpdate(activityId) {
  const baseUrl  = process.env.GYG_API_BASE || "https://api.getyourguide.com";
  const user     = process.env.GYG_OUTGOING_USER || "";
  const pass     = process.env.GYG_OUTGOING_PASS || "";
  const basicAuth = Buffer.from(`${user}:${pass}`).toString("base64");

  try {
    const res = await fetch(`${baseUrl}/1/notify-availability-update`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: JSON.stringify({ activityId }),
    });

    const data = await res.json();
    console.log("[GYG] notify-availability-update →", data);
    return data;
  } catch (err) {
    console.error("[GYG] notify-availability-update error:", err);
    return null;
  }
}
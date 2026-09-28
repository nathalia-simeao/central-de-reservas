import { data } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getCentralAvailability } from "../utils/capacity.server";
import { lisbonLocalDateTimeToUtc } from "../utils/shopify-orders.server";
import { ensureShopifyOrderWebhooks } from "../utils/shopify-webhooks.server";

const json = (body, init) => data(body, init);
const VALIDATION_PROVIDER = "SHOPIFY_VALIDATION";

function clean(value) {
  return String(value ?? "").trim();
}

function normalizeTime(value) {
  const match = clean(value).match(/\b([01]?\d|2[0-3])[:hH]([0-5]\d)\b/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function lisbonDateKey(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

function orderIdFromWebhookEvent(event) {
  const resultOrderId = clean(event?.result?.orderId);
  if (resultOrderId) return resultOrderId;

  const payloadGid = clean(event?.payload?.admin_graphql_api_id);
  if (payloadGid) return payloadGid;

  const payloadId = clean(event?.payload?.id);
  return payloadId ? `gid://shopify/Order/${payloadId}` : null;
}

async function findValidationSlot() {
  const tours = await db.tour.findMany({
    where: {
      shopifyProductId: { not: null },
      variants: {
        some: {
          active: true,
          shopifyVariantId: { not: null },
        },
      },
    },
    include: {
      variants: {
        where: {
          active: true,
          shopifyVariantId: { not: null },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { title: "asc" },
  });

  for (const tour of tours) {
    const timeOptions = new Set(
      (tour.scheduleSlots || []).map(normalizeTime).filter(Boolean),
    );

    for (const variant of tour.variants || []) {
      const slot = normalizeTime(variant.startTimeSlot || variant.title);
      if (slot) timeOptions.add(slot);
    }

    if (timeOptions.size === 0) continue;

    const variant =
      (tour.variants || []).find((item) => item.passengerCategory === "ADULT") ||
      (tour.variants || [])[0];

    if (!variant?.shopifyVariantId) continue;

    for (let dayOffset = 1; dayOffset <= 30; dayOffset += 1) {
      const candidateDate = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
      const dateKey = lisbonDateKey(candidateDate);

      for (const timeKey of timeOptions) {
        const startTime = lisbonLocalDateTimeToUtc(dateKey, timeKey);
        if (!startTime) continue;

        const availability = await getCentralAvailability(db, {
          tourId: tour.id,
          startTime,
          platform: "SHOPIFY",
          requestedSeats: 1,
        });

        if (availability.canAccept) {
          return {
            tour,
            variant,
            dateKey,
            timeKey,
            startTime,
            availability,
          };
        }
      }
    }
  }

  return null;
}

async function createAndCompleteValidationOrder(admin) {
  const selected = await findValidationSlot();
  if (!selected) {
    throw new Error(
      "Não encontrei um tour Shopify com variante real, horário configurado e pelo menos 1 vaga disponível nos próximos 30 dias.",
    );
  }

  const marker = `PMY-E2E-${Date.now()}`;
  const attributes = [
    { key: "date", value: selected.dateKey },
    { key: "time", value: selected.timeKey },
    { key: "language", value: "PT" },
    { key: "source", value: "Central PMY E2E" },
    { key: "pmy_validation_test", value: marker },
  ];

  const createRes = await admin.graphql(
    `#graphql
      mutation PmyValidationDraftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
            name
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        input: {
          lineItems: [
            {
              variantId: selected.variant.shopifyVariantId,
              quantity: 1,
              customAttributes: attributes,
            },
          ],
          customAttributes: [
            ...attributes,
            { key: "tour", value: selected.tour.title },
          ],
          tags: ["PMY Central", "PMY E2E TEST"],
          note: [
            "PMY E2E TEST - Shopify webhook validation.",
            `Tour: ${selected.tour.title}`,
            `Data: ${selected.dateKey}`,
            `Horário: ${selected.timeKey}`,
            "Quantidade: 1",
            "Não é uma reserva de cliente.",
          ].join("\n"),
        },
      },
    },
  );

  const createPayload = await createRes.json();
  if (createPayload?.errors?.length) {
    throw new Error(createPayload.errors.map((item) => item.message).join("; "));
  }

  const createMutation = createPayload?.data?.draftOrderCreate;
  if (createMutation?.userErrors?.length) {
    throw new Error(
      createMutation.userErrors.map((item) => item.message).join("; "),
    );
  }

  const draftOrder = createMutation?.draftOrder;
  if (!draftOrder?.id) {
    throw new Error("O Shopify não retornou o Draft Order de validação.");
  }

  const completeRes = await admin.graphql(
    `#graphql
      mutation PmyValidationDraftOrderComplete($id: ID!) {
        draftOrderComplete(id: $id, paymentPending: true) {
          draftOrder {
            id
            name
            order {
              id
              name
              displayFinancialStatus
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    { variables: { id: draftOrder.id } },
  );

  const completePayload = await completeRes.json();
  if (completePayload?.errors?.length) {
    throw new Error(completePayload.errors.map((item) => item.message).join("; "));
  }

  const completeMutation = completePayload?.data?.draftOrderComplete;
  if (completeMutation?.userErrors?.length) {
    throw new Error(
      completeMutation.userErrors.map((item) => item.message).join("; "),
    );
  }

  const completed = completeMutation?.draftOrder;
  const order = completed?.order;
  if (!order?.id) {
    throw new Error("O Draft Order foi criado, mas não virou um pedido Shopify.");
  }

  const baseline = {
    tourId: selected.tour.id,
    tourTitle: selected.tour.title,
    variantId: selected.variant.shopifyVariantId,
    date: selected.dateKey,
    time: selected.timeKey,
    startTime: selected.startTime.toISOString(),
    participants: 1,
    capacity: selected.availability.capacity,
    occupiedBefore: selected.availability.occupiedSeats,
    remainingBefore: selected.availability.remainingSeats,
    draftOrderId: draftOrder.id,
    draftOrderName: draftOrder.name,
    orderId: order.id,
    orderName: order.name,
    financialStatus: order.displayFinancialStatus || null,
    marker,
    createdAt: new Date().toISOString(),
  };

  await db.integrationEvent.upsert({
    where: {
      provider_externalEventId: {
        provider: VALIDATION_PROVIDER,
        externalEventId: order.id,
      },
    },
    create: {
      provider: VALIDATION_PROVIDER,
      externalEventId: order.id,
      topic: "E2E_ORDER_TEST",
      status: "AWAITING_WEBHOOK",
      payload: baseline,
    },
    update: {
      topic: "E2E_ORDER_TEST",
      status: "AWAITING_WEBHOOK",
      payload: baseline,
      result: null,
      error: null,
      processedAt: null,
    },
  });

  return baseline;
}

async function validationStatus(orderId = null) {
  const validationEvent = orderId
    ? await db.integrationEvent.findUnique({
        where: {
          provider_externalEventId: {
            provider: VALIDATION_PROVIDER,
            externalEventId: orderId,
          },
        },
      })
    : await db.integrationEvent.findFirst({
        where: { provider: VALIDATION_PROVIDER, topic: "E2E_ORDER_TEST" },
        orderBy: { receivedAt: "desc" },
      });

  if (!validationEvent) {
    return {
      success: true,
      exists: false,
      status: "NOT_STARTED",
      steps: {
        orderCreated: false,
        webhookReceived: false,
        bookingCreated: false,
        agendaReady: false,
        capacityReduced: false,
      },
    };
  }

  const baseline = validationEvent.payload || {};
  const externalOrderId = clean(baseline.orderId || validationEvent.externalEventId);

  const booking = externalOrderId
    ? await db.booking.findFirst({
        where: {
          platform: "SHOPIFY",
          externalOrderId,
        },
        include: {
          tour: {
            select: { id: true, title: true, maxCapacity: true },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const recentWebhookEvents = await db.integrationEvent.findMany({
    where: {
      provider: "SHOPIFY",
      receivedAt: {
        gte: new Date(validationEvent.receivedAt.getTime() - 2 * 60 * 1000),
      },
    },
    orderBy: { receivedAt: "desc" },
    take: 50,
  });

  const webhookEvent =
    recentWebhookEvents.find(
      (event) => orderIdFromWebhookEvent(event) === externalOrderId,
    ) || null;

  let availabilityAfter = null;
  if (baseline.tourId && baseline.startTime) {
    try {
      availabilityAfter = await getCentralAvailability(db, {
        tourId: baseline.tourId,
        startTime: new Date(baseline.startTime),
        platform: "SHOPIFY",
        requestedSeats: 0,
      });
    } catch {
      availabilityAfter = null;
    }
  }

  const participants = Number(booking?.totalParticipants || baseline.participants || 1);
  const remainingBefore = Number(baseline.remainingBefore);
  const capacityReduced =
    Boolean(booking && availabilityAfter) &&
    Number.isFinite(remainingBefore) &&
    availabilityAfter.remainingSeats <= Math.max(0, remainingBefore - participants);

  const steps = {
    orderCreated: Boolean(externalOrderId),
    webhookReceived: Boolean(webhookEvent),
    bookingCreated: Boolean(booking),
    agendaReady: Boolean(booking),
    capacityReduced,
  };

  const complete = Object.values(steps).every(Boolean);
  const hasWebhookFailure = webhookEvent?.status === "FAILED";
  const status = complete
    ? "PASSED"
    : hasWebhookFailure
      ? "FAILED"
      : "WAITING";

  const result = {
    steps,
    order: {
      id: externalOrderId,
      name: baseline.orderName || null,
      financialStatus: baseline.financialStatus || null,
    },
    draftOrder: {
      id: baseline.draftOrderId || null,
      name: baseline.draftOrderName || null,
    },
    slot: {
      tourId: baseline.tourId || null,
      tourTitle: baseline.tourTitle || booking?.tour?.title || null,
      date: baseline.date || null,
      time: baseline.time || null,
      startTime: baseline.startTime || booking?.startTime || null,
      capacity: baseline.capacity ?? booking?.tour?.maxCapacity ?? null,
      occupiedBefore: baseline.occupiedBefore ?? null,
      remainingBefore: baseline.remainingBefore ?? null,
      occupiedAfter: availabilityAfter?.occupiedSeats ?? null,
      remainingAfter: availabilityAfter?.remainingSeats ?? null,
    },
    booking: booking
      ? {
          id: booking.id,
          bookingRef: booking.bookingRef,
          status: booking.status,
          syncStatus: booking.syncStatus,
          participants: booking.totalParticipants,
          totalPrice: booking.totalPrice,
          currency: booking.currency,
          createdAt: booking.createdAt,
        }
      : null,
    webhook: webhookEvent
      ? {
          id: webhookEvent.id,
          topic: webhookEvent.topic,
          status: webhookEvent.status,
          receivedAt: webhookEvent.receivedAt,
          processedAt: webhookEvent.processedAt,
          error: webhookEvent.error,
        }
      : null,
  };

  if (complete || hasWebhookFailure) {
    await db.integrationEvent.update({
      where: {
        provider_externalEventId: {
          provider: VALIDATION_PROVIDER,
          externalEventId: validationEvent.externalEventId,
        },
      },
      data: {
        status: complete ? "PROCESSED" : "FAILED",
        result,
        error: hasWebhookFailure ? webhookEvent?.error || "Webhook Shopify falhou." : null,
        processedAt: new Date(),
      },
    });
  }

  return {
    success: true,
    exists: true,
    status,
    validationId: validationEvent.id,
    createdAt: validationEvent.receivedAt,
    ...result,
  };
}

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const url = new URL(request.url);
  return json(await validationStatus(url.searchParams.get("orderId")));
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = clean(formData.get("_action"));

  if (action === "status") {
    return json(await validationStatus(clean(formData.get("orderId")) || null));
  }

  if (action !== "start") {
    return json({ success: false, error: "Ação inválida." }, { status: 400 });
  }

  const webhookStatus = await ensureShopifyOrderWebhooks(
    admin,
    process.env.SHOPIFY_APP_URL,
  );

  if (!webhookStatus.ok) {
    return json(
      {
        success: false,
        error:
          webhookStatus.error ||
          "Os webhooks de pedidos Shopify não estão ativos.",
        webhookStatus,
      },
      { status: 409 },
    );
  }

  try {
    const test = await createAndCompleteValidationOrder(admin);
    return json({
      success: true,
      started: true,
      test,
      webhookStatus,
    });
  } catch (error) {
    console.error("[PMY] Shopify E2E validation failed:", error);
    return json(
      {
        success: false,
        error: error?.message || "Falha ao iniciar validação Shopify.",
      },
      { status: 500 },
    );
  }
};

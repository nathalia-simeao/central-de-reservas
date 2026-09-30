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

async function findValidationEvent(orderId = null) {
  return orderId
    ? db.integrationEvent.findUnique({
        where: {
          provider_externalEventId: {
            provider: VALIDATION_PROVIDER,
            externalEventId: orderId,
          },
        },
      })
    : db.integrationEvent.findFirst({
        where: { provider: VALIDATION_PROVIDER, topic: "E2E_ORDER_TEST" },
        orderBy: { receivedAt: "desc" },
      });
}

async function fetchShopifyOrderState(admin, orderId) {
  if (!admin || !orderId) return null;

  const response = await admin.graphql(
    `#graphql
      query PmyValidationOrderState($id: ID!) {
        node(id: $id) {
          ... on Order {
            id
            name
            cancelledAt
            displayFinancialStatus
          }
        }
      }
    `,
    { variables: { id: orderId } },
  );

  const payload = await response.json();
  if (payload?.errors?.length) {
    throw new Error(payload.errors.map((item) => item.message).join("; "));
  }

  return payload?.data?.node || null;
}

async function requestValidationOrderCancellation(admin, orderId) {
  const response = await admin.graphql(
    `#graphql
      mutation PmyValidationOrderCancel($orderId: ID!) {
        orderCancel(
          orderId: $orderId
          notifyCustomer: false
          reason: OTHER
          restock: true
          staffNote: "PMY E2E validation cleanup"
        ) {
          job {
            id
            done
          }
          orderCancelUserErrors {
            code
            field
            message
          }
        }
      }
    `,
    { variables: { orderId } },
  );

  const payload = await response.json();
  if (payload?.errors?.length) {
    throw new Error(payload.errors.map((item) => item.message).join("; "));
  }

  const mutation = payload?.data?.orderCancel;
  const errors = mutation?.orderCancelUserErrors || [];
  if (errors.length) {
    const error = new Error(errors.map((item) => item.message).join("; "));
    error.code = errors[0]?.code || "ORDER_CANCEL_FAILED";
    throw error;
  }

  if (!mutation?.job?.id) {
    throw new Error("O Shopify aceitou o cancelamento, mas não retornou o job de acompanhamento.");
  }

  return mutation.job;
}

async function validationStatus(admin, orderId = null) {
  const validationEvent = await findValidationEvent(orderId);

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
      cancellation: {
        requested: false,
        steps: {
          orderCancelled: false,
          webhookReceived: false,
          bookingCancelled: false,
          capacityRestored: false,
        },
      },
    };
  }

  const baseline = validationEvent.payload || {};
  const previousResult = validationEvent.result || {};
  const externalOrderId = clean(
    baseline.orderId || validationEvent.externalEventId,
  );

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
    take: 100,
  });

  const matchingWebhooks = recentWebhookEvents.filter(
    (event) => orderIdFromWebhookEvent(event) === externalOrderId,
  );

  const creationWebhook =
    matchingWebhooks.find((event) => event.topic === "ORDERS_CREATE") ||
    matchingWebhooks.find((event) => event.topic !== "ORDERS_CANCELLED") ||
    null;

  const cancellationWebhook =
    matchingWebhooks.find((event) => event.topic === "ORDERS_CANCELLED") ||
    null;

  let availabilityCurrent = null;
  if (baseline.tourId && baseline.startTime) {
    try {
      availabilityCurrent = await getCentralAvailability(db, {
        tourId: baseline.tourId,
        startTime: new Date(baseline.startTime),
        platform: "SHOPIFY",
        requestedSeats: 0,
      });
    } catch {
      availabilityCurrent = null;
    }
  }

  let shopifyOrder = null;
  if (externalOrderId) {
    try {
      shopifyOrder = await fetchShopifyOrderState(admin, externalOrderId);
    } catch (error) {
      console.error("[PMY] Shopify E2E order-state check failed:", error);
    }
  }

  const participants = Number(
    booking?.totalParticipants || baseline.participants || 1,
  );
  const remainingBefore = Number(baseline.remainingBefore);
  const occupiedBefore = Number(baseline.occupiedBefore);

  const capacityReducedNow =
    Boolean(booking && availabilityCurrent) &&
    !["CANCELED", "CANCELLED"].includes(
      String(booking?.status || "").toUpperCase(),
    ) &&
    Number.isFinite(remainingBefore) &&
    availabilityCurrent.remainingSeats <=
      Math.max(0, remainingBefore - participants);

  const priorSteps = previousResult?.steps || {};
  const steps = {
    orderCreated:
      Boolean(priorSteps.orderCreated) || Boolean(externalOrderId),
    webhookReceived:
      Boolean(priorSteps.webhookReceived) || Boolean(creationWebhook),
    bookingCreated:
      Boolean(priorSteps.bookingCreated) || Boolean(booking),
    agendaReady:
      Boolean(priorSteps.agendaReady) || Boolean(booking),
    capacityReduced:
      Boolean(priorSteps.capacityReduced) || capacityReducedNow,
  };

  const firstPhaseComplete = Object.values(steps).every(Boolean);
  const previousSlot = previousResult?.slot || {};
  const remainingAfterBooking =
    previousSlot.remainingAfterBooking ??
    previousSlot.remainingAfter ??
    (capacityReducedNow ? availabilityCurrent?.remainingSeats : null);
  const occupiedAfterBooking =
    previousSlot.occupiedAfterBooking ??
    previousSlot.occupiedAfter ??
    (capacityReducedNow ? availabilityCurrent?.occupiedSeats : null);

  const cancellationRequestedAt = clean(baseline.cancellationRequestedAt);
  const cancellationRequested = Boolean(cancellationRequestedAt);
  const bookingStatus = String(booking?.status || "").toUpperCase();
  const bookingCancelled = ["CANCELED", "CANCELLED"].includes(bookingStatus);
  const orderCancelled = Boolean(
    shopifyOrder?.cancelledAt || cancellationWebhook?.payload?.cancelled_at,
  );

  const hasRemainingAfterBooking =
    remainingAfterBooking !== null &&
    remainingAfterBooking !== undefined &&
    Number.isFinite(Number(remainingAfterBooking));
  const hasOccupiedAfterBooking =
    occupiedAfterBooking !== null &&
    occupiedAfterBooking !== undefined &&
    Number.isFinite(Number(occupiedAfterBooking));

  const expectedRemainingAfterCancellation =
    hasRemainingAfterBooking
      ? Math.min(
          Number.isFinite(remainingBefore)
            ? remainingBefore
            : Number(availabilityCurrent?.capacity || 0),
          Number(remainingAfterBooking) + participants,
        )
      : Number.isFinite(remainingBefore)
        ? remainingBefore
        : null;

  const expectedOccupiedAfterCancellation =
    hasOccupiedAfterBooking
      ? Math.max(0, Number(occupiedAfterBooking) - participants)
      : Number.isFinite(occupiedBefore)
        ? occupiedBefore
        : null;

  const capacityRestored =
    Boolean(cancellationRequested && bookingCancelled && availabilityCurrent) &&
    expectedRemainingAfterCancellation !== null &&
    availabilityCurrent.remainingSeats >= expectedRemainingAfterCancellation &&
    (expectedOccupiedAfterCancellation === null ||
      availabilityCurrent.occupiedSeats <= expectedOccupiedAfterCancellation);

  const cancellationSteps = {
    orderCancelled,
    webhookReceived: Boolean(cancellationWebhook),
    bookingCancelled,
    capacityRestored,
  };

  const cancellationComplete =
    cancellationRequested &&
    Object.values(cancellationSteps).every(Boolean);

  const creationWebhookFailed = creationWebhook?.status === "FAILED";
  const cancellationWebhookFailed =
    cancellationWebhook?.status === "FAILED";

  let status = "WAITING";
  if (creationWebhookFailed || cancellationWebhookFailed) {
    status = "FAILED";
  } else if (cancellationRequested) {
    status = cancellationComplete ? "FULLY_PASSED" : "CANCELLATION_WAITING";
  } else if (firstPhaseComplete) {
    status = "PASSED";
  }

  const result = {
    steps,
    firstPhasePassedAt:
      previousResult?.firstPhasePassedAt ||
      (firstPhaseComplete ? new Date().toISOString() : null),
    order: {
      id: externalOrderId,
      name: shopifyOrder?.name || baseline.orderName || null,
      financialStatus:
        shopifyOrder?.displayFinancialStatus ||
        baseline.financialStatus ||
        null,
      cancelledAt: shopifyOrder?.cancelledAt || null,
    },
    draftOrder: {
      id: baseline.draftOrderId || null,
      name: baseline.draftOrderName || null,
    },
    slot: {
      tourId: baseline.tourId || null,
      tourTitle:
        baseline.tourTitle || booking?.tour?.title || null,
      date: baseline.date || null,
      time: baseline.time || null,
      startTime: baseline.startTime || booking?.startTime || null,
      capacity:
        baseline.capacity ?? booking?.tour?.maxCapacity ?? null,
      occupiedBefore: baseline.occupiedBefore ?? null,
      remainingBefore: baseline.remainingBefore ?? null,
      occupiedAfterBooking,
      remainingAfterBooking,
      occupiedCurrent: availabilityCurrent?.occupiedSeats ?? null,
      remainingCurrent: availabilityCurrent?.remainingSeats ?? null,
      expectedRemainingAfterCancellation,
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
          updatedAt: booking.updatedAt,
        }
      : null,
    webhook: creationWebhook
      ? {
          id: creationWebhook.id,
          topic: creationWebhook.topic,
          status: creationWebhook.status,
          receivedAt: creationWebhook.receivedAt,
          processedAt: creationWebhook.processedAt,
          error: creationWebhook.error,
        }
      : null,
    cancellation: {
      requested: cancellationRequested,
      requestedAt: cancellationRequestedAt || null,
      jobId: clean(baseline.cancellationJobId) || null,
      jobDoneAtRequest:
        typeof baseline.cancellationJobDoneAtRequest === "boolean"
          ? baseline.cancellationJobDoneAtRequest
          : null,
      steps: cancellationSteps,
      webhook: cancellationWebhook
        ? {
            id: cancellationWebhook.id,
            topic: cancellationWebhook.topic,
            status: cancellationWebhook.status,
            receivedAt: cancellationWebhook.receivedAt,
            processedAt: cancellationWebhook.processedAt,
            error: cancellationWebhook.error,
          }
        : null,
      fullyPassedAt:
        previousResult?.cancellation?.fullyPassedAt ||
        (cancellationComplete ? new Date().toISOString() : null),
    },
  };

  const errorMessage = creationWebhookFailed
    ? creationWebhook?.error || "Webhook Shopify de criação falhou."
    : cancellationWebhookFailed
      ? cancellationWebhook?.error ||
        "Webhook Shopify de cancelamento falhou."
      : null;

  const eventStatus =
    status === "FULLY_PASSED"
      ? "PROCESSED"
      : status === "FAILED"
        ? "FAILED"
        : status === "PASSED"
          ? "READY_FOR_CANCELLATION"
          : status === "CANCELLATION_WAITING"
            ? "AWAITING_CANCELLATION_WEBHOOK"
            : "AWAITING_WEBHOOK";

  await db.integrationEvent.update({
    where: {
      provider_externalEventId: {
        provider: VALIDATION_PROVIDER,
        externalEventId: validationEvent.externalEventId,
      },
    },
    data: {
      status: eventStatus,
      result,
      error: errorMessage,
      processedAt:
        ["FULLY_PASSED", "FAILED"].includes(status)
          ? new Date()
          : null,
    },
  });

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
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  return json(
    await validationStatus(admin, url.searchParams.get("orderId")),
  );
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = clean(formData.get("_action"));
  const orderId = clean(formData.get("orderId")) || null;

  if (action === "status") {
    return json(await validationStatus(admin, orderId));
  }

  if (action === "cancel") {
    try {
      const current = await validationStatus(admin, orderId);
      if (!current?.exists || !current?.order?.id) {
        return json(
          {
            success: false,
            error: "Nenhum pedido E2E Shopify disponível para cancelar.",
          },
          { status: 404 },
        );
      }

      if (current.status === "FULLY_PASSED") {
        return json(current);
      }

      if (current.status !== "PASSED") {
        return json(
          {
            success: false,
            error:
              "O cancelamento só é liberado depois que Pedido → Webhook → Booking → Agenda → Vagas estiver 100% verde.",
          },
          { status: 409 },
        );
      }

      const validationEvent = await findValidationEvent(current.order.id);
      const baseline = validationEvent?.payload || {};

      if (baseline.cancellationRequestedAt) {
        return json(
          await validationStatus(admin, current.order.id),
        );
      }

      const job = await requestValidationOrderCancellation(
        admin,
        current.order.id,
      );
      const requestedAt = new Date().toISOString();

      await db.integrationEvent.update({
        where: {
          provider_externalEventId: {
            provider: VALIDATION_PROVIDER,
            externalEventId: current.order.id,
          },
        },
        data: {
          status: "AWAITING_CANCELLATION_WEBHOOK",
          payload: {
            ...baseline,
            cancellationRequestedAt: requestedAt,
            cancellationJobId: job.id,
            cancellationJobDoneAtRequest: Boolean(job.done),
          },
          processedAt: null,
          error: null,
        },
      });

      return json(
        await validationStatus(admin, current.order.id),
      );
    } catch (error) {
      console.error("[PMY] Shopify E2E cancellation failed:", error);
      const message = error?.message || "Falha ao cancelar pedido E2E Shopify.";
      const missingScope =
        /write_orders|access denied|access scope/i.test(message);

      return json(
        {
          success: false,
          code: missingScope
            ? "WRITE_ORDERS_SCOPE_REQUIRED"
            : error?.code || "E2E_CANCEL_FAILED",
          error: missingScope
            ? "O app precisa do escopo write_orders para cancelar o pedido de teste. Reautorize a Central no Shopify após o deploy."
            : message,
        },
        { status: missingScope ? 403 : 500 },
      );
    }
  }

  if (action !== "start") {
    return json({ success: false, error: "Ação inválida." }, { status: 400 });
  }

  const currentValidation = await validationStatus(admin);
  if (
    currentValidation?.exists &&
    ["WAITING", "PASSED", "CANCELLATION_WAITING"].includes(
      currentValidation.status,
    )
  ) {
    return json(
      {
        success: false,
        code: "E2E_TEST_ALREADY_ACTIVE",
        error:
          currentValidation.status === "PASSED"
            ? "O teste atual já validou a entrada. Cancele esse pedido e valide a devolução da vaga antes de iniciar outro."
            : "Já existe um teste Shopify E2E em andamento. Aguarde a validação atual terminar.",
      },
      { status: 409 },
    );
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

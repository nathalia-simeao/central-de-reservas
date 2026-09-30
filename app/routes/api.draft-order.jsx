import { data } from "react-router";
import { authenticate } from "../shopify.server";
import { classifyCommercialSource } from "../utils/commercial-source.server";

const json = (body, init) => data(body, init);

function clean(value) {
  return String(value ?? "").trim();
}

const ATTRIBUTION_FIELDS = [
  "commercial_source",
  "session_id",
  "order_referrer_source",
  "order_referrer_name",
  "order_referrer_channel",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "msclkid",
  "ttclid",
];

function cleanAttribute(value, max = 255) {
  return clean(value).slice(0, max);
}

function parseAttribution(raw) {
  let parsed = {};
  try {
    parsed = JSON.parse(clean(raw) || "{}");
  } catch {
    parsed = {};
  }

  const out = {};
  for (const key of ATTRIBUTION_FIELDS) {
    const value = cleanAttribute(parsed?.[key]);
    if (value) out[key] = value;
  }
  return out;
}

function generatedCentralSession() {
  return `central_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function attributionAttributes(attribution) {
  const sessionId = attribution.session_id || generatedCentralSession();
  const source =
    attribution.order_referrer_source ||
    attribution.utm_source ||
    "central_pmy";
  const name = attribution.order_referrer_name || "Central PMY";
  const channel =
    attribution.order_referrer_channel ||
    attribution.utm_medium ||
    "backoffice";

  const rows = [
    ["order_referrer_source", source],
    ["order_referrer_name", name],
    ["order_referrer_channel", channel],
    ["PMY Session", sessionId],
    ["PMY First Source", attribution.utm_source || source],
    ["PMY Last Source", attribution.utm_source || source],
    ["PMY UTM Source", attribution.utm_source],
    ["PMY UTM Medium", attribution.utm_medium],
    ["PMY UTM Campaign", attribution.utm_campaign],
    ["PMY UTM Term", attribution.utm_term],
    ["PMY UTM Content", attribution.utm_content],
    ["PMY UTM ID", attribution.utm_id],
    ["PMY GCLID", attribution.gclid],
    ["PMY GBRAID", attribution.gbraid],
    ["PMY WBRAID", attribution.wbraid],
    ["PMY FBCLID", attribution.fbclid],
    ["PMY MSCLKID", attribution.msclkid],
    ["PMY TTCLID", attribution.ttclid],
  ];

  return {
    sessionId,
    source,
    name,
    channel,
    attributes: rows
      .filter(([, value]) => clean(value))
      .map(([key, value]) => ({ key, value: cleanAttribute(value) })),
  };
}

function normalizeTime(value) {
  const match = clean(value).match(/^([01]?\d|2[0-3])[:hH]([0-5]\d)$/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function normalizeDate(value) {
  const raw = clean(value);
  return /^20\d{2}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function timeFromTitle(value) {
  const match = clean(value).match(/\b([01]?\d|2[0-3])[:hH]([0-5]\d)\b/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function parseLineItems(raw) {
  let parsed;
  try {
    parsed = JSON.parse(clean(raw) || "[]");
  } catch {
    throw new Error("Os ingressos selecionados são inválidos.");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Selecione pelo menos um ingresso.");
  }

  return parsed.map((item) => {
    const variantId = clean(item?.variantId);
    const quantity = Number.parseInt(item?.quantity, 10);

    if (!/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(variantId)) {
      throw new Error("Uma das variantes Shopify é inválida.");
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new Error("A quantidade de cada ingresso deve estar entre 1 e 100.");
    }

    return { variantId, quantity };
  });
}

async function validateVariants(admin, productId, lineItems, selectedTime) {
  const ids = lineItems.map((item) => item.variantId);
  const response = await admin.graphql(
    `#graphql
      query CentralDraftOrderVariants($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on ProductVariant {
            id
            title
            availableForSale
            product {
              id
              title
            }
          }
        }
      }
    `,
    { variables: { ids } },
  );

  const payload = await response.json();
  if (payload?.errors?.length) {
    throw new Error(payload.errors.map((item) => item.message).join("; "));
  }

  const variants = (payload?.data?.nodes || []).filter(Boolean);
  if (variants.length !== ids.length) {
    throw new Error("Não foi possível validar todas as variantes no Shopify.");
  }

  const byId = new Map(variants.map((variant) => [variant.id, variant]));

  for (const item of lineItems) {
    const variant = byId.get(item.variantId);
    if (!variant || variant.product?.id !== productId) {
      throw new Error("Uma variante selecionada não pertence ao tour escolhido.");
    }

    const variantTime = timeFromTitle(variant.title);
    if (variantTime && selectedTime && variantTime !== selectedTime) {
      throw new Error(
        `A variante "${variant.title}" pertence ao horário ${variantTime}, mas o checkout está configurado para ${selectedTime}.`,
      );
    }
  }

  return variants;
}

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const productId = clean(formData.get("productId"));
  const tourTitle = clean(formData.get("tourTitle"));
  const customerName = clean(formData.get("customerName"));
  const date = normalizeDate(formData.get("date"));
  const time = normalizeTime(formData.get("time"));
  const language = clean(formData.get("language"));
  const bookingPlatforms = clean(formData.get("bookingPlatforms"));
  const attribution = parseAttribution(formData.get("attribution"));
  const attributionMeta = attributionAttributes(attribution);
  const commercialSource = classifyCommercialSource({
    platform: "CENTRAL",
    attribution,
    commercialSource: attribution.commercial_source,
  });
  let lineItems;

  try {
    lineItems = parseLineItems(formData.get("lineItems"));
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 400 });
  }

  if (!/^gid:\/\/shopify\/Product\/\d+$/.test(productId)) {
    return json(
      { success: false, error: "O tour não possui um product_id Shopify válido." },
      { status: 400 },
    );
  }
  if (!date) {
    return json({ success: false, error: "Informe a data do tour." }, { status: 400 });
  }
  if (!time) {
    return json({ success: false, error: "Selecione o horário do tour." }, { status: 400 });
  }
  if (!language) {
    return json({ success: false, error: "Selecione o idioma do tour." }, { status: 400 });
  }

  try {
    const variants = await validateVariants(admin, productId, lineItems, time);
    const variantTitleById = new Map(
      variants.map((variant) => [variant.id, variant.title]),
    );

    const attributes = [
      { key: "date", value: date },
      { key: "time", value: time },
      { key: "language", value: language },
      { key: "source", value: attributionMeta.name },
      { key: "PMY Commercial Source", value: commercialSource },
      ...attributionMeta.attributes,
      { key: "PMY Product ID", value: productId },
      {
        key: "PMY Variant IDs",
        value: lineItems.map((item) => item.variantId).join(","),
      },
    ];

    const input = {
      lineItems: lineItems.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        customAttributes: [
          { key: "date", value: date },
          { key: "time", value: time },
          { key: "language", value: language },
          { key: "_PMY Product ID", value: productId },
          { key: "_PMY Variant ID", value: item.variantId },
          ...(tourTitle
            ? [{ key: "_PMY Product Title", value: cleanAttribute(tourTitle) }]
            : []),
          ...(variantTitleById.get(item.variantId)
            ? [
                {
                  key: "_PMY Variant Title",
                  value: cleanAttribute(variantTitleById.get(item.variantId)),
                },
              ]
            : []),
        ],
      })),
      customAttributes: [
        ...attributes,
        ...(tourTitle ? [{ key: "tour", value: cleanAttribute(tourTitle) }] : []),
        ...(customerName
          ? [{ key: "customer_name", value: cleanAttribute(customerName) }]
          : []),
        ...(bookingPlatforms
          ? [{ key: "booking_platforms", value: cleanAttribute(bookingPlatforms) }]
          : []),
      ],
      tags: ["PMY Central", "Central de Reservas"],
      note: [
        "Reserva criada pela Central de Reservas PMY.",
        tourTitle ? `Tour: ${tourTitle}` : null,
        `Data: ${date}`,
        `Horário: ${time}`,
        `Idioma: ${language}`,
        customerName ? `Cliente: ${customerName}` : null,
        `Origem: ${attributionMeta.name}`,
        `Origem comercial: ${commercialSource}`,
        `Canal: ${attributionMeta.channel}`,
        `Sessão PMY: ${attributionMeta.sessionId}`,
      ]
        .filter(Boolean)
        .join("\n"),
    };

    const response = await admin.graphql(
      `#graphql
        mutation CentralDraftOrderCreate($input: DraftOrderInput!) {
          draftOrderCreate(input: $input) {
            draftOrder {
              id
              name
              invoiceUrl
              status
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      { variables: { input } },
    );

    const payload = await response.json();
    if (payload?.errors?.length) {
      const message = payload.errors.map((item) => item.message).join("; ");
      if (/write_draft_orders|access denied|access scope/i.test(message)) {
        return json(
          {
            success: false,
            code: "DRAFT_ORDER_SCOPE_REQUIRED",
            error:
              "O Shopify ainda não autorizou o escopo write_draft_orders para este app. Reabra/reautorize a Central no Shopify após o novo deploy.",
          },
          { status: 403 },
        );
      }
      throw new Error(message);
    }

    const mutation = payload?.data?.draftOrderCreate;
    if (mutation?.userErrors?.length) {
      const message = mutation.userErrors
        .map((item) => item.message)
        .filter(Boolean)
        .join("; ");
      return json(
        { success: false, error: message || "O Shopify recusou o Draft Order." },
        { status: 400 },
      );
    }

    const draftOrder = mutation?.draftOrder;
    if (!draftOrder?.id || !draftOrder?.invoiceUrl) {
      throw new Error("O Shopify criou uma resposta sem o link de checkout.");
    }

    return json({
      success: true,
      draftOrder: {
        id: draftOrder.id,
        name: draftOrder.name,
        invoiceUrl: draftOrder.invoiceUrl,
        status: draftOrder.status,
        total: draftOrder.totalPriceSet?.shopMoney?.amount || null,
        currency: draftOrder.totalPriceSet?.shopMoney?.currencyCode || null,
        productId,
        tourTitle,
        date,
        time,
        language,
        commercialSource,
        attribution: {
          commercialSource,
          sessionId: attributionMeta.sessionId,
          source: attributionMeta.source,
          name: attributionMeta.name,
          channel: attributionMeta.channel,
          utmSource: attribution.utm_source || null,
          utmMedium: attribution.utm_medium || null,
          utmCampaign: attribution.utm_campaign || null,
          utmTerm: attribution.utm_term || null,
          utmContent: attribution.utm_content || null,
          utmId: attribution.utm_id || null,
          gclid: attribution.gclid || null,
          gbraid: attribution.gbraid || null,
          wbraid: attribution.wbraid || null,
          fbclid: attribution.fbclid || null,
          msclkid: attribution.msclkid || null,
          ttclid: attribution.ttclid || null,
        },
        lineItems: lineItems.map((item) => ({
          ...item,
          variantTitle: variantTitleById.get(item.variantId) || null,
        })),
      },
    });
  } catch (error) {
    console.error("[PMY] draftOrderCreate failed:", error);
    const message = error?.message || "Falha ao criar o Draft Order no Shopify.";

    if (/write_draft_orders|access denied|access scope/i.test(message)) {
      return json(
        {
          success: false,
          code: "DRAFT_ORDER_SCOPE_REQUIRED",
          error:
            "O Shopify ainda não autorizou o escopo write_draft_orders para este app. Reabra/reautorize a Central no Shopify após o novo deploy.",
        },
        { status: 403 },
      );
    }

    return json({ success: false, error: message }, { status: 500 });
  }
};

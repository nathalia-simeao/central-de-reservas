const ORDER_WEBHOOK_TOPICS = [
  "ORDERS_CREATE",
  "ORDERS_UPDATED",
  "ORDERS_PAID",
  "ORDERS_CANCELLED",
];

const QUERY_SUBSCRIPTIONS = `
  query PMYOrderWebhooks {
    webhookSubscriptions(first: 100) {
      nodes {
        id
        topic
        uri
      }
    }
  }
`;

const CREATE_SUBSCRIPTION = `
  mutation CreatePMYWebhook(
    $topic: WebhookSubscriptionTopic!
    $subscription: WebhookSubscriptionInput!
  ) {
    webhookSubscriptionCreate(
      topic: $topic
      webhookSubscription: $subscription
    ) {
      webhookSubscription {
        id
        topic
        uri
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const UPDATE_SUBSCRIPTION = `
  mutation UpdatePMYWebhook(
    $id: ID!
    $subscription: WebhookSubscriptionInput!
  ) {
    webhookSubscriptionUpdate(
      id: $id
      webhookSubscription: $subscription
    ) {
      webhookSubscription {
        id
        topic
        uri
      }
      userErrors {
        field
        message
      }
    }
  }
`;

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

async function adminGraphql(admin, query, variables = undefined) {
  const response = await admin.graphql(query, variables ? { variables } : undefined);
  const json = await response.json();

  if (json?.errors?.length) {
    throw new Error(json.errors.map((error) => error.message).join("; "));
  }

  return json?.data || {};
}

export async function ensureShopifyOrderWebhooks(admin, appUrl) {
  const baseUrl = normalizeBaseUrl(appUrl);
  if (!baseUrl) {
    return {
      ok: false,
      error: "SHOPIFY_APP_URL is not configured",
      callbackUrl: null,
      subscriptions: [],
    };
  }

  const callbackUrl = `${baseUrl}/webhooks/orders`;

  try {
    const data = await adminGraphql(admin, QUERY_SUBSCRIPTIONS);
    const existing = data?.webhookSubscriptions?.nodes || [];
    const byTopic = new Map();

    for (const subscription of existing) {
      if (!ORDER_WEBHOOK_TOPICS.includes(subscription.topic)) continue;
      if (!byTopic.has(subscription.topic)) {
        byTopic.set(subscription.topic, subscription);
      }
    }

    const results = [];

    for (const topic of ORDER_WEBHOOK_TOPICS) {
      const current = byTopic.get(topic);

      if (!current) {
        const createdData = await adminGraphql(admin, CREATE_SUBSCRIPTION, {
          topic,
          subscription: {
            uri: callbackUrl,
            format: "JSON",
          },
        });

        const payload = createdData?.webhookSubscriptionCreate;
        const errors = payload?.userErrors || [];
        if (errors.length) {
          results.push({
            topic,
            status: "ERROR",
            error: errors.map((error) => error.message).join("; "),
          });
          continue;
        }

        results.push({
          topic,
          status: "CREATED",
          id: payload?.webhookSubscription?.id || null,
          uri: payload?.webhookSubscription?.uri || callbackUrl,
        });
        continue;
      }

      if (current.uri !== callbackUrl) {
        const updatedData = await adminGraphql(admin, UPDATE_SUBSCRIPTION, {
          id: current.id,
          subscription: {
            uri: callbackUrl,
            format: "JSON",
          },
        });

        const payload = updatedData?.webhookSubscriptionUpdate;
        const errors = payload?.userErrors || [];
        if (errors.length) {
          results.push({
            topic,
            status: "ERROR",
            id: current.id,
            error: errors.map((error) => error.message).join("; "),
          });
          continue;
        }

        results.push({
          topic,
          status: "UPDATED",
          id: payload?.webhookSubscription?.id || current.id,
          uri: payload?.webhookSubscription?.uri || callbackUrl,
        });
        continue;
      }

      results.push({
        topic,
        status: "ACTIVE",
        id: current.id,
        uri: current.uri,
      });
    }

    const ok = results.every((item) =>
      ["ACTIVE", "CREATED", "UPDATED"].includes(item.status),
    );

    return {
      ok,
      callbackUrl,
      subscriptions: results,
      error: ok
        ? null
        : results
            .filter((item) => item.status === "ERROR")
            .map((item) => `${item.topic}: ${item.error}`)
            .join(" | "),
    };
  } catch (error) {
    return {
      ok: false,
      callbackUrl,
      subscriptions: [],
      error: error?.message || String(error),
    };
  }
}

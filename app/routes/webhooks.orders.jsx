import { authenticate } from "../shopify.server";
import db from "../db.server";
import { processShopifyWebhookEvent } from "../utils/shopify-orders.server";

export const action = async ({ request }) => {
  const { payload, topic, shop, webhookId } = await authenticate.webhook(request);

  try {
    const result = await processShopifyWebhookEvent(db, {
      payload,
      topic,
      shop,
      webhookId,
    });

    console.log(
      `[SHOPIFY] ${topic} ${shop} → ${result.status || (result.duplicate ? "DUPLICATE" : "PROCESSED")}`,
    );

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error(`[SHOPIFY] ${topic} processing failed:`, error);
    // Non-2xx makes Shopify retry transient failures.
    return new Response(null, { status: 500 });
  }
};

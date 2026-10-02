import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const {
    shop,
    session,
    topic,
    tenantAllowed,
  } = await authenticate.webhook(request);

  if (!tenantAllowed) {
    if (shop) {
      await db.session.deleteMany({ where: { shop } });
    }
    console.warn(`[TENANT] Ignored ${topic} webhook from non-primary shop ${shop}`);
    return new Response(null, { status: 200 });
  }

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};

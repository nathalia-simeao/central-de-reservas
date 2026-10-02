import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const {
    payload,
    session,
    topic,
    shop,
    tenantAllowed,
  } = await authenticate.webhook(request);

  if (!tenantAllowed) {
    console.warn(`[TENANT] Ignored ${topic} webhook from non-primary shop ${shop}`);
    return new Response(null, { status: 200 });
  }

  console.log(`Received ${topic} webhook for ${shop}`);
  const current = payload.current;

  if (session) {
    await db.session.update({
      where: {
        id: session.id,
      },
      data: {
        scope: current.toString(),
      },
    });
  }

  return new Response();
};

import { data } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { getIntegrationCredentials } from "../utils/integration-secrets.server";
import { loadTripadvisorContent } from "../utils/tripadvisor.server";

const json = (body, init) => data(body, init);

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  const stored = await getIntegrationCredentials(db, "TRIPADVISOR").catch(() => null);
  if (!stored?.credentials?.apiKey) {
    return json({
      success: true,
      configured: false,
      locationConfigured: false,
      location: null,
      reviews: [],
      reviewsAccess: null,
    });
  }

  try {
    const content = await loadTripadvisorContent({
      apiKey: stored.credentials.apiKey,
      locationId: stored.credentials.locationId || null,
    });
    return json({ success: true, ...content });
  } catch (error) {
    console.error("[TRIPADVISOR] content load failed", error);
    return json(
      {
        success: false,
        error: error?.message || "Falha ao consultar o Tripadvisor Terra.",
      },
      { status: Number(error?.status) || 502 },
    );
  }
};

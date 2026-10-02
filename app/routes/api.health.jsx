import { data } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { getIntegrationHealth } from "../utils/integration-health.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  try {
    const health = await getIntegrationHealth(db);
    return data(
      { success: true, health },
      {
        status: health.overall === "ERROR" ? 503 : 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return data(
      {
        success: false,
        health: {
          overall: "ERROR",
          checkedAt: new Date().toISOString(),
          error: error?.message || String(error),
          privacy: {
            exposesCustomerData: false,
            exposesCredentials: false,
          },
        },
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
};

import {
  gygV1Error,
  gygV1Success,
  readGygBody,
  recordGygAuthenticatedTraffic,
  requireGygAuth,
} from "../utils/gyg-v1.server";

// Optional GetYourGuide Notification Webhook.
// It records deactivation notices for follow-up; it does not alter Shopify
// products, bookings, availability, or external integrations.
export const action = async ({ request }) => {
  const authError = requireGygAuth(request, "notify");
  if (authError) return authError;

  if (request.method !== "POST") {
    return gygV1Error("VALIDATION_FAILURE", "POST is required.");
  }

  const parsed = await readGygBody(request);
  if (parsed.error) return parsed.error;

  const event = parsed.data;
  const productId = String(event?.productDetails?.productId || "").trim();
  if (event?.notificationType !== "PRODUCT_DEACTIVATION" || !productId) {
    return gygV1Error(
      "VALIDATION_FAILURE",
      "Expected PRODUCT_DEACTIVATION notification with productDetails.productId.",
    );
  }

  const response = gygV1Success({});
  await recordGygAuthenticatedTraffic(
    "notify-product-deactivation",
    { productId },
    response,
  );
  return response;
};

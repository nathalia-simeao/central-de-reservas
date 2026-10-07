import { authenticate } from "../shopify.server";
import { handleStorefrontHoldAction } from "./api.storefront-hold";

export const loader = async ({ request }) => {
  await authenticate.public.appProxy(request);
  return new Response(
    JSON.stringify({
      success: false,
      error: "Use POST for storefront holds.",
      code: "METHOD_NOT_ALLOWED",
    }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
};

export const action = async ({ request }) => {
  const context = await authenticate.public.appProxy(request);
  const shop =
    context?.session?.shop ||
    new URL(request.url).searchParams.get("shop") ||
    null;

  return handleStorefrontHoldAction(request, {
    authenticatedProxy: true,
    shop,
  });
};

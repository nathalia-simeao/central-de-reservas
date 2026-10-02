import {
  getGygAvailabilities,
  recordGygAuthenticatedTraffic,
  requireGygAuth,
} from "../utils/gyg-v1.server";

export const loader = async ({ request }) => {
  const authError = requireGygAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");

  const response = await getGygAvailabilities({
    productId,
    fromDateTime: url.searchParams.get("fromDateTime"),
    toDateTime: url.searchParams.get("toDateTime"),
  });

  await recordGygAuthenticatedTraffic(
    "get-availabilities",
    { productId },
    response,
  );
  return response;
};

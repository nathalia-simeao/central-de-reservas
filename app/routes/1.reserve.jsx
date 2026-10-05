import {
  readGygBody,
  recordGygAuthenticatedTraffic,
  requireGygAuth,
  reserveGyg,
} from "../utils/gyg-v1.server";

export const action = async ({ request }) => {
  const authError = requireGygAuth(request, "reserve");
  if (authError) return authError;

  const parsed = await readGygBody(request);
  if (parsed.error) return parsed.error;

  const response = await reserveGyg(parsed.data);
  await recordGygAuthenticatedTraffic(
    "reserve",
    {
      productId: parsed.data?.productId,
      gygBookingReference: parsed.data?.gygBookingReference,
    },
    response,
  );
  return response;
};

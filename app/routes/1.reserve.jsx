import {
  readGygBody,
  recordGygAuthenticatedTraffic,
  requireGygAuth,
  reserveGyg,
} from "../utils/gyg-v1.server";

export const action = async ({ request }) => {
  const authError = requireGygAuth(request);
  if (authError) return authError;

  const parsed = await readGygBody(request);
  if (parsed.error) return parsed.error;

  await recordGygAuthenticatedTraffic("reserve", {
    productId: parsed.data?.productId,
    gygBookingReference: parsed.data?.gygBookingReference,
  });

  return reserveGyg(parsed.data);
};

import {
  bookGyg,
  readGygBody,
  recordGygAuthenticatedTraffic,
  requireGygAuth,
} from "../utils/gyg-v1.server";

export const action = async ({ request }) => {
  const authError = requireGygAuth(request);
  if (authError) return authError;

  const parsed = await readGygBody(request);
  if (parsed.error) return parsed.error;

  await recordGygAuthenticatedTraffic("book", {
    productId: parsed.data?.productId,
    gygBookingReference: parsed.data?.gygBookingReference,
    reservationReference: parsed.data?.reservationReference,
  });

  return bookGyg(parsed.data);
};

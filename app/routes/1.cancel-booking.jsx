import {
  cancelGygBooking,
  readGygBody,
  recordGygAuthenticatedTraffic,
  requireGygAuth,
} from "../utils/gyg-v1.server";

export const action = async ({ request }) => {
  const authError = requireGygAuth(request);
  if (authError) return authError;

  const parsed = await readGygBody(request);
  if (parsed.error) return parsed.error;

  const response = await cancelGygBooking(parsed.data);
  await recordGygAuthenticatedTraffic(
    "cancel-booking",
    {
      productId: parsed.data?.productId,
      gygBookingReference: parsed.data?.gygBookingReference,
      bookingReference: parsed.data?.bookingReference,
    },
    response,
  );
  return response;
};

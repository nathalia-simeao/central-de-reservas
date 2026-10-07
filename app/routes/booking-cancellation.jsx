import {
  readViatorJson,
  recordViatorAuthenticatedTraffic,
  requireViatorAuth,
  viatorBookingCancellation,
} from "../utils/viator.server";

export const action = async ({ request }) => {
  const authError = await requireViatorAuth(request, "v1");
  if (authError) return authError;

  const parsed = await readViatorJson(request, "v1");
  if (parsed.error) return parsed.error;

  const response = await viatorBookingCancellation(parsed.data);
  await recordViatorAuthenticatedTraffic(
    "booking-cancellation",
    {
      supplierId: parsed.data?.data?.SupplierId,
      bookingReference: parsed.data?.data?.BookingReference,
    },
    response,
  );
  return response;
};

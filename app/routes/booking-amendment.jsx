import {
  readViatorJson,
  recordViatorAuthenticatedTraffic,
  requireViatorAuth,
  viatorBookingAmendment,
} from "../utils/viator.server";

export const action = async ({ request }) => {
  const authError = await requireViatorAuth(request, "v1");
  if (authError) return authError;

  const parsed = await readViatorJson(request, "v1");
  if (parsed.error) return parsed.error;

  const response = await viatorBookingAmendment(parsed.data);
  await recordViatorAuthenticatedTraffic(
    "booking-amendment",
    {
      supplierId: parsed.data?.data?.SupplierId,
      supplierProductCode: parsed.data?.data?.SupplierProductCode,
      bookingReference: parsed.data?.data?.BookingReference,
    },
    response,
  );
  return response;
};

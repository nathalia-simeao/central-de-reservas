import {
  readViatorJson,
  recordViatorAuthenticatedTraffic,
  requireViatorAuth,
  viatorBooking,
} from "../utils/viator.server";

export const action = async ({ request }) => {
  const authError = await requireViatorAuth(request, "v1");
  if (authError) return authError;

  const parsed = await readViatorJson(request, "v1");
  if (parsed.error) return parsed.error;

  const response = await viatorBooking(parsed.data);
  await recordViatorAuthenticatedTraffic(
    "booking",
    {
      supplierId: parsed.data?.data?.SupplierId,
      supplierProductCode: parsed.data?.data?.SupplierProductCode,
      bookingReference: parsed.data?.data?.BookingReference,
      availabilityHoldReference: parsed.data?.data?.AvailabilityHoldReference,
    },
    response,
  );
  return response;
};

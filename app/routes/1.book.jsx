import {
  bookGyg,
  readGygBody,
  recordGygAuthenticatedTraffic,
  requireGygAuth,
} from "../utils/gyg-v1.server";

export const action = async ({ request }) => {
  const authError = requireGygAuth(request, "book");
  if (authError) return authError;

  const parsed = await readGygBody(request);
  if (parsed.error) return parsed.error;

  const response = await bookGyg(parsed.data);
  await recordGygAuthenticatedTraffic(
    "book",
    {
      productId: parsed.data?.productId,
      gygBookingReference: parsed.data?.gygBookingReference,
      reservationReference: parsed.data?.reservationReference,
    },
    response,
  );
  return response;
};

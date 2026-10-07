import {
  readViatorJson,
  recordViatorAuthenticatedTraffic,
  requireViatorAuth,
  viatorAvailabilityCheck,
} from "../utils/viator.server";

export const action = async ({ request }) => {
  const authError = await requireViatorAuth(request, "v2");
  if (authError) return authError;

  const parsed = await readViatorJson(request, "v2");
  if (parsed.error) return parsed.error;

  const response = await viatorAvailabilityCheck(parsed.data);
  await recordViatorAuthenticatedTraffic(
    "availability-check",
    {
      supplierId: parsed.data?.supplierId,
      productOptionId: parsed.data?.productOptions?.[0]?.productOptionId,
    },
    response,
  );
  return response;
};

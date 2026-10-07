import {
  readViatorJson,
  recordViatorAuthenticatedTraffic,
  requireViatorAuth,
  viatorReserve,
} from "../utils/viator.server";

export const action = async ({ request }) => {
  const authError = await requireViatorAuth(request, "v2");
  if (authError) return authError;

  const parsed = await readViatorJson(request, "v2");
  if (parsed.error) return parsed.error;

  const response = await viatorReserve(parsed.data);
  await recordViatorAuthenticatedTraffic(
    "reserve",
    {
      supplierId: parsed.data?.supplierId,
      productOptionId: parsed.data?.productOptionId,
    },
    response,
  );
  return response;
};

import {
  readViatorJson,
  recordViatorAuthenticatedTraffic,
  requireViatorAuth,
  viatorCalendar,
} from "../utils/viator.server";

export const action = async ({ request }) => {
  const authError = await requireViatorAuth(request, "v2");
  if (authError) return authError;

  const parsed = await readViatorJson(request, "v2");
  if (parsed.error) return parsed.error;

  const response = await viatorCalendar(parsed.data);
  await recordViatorAuthenticatedTraffic(
    "availability-calendar",
    {
      supplierId: parsed.data?.supplierId,
      productOptionId: parsed.data?.productOptionIds?.[0],
    },
    response,
  );
  return response;
};

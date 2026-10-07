import {
  readViatorJson,
  recordViatorAuthenticatedTraffic,
  requireViatorAuth,
  viatorTourList,
} from "../utils/viator.server";

export const action = async ({ request }) => {
  const authError = await requireViatorAuth(request, "v1");
  if (authError) return authError;

  const parsed = await readViatorJson(request, "v1");
  if (parsed.error) return parsed.error;

  const response = await viatorTourList(parsed.data);
  await recordViatorAuthenticatedTraffic(
    "tourlist",
    {
      supplierId: parsed.data?.data?.SupplierId,
    },
    response,
  );
  return response;
};

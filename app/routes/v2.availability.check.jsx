import {
  readViatorJson,
  requireViatorAuth,
  viatorAvailabilityCheck,
} from "../utils/viator.server";

export const action = async ({ request }) => {
  const authError = requireViatorAuth(request, "v2");
  if (authError) return authError;

  const parsed = await readViatorJson(request, "v2");
  if (parsed.error) return parsed.error;

  return viatorAvailabilityCheck(parsed.data);
};

import {
  readViatorJson,
  requireViatorAuth,
  viatorTourList,
} from "../utils/viator.server";

export const action = async ({ request }) => {
  const authError = requireViatorAuth(request, "v1");
  if (authError) return authError;

  const parsed = await readViatorJson(request, "v1");
  if (parsed.error) return parsed.error;

  return viatorTourList(parsed.data);
};

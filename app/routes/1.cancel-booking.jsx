import {
  cancelGygBooking,
  readGygBody,
  requireGygAuth,
} from "../utils/gyg-v1.server";

export const action = async ({ request }) => {
  const authError = requireGygAuth(request);
  if (authError) return authError;

  const parsed = await readGygBody(request);
  if (parsed.error) return parsed.error;

  return cancelGygBooking(parsed.data);
};

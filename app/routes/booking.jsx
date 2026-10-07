import {
  readViatorJson,
  requireViatorAuth,
  viatorBooking,
} from "../utils/viator.server";
import db from "../db.server";
import { recordViatorEvidence } from "../utils/viator-onboarding.server";

export const action = async ({ request }) => {
  const authError = await requireViatorAuth(request, "v1");
  if (authError) return authError;

  const parsed = await readViatorJson(request, "v1");
  if (parsed.error) return parsed.error;

  const response = await viatorBooking(parsed.data);
  if (response.ok) {
    try {
      const payload = await response.clone().json();
      if (payload?.data?.RequestStatus?.Status === "SUCCESS") {
        void recordViatorEvidence(db, "BOOKING", {
          receivedAt: new Date().toISOString(),
        });
      }
    } catch {
      // Evidence is best-effort and never changes the Supplier API response.
    }
  }
  return response;
};

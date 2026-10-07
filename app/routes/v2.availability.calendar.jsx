import {
  readViatorJson,
  requireViatorAuth,
  viatorCalendar,
} from "../utils/viator.server";
import db from "../db.server";
import { recordViatorEvidence } from "../utils/viator-onboarding.server";

export const action = async ({ request }) => {
  const authError = await requireViatorAuth(request, "v2");
  if (authError) return authError;

  const parsed = await readViatorJson(request, "v2");
  if (parsed.error) return parsed.error;

  const response = await viatorCalendar(parsed.data);
  if (response.ok) {
    try {
      await response.clone().json();
      if (response.ok) {
        void recordViatorEvidence(db, "CALENDAR", {
          receivedAt: new Date().toISOString(),
        });
      }
    } catch {
      // Evidence is best-effort and never changes the Supplier API response.
    }
  }
  return response;
};

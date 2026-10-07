import db from "../db.server";
import { recordCivitatisEvidence } from "../utils/civitatis-onboarding.server";
import {
  civitatisConfirmBooking,
  readCivitatisJson,
  requireCivitatisAuth,
  validateCivitatisCapabilities,
} from "../utils/civitatis.server";

export const action = async ({ request, params }) => {
  const authError = await requireCivitatisAuth(request);
  if (authError) return authError;

  const capabilityError = validateCivitatisCapabilities(request);
  if (capabilityError) return capabilityError;

  const parsed = await readCivitatisJson(request);
  if (parsed.error) return parsed.error;

  const response = await civitatisConfirmBooking(request, params.uuid, parsed.data);
  if (response.ok) {
    void recordCivitatisEvidence(db, "BOOKING_CONFIRM", {
      uuid: params.uuid,
      receivedAt: new Date().toISOString(),
    });
  }
  return response;
};

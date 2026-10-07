import db from "../db.server";
import { recordCivitatisEvidence } from "../utils/civitatis-onboarding.server";
import {
  civitatisAvailability,
  readCivitatisJson,
  requireCivitatisAuth,
  validateCivitatisCapabilities,
} from "../utils/civitatis.server";

export const action = async ({ request }) => {
  const authError = await requireCivitatisAuth(request);
  if (authError) return authError;

  const capabilityError = validateCivitatisCapabilities(request);
  if (capabilityError) return capabilityError;

  const parsed = await readCivitatisJson(request);
  if (parsed.error) return parsed.error;

  const response = await civitatisAvailability(request, parsed.data);
  if (response.ok) {
    void recordCivitatisEvidence(db, "AVAILABILITY", {
      productId: parsed.data?.productId || null,
      receivedAt: new Date().toISOString(),
    });
  }
  return response;
};

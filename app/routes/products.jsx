import db from "../db.server";
import { recordCivitatisEvidence } from "../utils/civitatis-onboarding.server";
import {
  civitatisProducts,
  requireCivitatisAuth,
  validateCivitatisCapabilities,
} from "../utils/civitatis.server";

export const loader = async ({ request }) => {
  const authError = await requireCivitatisAuth(request);
  if (authError) return authError;

  const capabilityError = validateCivitatisCapabilities(request);
  if (capabilityError) return capabilityError;

  const response = await civitatisProducts();
  if (response.ok) {
    void recordCivitatisEvidence(db, "PRODUCTS", {
      receivedAt: new Date().toISOString(),
    });
  }
  return response;
};

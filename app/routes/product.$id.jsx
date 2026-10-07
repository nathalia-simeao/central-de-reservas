import db from "../db.server";
import { recordCivitatisEvidence } from "../utils/civitatis-onboarding.server";
import {
  civitatisProduct,
  requireCivitatisAuth,
  validateCivitatisCapabilities,
} from "../utils/civitatis.server";

export const loader = async ({ request, params }) => {
  const authError = await requireCivitatisAuth(request);
  if (authError) return authError;

  const capabilityError = validateCivitatisCapabilities(request);
  if (capabilityError) return capabilityError;

  const response = await civitatisProduct(params.id);
  if (response.ok) {
    void recordCivitatisEvidence(db, "PRODUCT", {
      productId: params.id,
      receivedAt: new Date().toISOString(),
    });
  }
  return response;
};

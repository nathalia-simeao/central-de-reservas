import {
  civitatisAvailability,
  readCivitatisJson,
  requireCivitatisAuth,
  validateCivitatisCapabilities,
} from "../utils/civitatis.server";

export const action = async ({ request }) => {
  const authError = requireCivitatisAuth(request);
  if (authError) return authError;

  const capabilityError = validateCivitatisCapabilities(request);
  if (capabilityError) return capabilityError;

  const parsed = await readCivitatisJson(request);
  if (parsed.error) return parsed.error;

  return civitatisAvailability(request, parsed.data);
};

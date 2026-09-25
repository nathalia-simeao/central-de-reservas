import { gygV1Error, requireGygAuth } from "../utils/gyg-v1.server";

export const loader = async ({ request }) => {
  const authError = requireGygAuth(request);
  return authError || gygV1Error(
    "VALIDATION_FAILURE",
    "Legacy endpoint retired. Configure GetYourGuide to use /1/get-availabilities.",
  );
};

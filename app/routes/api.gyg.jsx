import { gygV1Error, requireGygAuth } from "../utils/gyg-v1.server";

const retired = () =>
  gygV1Error(
    "VALIDATION_FAILURE",
    "Legacy PMY GetYourGuide endpoint retired. Use the Supplier API v1 endpoints under /1/.",
  );

export const loader = async ({ request }) => {
  const authError = requireGygAuth(request);
  return authError || retired();
};

export const action = async ({ request }) => {
  const authError = requireGygAuth(request);
  return authError || retired();
};

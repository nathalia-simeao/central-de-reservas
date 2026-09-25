import {
  civitatisCancelBooking,
  civitatisGetBooking,
  requireCivitatisAuth,
  validateCivitatisCapabilities,
} from "../utils/civitatis.server";

function validate(request) {
  return (
    requireCivitatisAuth(request) ||
    validateCivitatisCapabilities(request)
  );
}

export const loader = async ({ request, params }) => {
  const validationError = validate(request);
  if (validationError) return validationError;

  return civitatisGetBooking(params.uuid);
};

export const action = async ({ request, params }) => {
  const validationError = validate(request);
  if (validationError) return validationError;

  if (request.method !== "DELETE") {
    return new Response(
      JSON.stringify({
        error: "METHOD_NOT_ALLOWED",
        message: "Only DELETE is supported on this endpoint.",
      }),
      {
        status: 405,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      },
    );
  }

  return civitatisCancelBooking(params.uuid);
};

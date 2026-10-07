import db from "../db.server";
import { recordCivitatisEvidence } from "../utils/civitatis-onboarding.server";
import {
  civitatisCancelBooking,
  civitatisGetBooking,
  requireCivitatisAuth,
  validateCivitatisCapabilities,
} from "../utils/civitatis.server";

async function validate(request) {
  return (
    (await requireCivitatisAuth(request)) ||
    validateCivitatisCapabilities(request)
  );
}

export const loader = async ({ request, params }) => {
  const validationError = await validate(request);
  if (validationError) return validationError;

  const response = await civitatisGetBooking(params.uuid);
  if (response.ok) {
    void recordCivitatisEvidence(db, "BOOKING_GET", {
      uuid: params.uuid,
      receivedAt: new Date().toISOString(),
    });
  }
  return response;
};

export const action = async ({ request, params }) => {
  const validationError = await validate(request);
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

  const response = await civitatisCancelBooking(params.uuid);
  if (response.ok) {
    void recordCivitatisEvidence(db, "BOOKING_CANCEL", {
      uuid: params.uuid,
      receivedAt: new Date().toISOString(),
    });
  }
  return response;
};

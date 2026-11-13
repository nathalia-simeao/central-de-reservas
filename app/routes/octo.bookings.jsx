import { octoCreateBooking, withOcto } from "../utils/octo-routes.server";
import { octoError } from "../utils/octo.server";

export const loader = ({ request }) => withOcto(request, "GET /bookings", () => octoError(400, "BAD_REQUEST", "Listing bookings is not supported. Use GET /bookings/{uuid}."));
export const action = ({ request }) => withOcto(request, "POST /bookings", () => octoCreateBooking(request));

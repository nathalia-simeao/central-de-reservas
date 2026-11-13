import { octoConfirmBooking, withOcto } from "../utils/octo-routes.server";

export const action = ({ request, params }) => withOcto(request, "POST /bookings/:uuid/confirm", () => octoConfirmBooking(request, params.uuid));

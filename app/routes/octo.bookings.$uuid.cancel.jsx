import { octoCancelBooking, withOcto } from "../utils/octo-routes.server";

export const action = ({ request, params }) => withOcto(request, "POST /bookings/:uuid/cancel", () => octoCancelBooking(params.uuid));

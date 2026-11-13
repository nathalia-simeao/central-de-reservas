import { octoCancelBooking, octoGetBooking, withOcto } from "../utils/octo-routes.server";
import { octoError } from "../utils/octo.server";

export const loader = ({ request, params }) => withOcto(request, "GET /bookings/:uuid", () => octoGetBooking(params.uuid));

// DELETE = cancelar (OCTO 1.0). Alterar reserva (PATCH) ainda não: a plataforma cancela e cria de novo.
export const action = ({ request, params }) => withOcto(request, `${request.method} /bookings/:uuid`, () => (
  request.method === "DELETE"
    ? octoCancelBooking(params.uuid)
    : octoError(400, "BAD_REQUEST", "Booking updates are not supported. Cancel and create a new booking.")
));

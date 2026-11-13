import { octoAvailabilityCheck, withOcto } from "../utils/octo-routes.server";

export const action = ({ request }) => withOcto(request, "POST /availability", () => octoAvailabilityCheck(request));

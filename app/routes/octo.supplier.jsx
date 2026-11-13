import { octoSupplier, withOcto } from "../utils/octo-routes.server";

export const loader = ({ request }) => withOcto(request, "GET /supplier", octoSupplier);

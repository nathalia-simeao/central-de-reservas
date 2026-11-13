import { octoProducts, withOcto } from "../utils/octo-routes.server";

export const loader = ({ request }) => withOcto(request, "GET /products", octoProducts);

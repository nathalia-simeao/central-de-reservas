import { octoProductById, withOcto } from "../utils/octo-routes.server";

export const loader = ({ request, params }) => withOcto(request, "GET /products/:id", () => octoProductById(params.productId));

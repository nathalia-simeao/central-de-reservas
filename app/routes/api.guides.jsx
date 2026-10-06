// Dedicated resource endpoint for guide mutations in the embedded Shopify app.
// Reuses the Central action so validation, persistence and permissions stay identical
// while callers consistently receive JSON instead of document HTML.
export { action } from "../services/central-route.server";

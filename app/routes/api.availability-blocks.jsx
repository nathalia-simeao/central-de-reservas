// Dedicated resource endpoint for availability block mutations.
// Reuses the Central action so validation, persistence and sync queue behavior
// stay identical while embedded Shopify requests receive JSON instead of a document response.
export { action } from "../services/central-route.server";

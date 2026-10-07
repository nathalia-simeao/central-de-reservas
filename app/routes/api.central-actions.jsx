// Dedicated JSON mutation endpoint for the PMY Central.
//
// Posting mutations to "/" is fragile inside the embedded Shopify app because
// document navigation/auth layers can answer with HTML or HTTP 405. Reusing the
// Central action here preserves the same validation/persistence logic while
// guaranteeing callers target a resource route that returns JSON.
export { action } from "../services/central-route.server";

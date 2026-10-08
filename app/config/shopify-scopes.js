/**
 * Canonical Shopify OAuth scopes for PMY Central.
 *
 * Keep this list minimal. shopify.app.toml intentionally duplicates the CSV
 * required by Shopify CLI, and CI verifies that it matches this source exactly.
 */
export const SHOPIFY_SCOPES = Object.freeze([
  "read_products",
  "write_products",
  "read_orders",
  "write_draft_orders",
  "write_files",
  "read_metaobjects",
  "write_app_proxy",
]);

export const SHOPIFY_SCOPE_REASONS = Object.freeze({
  read_products:
    "Read tours, variants, product metafields and catalog data used by the Central.",
  write_products:
    "Mirror Central availability blocks into the product metafields consumed by the PMY storefront calendar.",
  read_orders:
    "Read and receive Shopify order data used to create/update Central bookings.",
  write_draft_orders:
    "Create Draft Orders for manual reservations and protected checkout links.",
  write_files:
    "Upload and persist PMY media assets in Shopify Files.",
  read_metaobjects:
    "Read guide metaobjects maintained in Shopify and synchronize them into the Central.",
  write_app_proxy:
    "Maintain the signed storefront App Proxy used by the secure capacity hold endpoint.",
});

export const SHOPIFY_SCOPES_CSV = SHOPIFY_SCOPES.join(",");
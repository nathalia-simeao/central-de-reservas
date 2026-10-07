import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("draft order persists invoiceUrl before returning the protected checkout link", async () => {
  const draftRoute = await fs.readFile(
    new URL("../app/routes/api.draft-order.jsx", import.meta.url),
    "utf8",
  );
  const secureRoute = await fs.readFile(
    new URL("../app/routes/checkout.hold.$holdId.jsx", import.meta.url),
    "utf8",
  );

  assert.equal(
    draftRoute.includes("invoiceUrl: draftOrder.invoiceUrl"),
    true,
    "Draft Order invoiceUrl must be persisted in the booking raw payload.",
  );
  assert.equal(
    draftRoute.includes("/checkout/hold/"),
    true,
    "The UI must receive the protected Central checkout URL, not Shopify directly.",
  );
  assert.equal(
    secureRoute.includes("hold.rawPayload.invoiceUrl"),
    true,
    "The protected checkout route must read the persisted Shopify invoice URL.",
  );
  assert.equal(
    secureRoute.includes("status: 302"),
    true,
    "A valid active hold must redirect to Shopify.",
  );
  assert.equal(
    secureRoute.includes("status: 410"),
    true,
    "Expired holds must remain blocked and release capacity.",
  );
});

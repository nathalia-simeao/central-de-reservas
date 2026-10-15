import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("GYG optional notification webhook uses inbound Basic Auth and safe response", async () => {
  const source = await fs.readFile(
    new URL("../app/routes/1.notify.jsx", import.meta.url), "utf8",
  );
  assert.ok(source.includes('requireGygAuth(request, "notify")'));
  assert.ok(source.includes('event?.notificationType !== "PRODUCT_DEACTIVATION"'));
  assert.ok(source.includes('event?.productDetails?.productId'));
  assert.ok(source.includes('gygV1Success({})'));
  assert.ok(source.includes('recordGygAuthenticatedTraffic('));
  assert.equal(source.includes('prisma.tour.update'), false);
  assert.equal(source.includes('shopifyProductUpdate'), false);
});


test("GYG portal duplicate-prefix notify endpoint maps to canonical handler", async () => {
  const alias = await fs.readFile(new URL("../app/routes/1.1.notify.jsx", import.meta.url), "utf8");
  assert.ok(alias.includes('export { action } from "./1.notify"'));
});

test("GYG deactivation dashboard alerts require Shopify admin auth and do not mutate products", async () => {
  const route = await fs.readFile(new URL("../app/routes/api.gyg-notification-alerts.jsx", import.meta.url), "utf8");
  const panel = await fs.readFile(new URL("../app/components/pmy/GygDeactivationAlerts.jsx", import.meta.url), "utf8");
  const dashboard = await fs.readFile(new URL("../app/components/pmy/DashboardTab.jsx", import.meta.url), "utf8");
  assert.ok(route.includes("authenticate.admin(request)"));
  assert.ok(route.includes('topic: "notify-product-deactivation"'));
  assert.ok(route.includes("take: 30"));
  assert.ok(route.includes("db.gygProductOption.findMany"));
  assert.ok(panel.includes("/api/gyg-notification-alerts"));
  assert.ok(panel.includes("window.shopify?.idToken?.()"));
  assert.ok(dashboard.includes("<GygDeactivationAlerts lang={lang} />"));
  assert.equal(route.includes("db.tour.update"), false);
});

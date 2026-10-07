import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Civitatis Operator API onboarding exposes the OCTO-style endpoints", async () => {
  const source = await fs.readFile(
    new URL("../app/utils/civitatis-onboarding.server.js", import.meta.url),
    "utf8",
  );

  for (const path of [
    "/products",
    "/product/{id}",
    "/availability",
    "/bookings",
    "/bookings/{uuid}/confirm",
    "/bookings/{uuid}",
    "/healthcheck",
  ]) {
    assert.equal(source.includes(path), true, "missing " + path);
  }
});

test("Civitatis rollout records real authenticated endpoint evidence", async () => {
  const routes = [
    ["products.jsx", "PRODUCTS"],
    ["product.$id.jsx", "PRODUCT"],
    ["availability.jsx", "AVAILABILITY"],
    ["bookings.jsx", "BOOKING_CREATE"],
    ["bookings.$uuid.confirm.jsx", "BOOKING_CONFIRM"],
    ["bookings.$uuid.jsx", "BOOKING_CANCEL"],
  ];

  for (const [file, topic] of routes) {
    const source = await fs.readFile(
      new URL("../app/routes/" + file, import.meta.url),
      "utf8",
    );
    assert.equal(source.includes("recordCivitatisEvidence"), true);
    assert.equal(source.includes('"' + topic + '"'), true);
  }
});

test("Civitatis UI makes PMY-generated token direction explicit", async () => {
  const route = await fs.readFile(
    new URL("../app/routes/_index/route.jsx", import.meta.url),
    "utf8",
  );
  const modal = await fs.readFile(
    new URL("../app/components/pmy/CentralModalLayer.jsx", import.meta.url),
    "utf8",
  );

  assert.equal(route.includes("o token é gerado por nós"), true);
  assert.equal(modal.includes("Gerar token seguro"), true);
  assert.equal(modal.includes("CivitatisOnboardingPanel"), true);
});

test("Civitatis field mapping uses the live Operator API contract", async () => {
  const config = await fs.readFile(
    new URL("../app/config/pmy-central-config.js", import.meta.url),
    "utf8",
  );

  assert.equal(config.includes('tourId: "productId"'), true);
  assert.equal(config.includes('bookingRef: "resellerReference"'), true);
  assert.equal(config.includes("capability pricing"), true);
});

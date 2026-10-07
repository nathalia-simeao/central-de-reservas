import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Viator onboarding exposes Supplier API endpoints and mapping API", async () => {
  const server = await fs.readFile(
    new URL("../app/utils/viator-onboarding.server.js", import.meta.url),
    "utf8",
  );

  for (const path of [
    "/tourlist",
    "/v2/availability/calendar",
    "/v2/availability/check",
    "/v2/reserve",
    "/booking",
    "/booking-amendment",
    "/booking-cancellation",
    "/v2/mappings/catalog",
    "/v2/mappings/connect",
    "/v2/mappings/disconnect",
  ]) {
    assert.equal(server.includes(path), true, "missing " + path);
  }
});

test("Viator backoffice does not expose API key to the browser", async () => {
  const server = await fs.readFile(
    new URL("../app/utils/viator-onboarding.server.js", import.meta.url),
    "utf8",
  );
  const route = await fs.readFile(
    new URL("../app/routes/api.viator-onboarding.jsx", import.meta.url),
    "utf8",
  );

  assert.equal(server.includes("credentialsConfigured"), true);
  assert.equal(route.includes("apiKey:"), false);
});

test("Viator Supplier routes record technical evidence", async () => {
  const routes = [
    ["tourlist.jsx", "TOUR_LIST"],
    ["v2.availability.calendar.jsx", "CALENDAR"],
    ["v2.availability.check.jsx", "AVAILABILITY_CHECK"],
    ["v2.reserve.jsx", "RESERVE"],
    ["booking.jsx", "BOOKING"],
    ["booking-amendment.jsx", "BOOKING_AMENDMENT"],
    ["booking-cancellation.jsx", "BOOKING_CANCELLATION"],
  ];

  for (const [file, topic] of routes) {
    const source = await fs.readFile(
      new URL("../app/routes/" + file, import.meta.url),
      "utf8",
    );
    assert.equal(source.includes("recordViatorEvidence"), true);
    assert.equal(source.includes('"' + topic + '"'), true);
  }
});

test("Viator onboarding UI supports real catalog mapping actions", async () => {
  const source = await fs.readFile(
    new URL("../app/components/pmy/ViatorOnboardingPanel.jsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("Consultar catálogo e mapeamentos"), true);
  assert.equal(source.includes("onConnectMapping"), true);
  assert.equal(source.includes("onDisconnectMapping"), true);
  assert.equal(source.includes("DropdownSelect"), true);
});

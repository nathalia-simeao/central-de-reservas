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


test("Viator v2 ticket quantities reject malformed and fractional values", async () => {
  const server = await fs.readFile(
    new URL("../app/utils/viator.server.js", import.meta.url),
    "utf8",
  );
  assert.equal(server.includes("Number.parseInt(ticket?.quantity, 10)"), false);
  assert.equal(server.includes("Number.isSafeInteger(quantity)"), true);
  assert.equal(server.includes("Number.isSafeInteger(explicit)"), true);
  assert.equal(server.includes('String(ticket.quantity).trim() === ""'), true);
});


test("Viator v2 prices use validated per-category retail values without inventing net rates", async () => {
  const server = await fs.readFile(
    new URL("../app/utils/viator.server.js", import.meta.url),
    "utf8",
  );
  assert.equal(server.includes('type: "PER_PERSON_PRICE", prices'), true);
  assert.equal(server.includes("retailPrice: amounts[0]"), true);
  assert.equal(server.includes("netPrice:"), false);
  assert.equal(server.includes("amounts.some((amount) => !Number.isFinite(amount) || amount < 0)"), true);
  assert.equal(server.includes("price: viatorPriceForTour(tour)"), true);
  assert.equal(server.includes("price: reservedPrice"), true);
  assert.equal(server.includes('return unsupportedPrice();'), true);
});


test("Viator reserve stores the offered price and requires a real hold expiration", async () => {
  const source = await fs.readFile(new URL("../app/utils/viator.server.js", import.meta.url), "utf8");
  assert.ok(source.includes("heldPrice: reservedPrice"));
  assert.ok(source.includes("heldCurrency: currencyForTour(tour)"));
  assert.ok(source.includes("priceHeldAt: new Date().toISOString()"));
  assert.ok(source.includes("hold.holdExpiresAt &&"));
  assert.equal(source.includes("(!hold.holdExpiresAt || new Date(hold.holdExpiresAt) > new Date())"), false);
});


test("Viator booking consumes valid holds atomically and never retries invalid hold as direct booking", async () => {
  const source = await fs.readFile(new URL("../app/utils/viator.server.js", import.meta.url), "utf8");
  const holdBranch = source.slice(source.indexOf("const holdReference = clean(data?.AvailabilityHoldReference);"), source.indexOf("const guarded = await createBookingWithCapacityGuard", source.indexOf("const holdReference = clean(data?.AvailabilityHoldReference);")));
  assert.ok(holdBranch.includes("await prisma.$transaction(async (tx) =>"));
  assert.ok(holdBranch.includes("await lockTour(tx, tour.id)"));
  assert.ok(holdBranch.includes('current.status !== "PENDING"'));
  assert.ok(holdBranch.includes("new Date(current.holdExpiresAt) <= new Date()"));
  assert.ok(holdBranch.includes("heldPrice: current.rawPayload?.heldPrice ?? null"));
  assert.ok(holdBranch.includes("if (!confirmed)"));
  assert.ok(holdBranch.includes("return viatorV1ErrorResponse("));
});

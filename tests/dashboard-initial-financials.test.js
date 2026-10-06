import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("initial dashboard payload serializes booking Decimal totals as primitives", async () => {
  const loaderSource = await fs.readFile(
    new URL("../app/services/central-loader.server.js", import.meta.url),
    "utf8",
  );

  assert.equal(loaderSource.includes("bookings = bookings.map(bookingForClient);"), true);
  assert.equal(loaderSource.includes("String(booking.totalPrice)"), true);
});

test("bookings resource uses the same financial serialization contract", async () => {
  const resourceSource = await fs.readFile(
    new URL("../app/routes/api.bookings.jsx", import.meta.url),
    "utf8",
  );

  assert.equal(resourceSource.includes("String(booking.totalPrice)"), true);
});

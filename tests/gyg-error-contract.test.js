import test from "node:test";
import assert from "node:assert/strict";

import { gygV1Error } from "../app/utils/gyg-v1.server.js";

test("GYG invalid ticket category responses preserve the rejected category", async () => {
  const response = gygV1Error(
    "INVALID_TICKET_CATEGORY",
    "The ticket category INFANT is not configured for this product.",
    { ticketCategory: "INFANT" },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    errorCode: "INVALID_TICKET_CATEGORY",
    errorMessage: "The ticket category INFANT is not configured for this product.",
    ticketCategory: "INFANT",
  });
});

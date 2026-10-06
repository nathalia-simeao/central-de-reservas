import test from "node:test";
import assert from "node:assert/strict";

import { formatGygDateTime } from "../app/utils/gyg-v1.server.js";

test("GYG reservation expiration uses local activity time with UTC offset and no milliseconds", () => {
  assert.equal(
    formatGygDateTime(
      new Date("2026-10-06T18:42:58.688Z"),
      "Europe/Lisbon",
    ),
    "2026-10-06T19:42:58+01:00",
  );

  assert.equal(
    formatGygDateTime(
      new Date("2026-01-06T18:42:58.688Z"),
      "Europe/Lisbon",
    ),
    "2026-01-06T18:42:58+00:00",
  );
});

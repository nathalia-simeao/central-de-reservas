import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const aliases = {
  "app/routes/1.1.get-availabilities.jsx": 'export { loader } from "./1.get-availabilities";',
  "app/routes/1.1.reserve.jsx": 'export { action } from "./1.reserve";',
  "app/routes/1.1.cancel-reservation.jsx": 'export { action } from "./1.cancel-reservation";',
  "app/routes/1.1.book.jsx": 'export { action } from "./1.book";',
  "app/routes/1.1.cancel-booking.jsx": 'export { action } from "./1.cancel-booking";',
};

test("GYG self-test compatibility aliases reuse canonical Supplier API handlers", async () => {
  for (const [path, expected] of Object.entries(aliases)) {
    const url = new URL("../" + path, import.meta.url);
    const source = await fs.readFile(url, "utf8");
    assert.equal(source.includes(expected), true);
  }
});

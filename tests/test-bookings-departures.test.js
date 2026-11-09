import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

// TourDeparture não tem "platform": o filtro de reservas de teste do GYG só vale
// para consultas de Booking. Usá-lo em tourDeparture derruba a página (Prisma).
function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(jsx?|tsx?)$/.test(name) ? [path] : [];
  });
}

test("filtro de reservas de teste não é aplicado em tourDeparture", () => {
  const offenders = files("app").filter((file) =>
    /tourDeparture\.(findMany|findFirst|count)\(\{\s*where:[^;]*?excludeTestBookingsWhere/s.test(
      readFileSync(file, "utf8").replace(/db\.booking\.[\s\S]*?\}\)/g, ""),
    ),
  );
  assert.deepEqual(offenders, []);
});

import test from "node:test";
import assert from "node:assert/strict";
import { isGuide, normalizeAreas, personAreas } from "../app/utils/team-areas.js";

test("áreas da equipe", () => {
  assert.deepEqual(normalizeAreas('["marketing","GUIA","x"]'), ["GUIA", "MARKETING"]);
  assert.deepEqual(normalizeAreas("ADMIN,COMERCIAL"), ["ADMIN", "COMERCIAL"]);
  assert.deepEqual(personAreas({}), ["GUIA"]);
  assert.equal(isGuide({ areas: ["MARKETING"] }), false);
  assert.equal(isGuide({ areas: ["ADMIN", "GUIA"] }), true);
});

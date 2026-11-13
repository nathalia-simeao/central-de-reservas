import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { getGuideFromRequest, sessionCookieHeaders, sessionTokenFromRequest } from "../app/utils/guide-portal.server.js";

const sha = (v) => createHash("sha256").update(v).digest("hex");
function fakePrisma(valid) {
  return {
    guideSession: {
      findUnique: async ({ where }) => (where.tokenHash === sha(valid)
        ? { id: "s1", pending: false, expiresAt: new Date(Date.now() + 80 * 864e5), guide: { id: "g1", name: "Nat", portalEnabled: true, passwordHash: "x" } }
        : null),
      update: async () => ({}),
    },
  };
}

test("cookie antigo vencido vindo primeiro não derruba o login", async () => {
  const request = new Request("https://x/guia/quadro", { headers: { Cookie: "pmy_guide=velho; pmy_guide=novo" } });
  const guide = await getGuideFromRequest(fakePrisma("novo"), request);
  assert.equal(guide?.id, "g1");
  assert.equal(guide.passwordHash, undefined);
  assert.equal(sessionTokenFromRequest(request), "novo");
});

test("regrava o cookie e apaga o de Path=/guia", () => {
  const cookies = sessionCookieHeaders("abc").getSetCookie();
  assert.equal(cookies.length, 2);
  assert.match(cookies[0], /Path=\/;.*Max-Age=7776000/);
  assert.match(cookies[1], /Path=\/guia;.*Max-Age=0/);
});

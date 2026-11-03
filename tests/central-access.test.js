import test from "node:test";
import assert from "node:assert/strict";
import { ADMIN_ONLY_ACTIONS, isAdmin, resolveCentralUser, shopifyUserIdFromAuth } from "../app/utils/central-access.server.js";

function fakePrisma(initial = []) {
  const users = [...initial];
  return {
    users,
    centralUser: {
      findUnique: async ({ where }) => users.find((u) => u.shopifyUserId === where.shopifyUserId) || null,
      count: async ({ where }) => users.filter((u) => u.role === where.role).length,
      create: async ({ data }) => { const u = { id: `u${users.length + 1}`, lastSeenAt: new Date(), ...data }; users.push(u); return u; },
      update: async () => ({}),
    },
  };
}

test("the Shopify staff user comes from the session token", () => {
  assert.equal(shopifyUserIdFromAuth({ sessionToken: { sub: 123 } }), "123");
  assert.equal(shopifyUserIdFromAuth({}), null);
});

test("first user becomes ADMIN, the next ones STAFF", async () => {
  const prisma = fakePrisma();
  const first = await resolveCentralUser(prisma, { sessionToken: { sub: "1" } });
  const second = await resolveCentralUser(prisma, { sessionToken: { sub: "2" } });
  const firstAgain = await resolveCentralUser(prisma, { sessionToken: { sub: "1" } });
  assert.equal(first.role, "ADMIN");
  assert.equal(second.role, "STAFF");
  assert.equal(firstAgain.role, "ADMIN");
  assert.equal(prisma.users.length, 2);
});

test("a database failure never locks people out", async () => {
  const prisma = { centralUser: { findUnique: async () => { throw new Error("no table"); } } };
  assert.equal(isAdmin(await resolveCentralUser(prisma, { sessionToken: { sub: "9" } })), true);
});

test("financial and integration actions are admin-only; daily operations are not", () => {
  for (const action of ["saveCostSettings", "saveGygTourConfig", "saveBusinessSettings", "saveCentralUser"]) {
    assert.equal(ADMIN_ONLY_ACTIONS.has(action), true, action);
  }
  for (const action of ["createBooking", "setBookingAttendance", "saveDepartureTags", "saveLanguageQuotas"]) {
    assert.equal(ADMIN_ONLY_ACTIONS.has(action), false, action);
  }
});

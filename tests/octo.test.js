import test from "node:test";
import assert from "node:assert/strict";
import { localOffsetIso, octoCalendar, octoProduct } from "../app/utils/octo.server.js";
import { Buffer } from "node:buffer";

test("OCTO local times carry the Lisbon offset (winter and summer)", () => {
  assert.equal(localOffsetIso("2026-11-14T09:30:00.000Z"), "2026-11-14T09:30:00+00:00");
  assert.equal(localOffsetIso("2026-07-14T08:30:00.000Z"), "2026-07-14T09:30:00+01:00");
});

test("calendar groups start times per day and fills closed days", () => {
  const items = [
    { localDateTimeStart: "2026-11-14T09:30:00.000Z", available: true, vacancies: 10, capacity: 20 },
    { localDateTimeStart: "2026-11-14T14:00:00.000Z", available: false, vacancies: 0, capacity: 20 },
  ];
  const cal = octoCalendar(items, { localDateStart: "2026-11-14", localDateEnd: "2026-11-15" });
  assert.equal(cal.length, 2);
  assert.deepEqual({ ...cal[0], openingHours: undefined }, { localDate: "2026-11-14", available: true, status: "AVAILABLE", vacancies: 10, capacity: 40, openingHours: undefined });
  assert.equal(cal[1].status, "CLOSED");
});

test("product has OCTO option with start times and typed units", () => {
  const product = octoProduct({
    tour: { id: "t1", title: "Belém", scheduleSlots: ["14:00", "09:30"], maxCapacity: 20, timezone: "Europe/Lisbon" },
    details: { id: "t1", internalName: "Belém", options: [{ id: "STANDARD", internalName: "Standard", units: [{ id: "ADULT", internalName: "ADULT", restrictions: [{ maxQuantity: 20 }] }, { id: "CHILD", internalName: "CHILD", restrictions: [{ maxQuantity: 20 }] }] }] },
  });
  assert.equal(product.availabilityType, "START_TIME");
  assert.deepEqual(product.options[0].availabilityLocalStartTimes, ["09:30", "14:00"]);
  assert.equal(product.options[0].units[1].type, "CHILD");
  assert.deepEqual(product.options[0].units[1].restrictions.accompaniedBy, ["ADULT", "SENIOR"]);
});

test("each platform key authenticates as that platform; wrong keys are refused", async () => {
  process.env.INTEGRATION_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  const { generateOctoKey, requireOctoAuth, setOctoLive, octoLivePlatforms } = await import("../app/utils/octo.server.js");
  const rows = new Map();
  const prisma = { integrationSecret: {
    upsert: async ({ where, create, update }) => { const row = rows.has(where.provider) ? { ...rows.get(where.provider), ...update } : { id: where.provider, ...create }; rows.set(where.provider, row); return row; },
    findUnique: async ({ where }) => rows.get(where.provider) || null,
    update: async ({ where, data }) => { const row = { ...rows.get(where.provider), ...data }; rows.set(where.provider, row); return row; },
  } };
  const klook = await generateOctoKey(prisma, "KLOOK");
  const tiqets = await generateOctoKey(prisma, "TIQETS");
  const req = (token) => new Request("https://x/octo/products", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  assert.equal((await requireOctoAuth(prisma, req(klook), "t")).platform, "KLOOK");
  assert.equal((await requireOctoAuth(prisma, req(tiqets), "t")).platform, "TIQETS");
  assert.equal((await requireOctoAuth(prisma, req("nope"), "t")).error.status, 401);
  assert.equal((await requireOctoAuth(prisma, req(""), "t")).error.status, 401);
  await setOctoLive(prisma, "KLOOK", true);
  assert.deepEqual(await octoLivePlatforms(prisma), ["KLOOK"]);
});

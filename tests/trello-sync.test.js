import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTrelloSync, planFromBoard, runTrelloSync } from "../app/services/trello-sync.server.js";
import { parseTrelloBoard } from "../app/utils/trello-import.js";

const board = {
  name: "Tours",
  lists: [{ id: "L1", name: "13/11 (Friday)", pos: 1 }, { id: "L0", name: "Doc Suportc", pos: 0 }],
  cards: [
    { id: "C1", name: "Belem Tour", idList: "L1", idMembers: [], pos: 1 },
    { id: "C2", name: "Passeio sem ligação", idList: "L1", idMembers: [], pos: 2 },
    { id: "S1", name: "Voucher", idList: "L0", idMembers: [], pos: 1 },
  ],
  checklists: [{ id: "K1", idCard: "C1", name: "09h30 ENG Miguel", pos: 1, checkItems: [{ id: "i1", name: "Pronto", state: "complete", pos: 1 }] }],
  members: [], labels: [],
};

test("plan only carries cards linked to a Central tour", () => {
  const today = new Date("2026-11-12T12:00:00Z");
  const unlinked = planFromBoard(board, normalizeTrelloSync({}), { today });
  assert.equal(unlinked.cards.length, 0);
  assert.equal(unlinked.support.length, 1);
  const tourKey = parseTrelloBoard(board, { today }).cards[0].tourKey;
  const linked = planFromBoard(board, normalizeTrelloSync({ mapping: { [tourKey]: "belem" } }), { today });
  assert.deepEqual(linked.cards.map((c) => [c.name, c.tourId, c.dateKey]), [["Belem Tour", "belem", "2026-11-13"]]);
});

function fakeSettings(initial) {
  let value = initial;
  return {
    get value() { return value; },
    businessSetting: {
      findFirst: async () => ({ id: "s", trelloSync: value }),
      update: async ({ data }) => { value = data.trelloSync; },
    },
  };
}

test("hourly read: skips when off or recent, runs when due and records the result", async () => {
  const now = new Date("2026-11-12T15:00:00Z");
  const off = fakeSettings({ enabled: false, mapping: { a: "b" } });
  assert.equal((await runTrelloSync(off, { now })).skipped, "disabled");

  const recent = fakeSettings({ enabled: true, mapping: { a: "b" }, lastRunAt: "2026-11-12T14:30:00Z" });
  assert.equal((await runTrelloSync(recent, { now })).skipped, "recent");

  const due = fakeSettings({ enabled: true, mapping: { a: "b" }, lastRunAt: "2026-11-12T13:58:00Z" });
  const failed = await runTrelloSync(due, { now, getCreds: async () => null });
  assert.equal(failed.ok, false);
  assert.match(due.value.lastError, /Trello desconectado/);
  assert.equal(due.value.lastRunAt, now.toISOString());
});

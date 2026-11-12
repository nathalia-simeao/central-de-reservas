import test from "node:test";
import assert from "node:assert/strict";
import { actorFor, describeChecklistOp, departureTargetKey } from "../app/services/board-activity.server.js";

const raw = { lists: [{ id: "a", title: "14h ENG Simone", items: [{ id: "1", text: "Summer Chong (1A)", done: false }, { id: "2", text: "Fim do tour", done: true }] }, { id: "b", title: "14h PT Dee", items: [] }] };

test("checklist operations become readable activity", () => {
  assert.equal(describeChecklistOp(raw, { type: "toggleItem", listId: "a", itemId: "1" }), "marcou “Summer Chong (1A)” como concluído");
  assert.equal(describeChecklistOp(raw, { type: "toggleItem", listId: "a", itemId: "2" }), "desmarcou “Fim do tour”");
  assert.equal(describeChecklistOp(raw, { type: "editItem", listId: "a", itemId: "1", text: "Summer (2A)" }), "alterou “Summer Chong (1A)” para “Summer (2A)”");
  assert.equal(describeChecklistOp(raw, { type: "moveItem", listId: "a", itemId: "1", toListId: "b" }), "moveu “Summer Chong (1A)” para “14h PT Dee”");
  assert.equal(describeChecklistOp(raw, { type: "moveItem", listId: "a", itemId: "1", toIndex: 1 }), "mudou a ordem de “Summer Chong (1A)”");
  assert.equal(describeChecklistOp(raw, { type: "toggleAuto", key: "booking:9", label: "Ana (2A)" }), "marcou “Ana (2A)” como concluído");
  assert.equal(describeChecklistOp(raw, { type: "toggleHideDone", listId: "a" }), null);
});

test("actor name comes from the linked team person", async () => {
  const prisma = { guide: { findUnique: async () => ({ name: "Renan Stein" }) } };
  assert.deepEqual(await actorFor(prisma, { guideId: "g1", name: null }), { name: "Renan Stein", personId: "g1" });
  assert.deepEqual(await actorFor(prisma, { portal: true, name: "Laila Reis", guideId: "g2" }), { name: "Laila Reis", personId: "g2" });
  assert.equal((await actorFor(prisma, { name: null })).name, "Equipe");
  assert.equal(departureTargetKey("belem", "2026-11-12T14:00:00Z"), "belem|2026-11-12T14:00:00.000Z");
});

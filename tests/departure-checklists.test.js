import test from "node:test";
import assert from "node:assert/strict";
import { applyChecklistOp, autoChecklists, checklistProgress, normalizeChecklists } from "../app/utils/departure-checklists.js";

const card = {
  tourId: "t1",
  timeKey: "10:00",
  guides: [{ name: "Dee Smith", languages: ["es"] }, { name: "Simone Silva", languages: ["en"] }],
  bookings: [
    { id: "b1", status: "CONFIRMED", language: "Spanish", customerName: "RAÚL NAHÁS", adults: 3, customerPhone: "+543512013604" },
    { id: "b2", status: "CONFIRMED", language: "English", customerName: "Ayesa Joanna", adults: 2 },
    { id: "b3", status: "PENDING", language: "English", customerName: "Nope", adults: 1 },
  ],
};

test("checklist automático por grupo de idioma, igual ao Trello", () => {
  const lists = autoChecklists(card);
  assert.equal(lists.length, 2);
  const esp = lists.find((l) => l.id === "auto:es");
  assert.equal(esp.title, "10h ESP (3p) 3A Dee");
  assert.deepEqual(esp.items.map((i) => i.text), ["Pronto(a) e no local de encontro", "RAÚL NAHÁS (3A) +543512013604", "Fim de tour"]);
  assert.equal(lists.find((l) => l.id === "auto:en").title, "10h ENG (2p) 2A Simone");
});

test("operações e progresso", () => {
  let s = applyChecklistOp(null, { type: "toggleAuto", key: "auto:es:ready" }, "Renan");
  s = applyChecklistOp(s, { type: "addList", title: "Ingressos", items: ["Comprar Pena", "Comprar Regaleira"] });
  const list = s.lists[0];
  s = applyChecklistOp(s, { type: "toggleItem", listId: list.id, itemId: list.items[0].id }, "Renan");
  s = applyChecklistOp(s, { type: "addItem", listId: list.id, text: "Confirmar van" });
  assert.equal(s.lists[0].items.length, 3);
  assert.equal(s.auto["auto:es:ready"].by, "Renan");
  assert.deepEqual(checklistProgress(card, s), { done: 2, total: 9 });
  s = applyChecklistOp(s, { type: "toggleAuto", key: "auto:es:ready" });
  assert.equal(s.auto["auto:es:ready"], undefined);
  s = applyChecklistOp(s, { type: "deleteList", listId: list.id });
  assert.equal(normalizeChecklists(s).lists.length, 0);
});

test("operação inválida", () => {
  assert.throws(() => applyChecklistOp(null, { type: "x" }));
});

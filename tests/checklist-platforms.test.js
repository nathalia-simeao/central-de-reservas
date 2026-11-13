import test from "node:test";
import assert from "node:assert/strict";
import { bookingPlatformKey, platformKey, splitPlatform } from "../app/utils/checklist-platforms.js";
import { applyChecklistOp, autoChecklists, normalizeChecklists } from "../app/utils/departure-checklists.js";

test("Trello siglas at the end become the platform", () => {
  assert.deepEqual(splitPlatform("Susan Lasseter Dubrof (3A) +14042471200 HD"), { text: "Susan Lasseter Dubrof (3A) +14042471200", platform: "HD" });
  assert.equal(splitPlatform("Bruce Black (2A) +1 206 399 3093 VTR").platform, "VT");
  assert.equal(splitPlatform("Soon-Duk (2A) +316 1725 2268 Airbnb").platform, "AB");
  assert.equal(splitPlatform("Christina Standerfer (2S) +15017726173 Tiqets").platform, "TG");
  assert.equal(splitPlatform("Caroline Nathanson (1A) +447747467587 GYG").platform, "GYG");
  assert.equal(splitPlatform("Fulano - KO").text, "Fulano");
  assert.equal(splitPlatform("Fim do tour").platform, null);
  assert.equal(splitPlatform("No local de encontro").platform, null);
  assert.equal(splitPlatform("Pagar ct").platform, null);
});

test("checklists keep the platform and clean the text", () => {
  const state = normalizeChecklists({ lists: [{ id: "l", title: "x", items: [{ id: "a", text: "Ana (2A) +351 GYG" }, { id: "b", text: "Rui", platform: "ct" }] }] });
  assert.deepEqual(state.lists[0].items.map((i) => [i.text, i.platform]), [["Ana (2A) +351", "GYG"], ["Rui", "CT"]]);
  let next = applyChecklistOp(state, { type: "addItem", listId: "l", text: "Bea", platform: "VT" });
  assert.equal(next.lists[0].items[2].platform, "VT");
  next = applyChecklistOp(next, { type: "editItem", listId: "l", itemId: "a", platform: "" });
  assert.equal(next.lists[0].items[0].platform, undefined);
  next = applyChecklistOp(next, { type: "editItem", listId: "l", itemId: "a", platform: "KO" });
  assert.equal(next.lists[0].items[0].platform, "KO");
  assert.equal(platformKey("Klook"), "KO");
  assert.equal(splitPlatform("Maria (2A) CIV").platform, "CT");
});

test("automatic checklists show where each booking came from", () => {
  assert.equal(bookingPlatformKey("GETYOURGUIDE"), "GYG");
  assert.equal(bookingPlatformKey("SHOPIFY"), "SITE");
  const [list] = autoChecklists({ timeKey: "10:00", guides: [], bookings: [{ id: "b1", status: "CONFIRMED", customerName: "Ana", adults: 2, platform: "VIATOR", language: "en" }] });
  assert.equal(list.items[1].platform, "VT");
});

import { clientItemPax, isClientItem, manualClientCounts } from "../app/utils/departure-checklists.js";

test("no-show nos clientes do checklist do Trello", () => {
  assert.equal(clientItemPax("Jose Luis (3A) CIV ES"), 3);
  assert.equal(clientItemPax("Ana (2A 1C)"), 3);
  assert.equal(isClientItem("No local de encontro"), false);
  let raw = { lists: [{ id: "l1", title: "14h PT e ES (6p) 6A Dee", items: [{ id: "a", text: "Jose (3A) CIV ES" }, { id: "b", text: "Marcelo (1A) CIV ES" }, { id: "c", text: "Fim de tour" }] }] };
  raw = applyChecklistOp(raw, { type: "setNoShow", listId: "l1", itemId: "a", value: true }, "Maria");
  assert.equal(raw.lists[0].items[0].noShow, true);
  assert.deepEqual(manualClientCounts(raw, { onlyGuide: true }), { pax: 4, noShow: 3 });
  assert.deepEqual(manualClientCounts(raw, { guideName: "Dee Silva" }), { pax: 4, noShow: 3 });
  raw = applyChecklistOp(raw, { type: "setNoShow", listId: "l1", itemId: "a", value: false }, "Maria");
  assert.equal(raw.lists[0].items[0].noShow, undefined);
});

import { cardLanguages } from "../app/utils/departure-checklists.js";

test("idiomas do cartão: reservas, guias e títulos do Trello", () => {
  const raw = { lists: [{ title: "14:01h PT e ES (6p) 6A Dee", items: [] }, { title: "Lista de ingressos", items: [] }, { title: "10h ENG (3p)", items: [] }] };
  assert.deepEqual(cardLanguages({ bookings: [{ language: "Français" }], guides: [{ languages: ["it"] }] }, raw), ["pt", "en", "es", "fr", "it"]);
  assert.deepEqual(cardLanguages({}, { lists: [{ title: "Fim de tour", items: [] }] }), []);
});

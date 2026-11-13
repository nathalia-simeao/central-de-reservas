import { test } from "node:test";
import assert from "node:assert/strict";
import { optionValueIn, tourTitleIn } from "../app/utils/tour-i18n.js";

const tr = {
  en: { title: "Walking Tour Old Lisbon", options: [{ name: "Tickets", values: ["Child (Under 14 years old)", "Adult"] }, { name: "Time:", values: ["10:00"] }] },
  fr: { title: "Visite à pied du vieux Lisbonne", options: [{ name: "Billets", values: ["Enfant (Moins de 14 ans)", "Adulte"] }, { name: "Horaire :", values: ["10h00"] }] },
};

test("traduções do site no idioma do app", () => {
  assert.equal(tourTitleIn(tr, "fr", "x"), "Visite à pied du vieux Lisbonne");
  assert.equal(tourTitleIn(tr, "de", "Walking Tour Old Lisbon"), "Walking Tour Old Lisbon");
  assert.equal(optionValueIn(tr, "fr", "Tickets", "Adult"), "Adulte");
  assert.equal(optionValueIn(tr, "fr", "Time:", "10:00"), "10h00");
  assert.equal(optionValueIn(tr, "fr", "Outra", "X"), "X");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { displayLanguageName, translateTicketTitle } from "../app/utils/ticket-labels.js";

test("ingressos no idioma do app", () => {
  assert.equal(translateTicketTitle("Child (Under 12 years old)", "fr"), "Enfant (Moins de 12 ans)");
  assert.equal(translateTicketTitle("Senior (Over 64 years old)", "pt"), "Sênior (Acima de 64 anos)");
  assert.equal(translateTicketTitle("Youth (Ages 14 to 23)", "de"), "Jugendlicher (14 bis 23 Jahre)");
  assert.equal(translateTicketTitle("Pena Palace · Adult (Ages 21 to 63)", "es"), "Pena Palace · Adulto (De 21 a 63 años)");
  assert.equal(translateTicketTitle("Fado Dinner and Show", "fr"), "Fado Dinner and Show");
  assert.equal(translateTicketTitle("Adult", "en"), "Adult");
});

test("nome do idioma no idioma do app", () => {
  assert.equal(displayLanguageName("Portuguese", "fr-FR"), "Portugais");
  assert.equal(displayLanguageName("English", "pt-PT"), "Inglês");
});

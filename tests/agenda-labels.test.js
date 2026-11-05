import test from "node:test";
import assert from "node:assert/strict";
import {
  automaticTourColor,
  contrastText,
  normalizeAgendaLabels,
  tourColor,
  tourTags,
} from "../app/utils/agenda-labels.js";

test("tours without a chosen colour get a stable automatic colour", () => {
  assert.equal(tourColor(null, "tour-a"), automaticTourColor("tour-a"));
  assert.equal(tourColor({}, "tour-a"), tourColor(undefined, "tour-a"));
});

test("chosen colours and tags are kept; garbage is dropped", () => {
  const labels = normalizeAgendaLabels({
    tags: [
      { id: "priv", name: "Privado", color: "#7C3AED" },
      { id: "bad", name: "", color: "#000000" },
      { id: "x", name: "Sem cor", color: "red" },
    ],
    tours: {
      jer: { color: "#16A34A", tagIds: ["priv", "missing"] },
      empty: { color: "nope", tagIds: [] },
    },
  });
  // Etiqueta só com cor (sem nome) é válida, como no Trello; cor inválida é descartada.
  assert.deepEqual(labels.tags, [
    { id: "priv", name: "Privado", color: "#7c3aed" },
    { id: "bad", name: "", color: "#000000" },
  ]);
  assert.deepEqual(labels.tours, { jer: { color: "#16a34a", tagIds: ["priv"] } });
  assert.equal(tourColor(labels, "jer"), "#16a34a");
  assert.deepEqual(tourTags(labels, "jer").map((t) => t.name), ["Privado"]);
});

test("text on tour colours stays readable", () => {
  assert.equal(contrastText("#ffffff"), "#111827");
  assert.equal(contrastText("#2563eb"), "#ffffff");
});

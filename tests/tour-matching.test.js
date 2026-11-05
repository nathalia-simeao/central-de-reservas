import test from "node:test";
import assert from "node:assert/strict";
import { matchShopifyProduct, titleSimilarity } from "../app/utils/tour-matching.js";

const shopify = [
  { masterTourId: "t1", name: "Jerónimos Monastery Guided Tour with Entrance Ticket Included", active: true },
  { masterTourId: "t2", name: "Sintra: Quinta da Regaleira Guided Tour with Tickets", active: true },
  { masterTourId: "t3", name: "Fátima, Nazaré & Óbidos Day Trip", active: false },
  { masterTourId: "t4", name: "Sintra: Pena Palace Guided Tour with Tickets", active: true },
];

test("mesmo id do passeio mestre", () => {
  assert.equal(matchShopifyProduct({ key: "t2", name: "qualquer" }, shopify).matchedBy, "id");
});

test("nome diferente, mesmo passeio", () => {
  const m = matchShopifyProduct({ key: "x", name: "Lisbon: Jeronimos Monastery Skip-the-Line Tour" }, shopify);
  assert.equal(m.colorKey, "t1");
  assert.equal(m.matchedBy, "name");
});

test("não confunde Regaleira com Pena", () => {
  assert.equal(matchShopifyProduct({ key: "x", name: "Quinta da Regaleira Tour" }, shopify).colorKey, "t2");
  assert.equal(matchShopifyProduct({ key: "y", name: "Pena Palace Tour" }, shopify).colorKey, "t4");
});

test("sem equivalente fica com a própria chave", () => {
  const m = matchShopifyProduct({ key: "z", name: "Braga & Guimarães: The Historic Minho Day Tour" }, shopify);
  assert.equal(m.colorKey, "z");
  assert.equal(m.product, null);
});

test("similaridade ignora acentos", () => {
  assert.equal(titleSimilarity("Óbidos Nazaré", "Obidos Nazare"), 1);
});

import { buildTourColorAliases } from "../app/utils/tour-matching.js";
import { tourColor, INACTIVE_TOUR_COLOR } from "../app/utils/agenda-labels.js";

test("qualquer canal herda a cor do produto da Shopify", () => {
  const tours = [
    { id: "t1", title: "Jerónimos Monastery Guided Tour with Entrance Ticket Included" },
    { id: "g9", title: "Jeronimos Monastery Skip-the-Line (GYG)" },
    { id: "t3", title: "Fátima, Nazaré & Óbidos Day Trip" },
    { id: "v5", title: "Fatima Nazare Obidos full day (Viator)" },
  ];
  const aliases = buildTourColorAliases(tours, shopify);
  const labels = { tags: [], tours: { t1: { color: "#2d7fd2", tagIds: [] } }, ...aliases };
  assert.equal(tourColor(labels, "g9"), "#2d7fd2");
  assert.equal(tourColor(labels, "v5"), INACTIVE_TOUR_COLOR);
  assert.equal(tourColor(labels, "t3"), INACTIVE_TOUR_COLOR);
});

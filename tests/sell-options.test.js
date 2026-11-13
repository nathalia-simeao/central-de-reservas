import { test } from "node:test";
import assert from "node:assert/strict";
import { ticketsFor, tourSellOptions } from "../app/utils/sell-options.js";

const belem = {
  options: [
    { name: "Tickets", values: ["Child", "Adult"] },
    { name: "Time:", values: ["14:00 - Guided Tour", "14:00 - Guided Tour + Sunset Boat Trip", "9:30 - Guided Tour with Skip-the-Line in English", "10:00 - Guided Tour"] },
  ],
  variantOptions: {},
  metafields: { languages_info: "English, Portuguese, Spanish" },
};
const v = (id, title, price) => ({ id: `gid://shopify/ProductVariant/${id}`, title, price });

test("horários vêm da opção Time: da Shopify, ingressos por horário", () => {
  const variants = [v(1, "Child / 14:00 - Guided Tour", "19"), v(2, "Adult / 14:00 - Guided Tour", "34"), v(3, "Adult / 14:00 - Guided Tour + Sunset Boat Trip", "95"), v(4, "Adult / 9:30 - Guided Tour with Skip-the-Line in English", "49")];
  const o = tourSellOptions({ snapshot: belem, variants });
  assert.deepEqual(o.sessions.map((s) => [s.time, s.label]), [["09:30", "9:30 - Guided Tour with Skip-the-Line in English"], ["14:00", "14:00 - Guided Tour"], ["14:00", "14:00 - Guided Tour + Sunset Boat Trip"]]);
  assert.deepEqual(ticketsFor(o.tickets, { session: "14:00 - Guided Tour" }).map((t) => [t.title, t.time]), [["Child", "14:00"], ["Adult", "14:00"]]);
  assert.deepEqual(o.languages, ["English", "Portuguese", "Spanish"]);
});

test("produto sem horário usa os horários da Agenda; sem nada, horário livre", () => {
  const fado = { options: [{ name: "Experience Type", values: ["Fado Dinner and Show"] }], metafields: { languages_info: "Portuguese, English" } };
  const variants = [v(9, "Fado Dinner and Show", "69")];
  assert.deepEqual(tourSellOptions({ snapshot: fado, variants, scheduleSlots: ["20:00"] }).sessions.map((s) => s.time), ["20:00"]);
  const free = tourSellOptions({ snapshot: fado, variants });
  assert.equal(free.freeTime, true);
  assert.equal(ticketsFor(free.tickets, { session: "20:30" }).length, 1);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  guideNameFromTitle, matchGuide, memberForGroup, parseGroupTitle, parseListDate, parseTrelloBoard, resolveListDates, suggestTour,
} from "../app/utils/trello-import.js";

const TODAY = new Date("2026-11-12T10:00:00Z");
const NAMES = ["Doc Suportc", "11/11 (Wednesday)", "12/11 (Thursday)", "28/11 (Saturday)", "30/12 (Wedneadasy)", "31/12 ",
  "01/07/2027", "02/01", "03/01/27 (Sunday)", "11/02/27(Thursday)", "12/12", "14/12 (Friday)", "16/02", "30/10/2027"];
const lists = NAMES.map((name, i) => ({ id: `l${i}`, name, pos: i }));

test("list names become dates, with the year inferred from order and weekday", () => {
  const d = resolveListDates(lists, TODAY);
  const at = (name) => d.get(lists.find((l) => l.name === name).id);
  assert.equal(at("Doc Suportc"), undefined);
  assert.equal(at("11/11 (Wednesday)").dateKey, "2026-11-11");
  assert.equal(at("12/11 (Thursday)").dateKey, "2026-11-12");
  assert.equal(at("30/12 (Wedneadasy)").dateKey, "2026-12-30");
  assert.equal(at("02/01").dateKey, "2027-01-02");
  assert.equal(at("03/01/27 (Sunday)").dateKey, "2027-01-03");
  assert.equal(at("16/02").dateKey, "2027-02-16");
  assert.equal(at("30/10/2027").dateKey, "2027-10-30");
  assert.equal(at("30/10/2027").warning, null);
});

test("dates out of the board order are flagged for review", () => {
  const d = resolveListDates(lists, TODAY);
  const at = (name) => d.get(lists.find((l) => l.name === name).id);
  assert.match(at("01/07/2027").warning, /ordem/);
  assert.ok(at("12/12").warning || at("14/12 (Friday)").warning, "12/12 between Feb lists must be flagged");
});

test("parseListDate ignores non-date lists", () => {
  assert.equal(parseListDate("Doc Suportc"), null);
  assert.deepEqual(parseListDate("12/11 (Thursday)"), { day: 12, month: 11, year: null, weekday: 4 });
});

test("group titles give time and language", () => {
  assert.deepEqual(parseGroupTitle("09h30 ENG (12p) 11A 1C Luis | T1"), { time: "09:30", languages: ["en"], pax: 12 });
  assert.deepEqual(parseGroupTitle("14h PT e ESP (5p) 4A 1Y Dee | T2"), { time: "14:00", languages: ["pt", "es"], pax: 5 });
  assert.deepEqual(parseGroupTitle("14h45 ENG Stefano(4)"), { time: "14:45", languages: ["en"], pax: null });
  assert.equal(parseGroupTitle("15h IT Beatrice").languages[0], "it");
  assert.equal(parseGroupTitle("Horário a combinar").time, null);
});

test("tour suggestion matches Trello card names to Central titles", () => {
  const tours = [
    { id: "belem", title: "Belém Walking Tour with Skip-the-Line Jerónimos Monastery" },
    { id: "torre", title: "Torre de Belém: Guided Visit" },
    { id: "sintra", title: "Sintra: Pena Palace and Regaleira Day Trip" },
    { id: "porto", title: "Porto Signature Experience: Walking Tour with Wine Cellar Visit" },
  ];
  // "Belem Tour" bate igual com dois passeios: a prévia pede para escolher.
  assert.equal(suggestTour("Belem Tour (Mosteiro encerrado)", tours), null);
  assert.equal(suggestTour("Jerónimos", tours), "belem");
  assert.equal(suggestTour("Torre de Belém", tours), "torre");
  assert.equal(suggestTour("Regaleira", tours), "sintra");
  assert.equal(suggestTour("Lisboa ao Porto", tours), null);
});

test("guides match by full, first+last or unique first name", () => {
  const guides = [{ id: "1", name: "Luís Cardoso de Meneses" }, { id: "2", name: "Lucie Marinho" }, { id: "3", name: "Maria Almeida" }, { id: "4", name: "Maria Silva" }];
  assert.equal(matchGuide("Luis Cardoso de Meneses", guides).id, "1");
  assert.equal(matchGuide("Lucie", guides).id, "2");
  assert.equal(matchGuide("Maria", guides), null);
  assert.equal(matchGuide("Maria Almeida", guides).id, "3");
  assert.equal(memberForGroup("09h30 ENG (12p) 11A 1C Luis | T1", ["Maria Almeida", "Luis Cardoso de Meneses"]), "Luis Cardoso de Meneses");
});

test("parseTrelloBoard splits support cards from dated tour cards", () => {
  const board = {
    name: "Tours (Portugal, Me & You)",
    lists: [{ id: "a", name: "Doc Suportc", pos: 1 }, { id: "b", name: "12/11 (Thursday)", pos: 2 }, { id: "x", name: "Velha", pos: 3, closed: true }],
    members: [{ id: "m1", fullName: "Luis Cardoso de Meneses" }],
    labels: [{ id: "lb", color: "orange", name: "" }],
    cards: [
      { id: "c1", name: "Voucher Pastéis", idList: "a", pos: 1, desc: "", attachments: [{ name: "voucher.pdf", url: "https://trello.com/x.pdf" }] },
      { id: "c2", name: "Belem Tour", idList: "b", pos: 1, desc: "Encontro no metro", idMembers: ["m1"], idLabels: ["lb"] },
      { id: "c3", name: "Arquivado", idList: "b", pos: 2, closed: true },
      { id: "c4", name: "Lista fechada", idList: "x", pos: 1 },
    ],
    checklists: [
      { id: "k1", idCard: "c2", name: "09h30 ENG (12p) Luis | T1", pos: 1, checkItems: [
        { id: "i2", name: "Fim de tour", state: "incomplete", pos: 2 },
        { id: "i1", name: "JOHN SMITH (2A)", state: "complete", pos: 1 },
      ] },
    ],
  };
  const plan = parseTrelloBoard(board, { today: TODAY });
  assert.equal(plan.support.length, 1);
  assert.equal(plan.support[0].attachments[0].name, "voucher.pdf");
  assert.equal(plan.cards.length, 1);
  const card = plan.cards[0];
  assert.equal(card.dateKey, "2026-11-12");
  assert.deepEqual(card.members, ["Luis Cardoso de Meneses"]);
  assert.equal(card.groups[0].time, "09:30");
  assert.deepEqual(card.groups[0].items, [{ text: "JOHN SMITH (2A)", done: true }, { text: "Fim de tour", done: false }]);
  assert.throws(() => parseTrelloBoard({ foo: 1 }), /Trello/);
});

test("checklist items can be reordered and moved to another checklist", async () => {
  const { applyChecklistOp } = await import("../app/utils/departure-checklists.js");
  const base = { lists: [
    { id: "a", title: "T2", items: [{ id: "1", text: "Encontro" }, { id: "2", text: "Clarissa" }, { id: "3", text: "Amparo" }, { id: "4", text: "Fim" }] },
    { id: "b", title: "T3", items: [{ id: "5", text: "Summer" }] },
  ] };
  const swapped = applyChecklistOp(base, { type: "moveItem", listId: "a", itemId: "3", toIndex: 1 });
  assert.deepEqual(swapped.lists[0].items.map((i) => i.id), ["1", "3", "2", "4"]);
  const moved = applyChecklistOp(swapped, { type: "moveItem", listId: "a", itemId: "2", toListId: "b", toIndex: 0 });
  assert.deepEqual(moved.lists[0].items.map((i) => i.id), ["1", "3", "4"]);
  assert.deepEqual(moved.lists[1].items.map((i) => i.id), ["2", "5"]);
  const end = applyChecklistOp(moved, { type: "moveItem", listId: "b", itemId: "2", toIndex: 99 });
  assert.deepEqual(end.lists[1].items.map((i) => i.id), ["5", "2"]);
});

test("guide name comes from the checklist title when the card has no members", () => {
  assert.equal(guideNameFromTitle("09h30 ENG (15p) 12A 2S 1C Luis | T1"), "Luis");
  assert.equal(guideNameFromTitle("14h PT e ESP (5p) 4A 1Y Dee | T2"), "Dee");
  assert.equal(guideNameFromTitle("14h IT  Luis"), "Luis");
  assert.equal(guideNameFromTitle("15h IT Beatrice"), "Beatrice");
  assert.equal(guideNameFromTitle("09h30 ENG"), null);
  assert.equal(guideNameFromTitle("02h00 pm ENG (1p)"), null);
  assert.equal(guideNameFromTitle("Horário a combinar"), null);
  assert.equal(guideNameFromTitle("Checklist"), null);
  assert.equal(guideNameFromTitle("18h Evening ENG"), null);
  const guides = [{ id: "m", name: "Miguel Alves" }, { id: "s", name: "Simone Silva" }];
  assert.equal(matchGuide(guideNameFromTitle("14h ENG Miguel"), guides)?.id, "m");
  assert.equal(matchGuide(guideNameFromTitle("14h FR Solal"), guides), null);
});

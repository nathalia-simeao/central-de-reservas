import test from "node:test";
import assert from "node:assert/strict";
import { buildBoardColumns, cardLabelIds, addDays, initials } from "../app/utils/agenda-board.js";

test("monta colunas por data e cartões por saída", () => {
  const cols = buildBoardColumns({
    startDateKey: "2026-11-10",
    days: 3,
    tours: [{ id: "t1", title: "Belém Tour" }, { id: "t2", title: "Torre de Belém" }],
    bookings: [
      { tourId: "t1", startTime: "2026-11-10T10:00:00Z", status: "CONFIRMED", adults: 2, attendanceStatus: "COMPLETED" },
      { tourId: "t1", startTime: "2026-11-10T10:00:00Z", status: "CONFIRMED", totalParticipants: 3 },
      { tourId: "t1", startTime: "2026-11-10T10:00:00Z", status: "CANCELED", adults: 5 },
      { tourId: "t2", startTime: "2026-11-11T11:00:00Z", status: "PENDING", adults: 1 },
      { tourId: "t2", startTime: "2026-11-20T11:00:00Z", status: "CONFIRMED", adults: 1 },
    ],
    assignments: [{ id: "a1", tourId: "t1", startTime: "2026-11-10T10:00:00Z", status: "ASSIGNED", guide: { id: "g1", name: "Maria Alves" }, languages: ["en"] }],
    departureTags: { "t2|2026-11-12T09:00:00.000Z": ["x"] },
    departureInfo: { "t1|2026-11-10T10:00:00.000Z": { attachments: [{}, {}], guideNotes: [{}], checkStartAt: "2026-11-10T10:01:00Z" } },
  });
  assert.deepEqual(cols.map((c) => c.dateKey), ["2026-11-10", "2026-11-11", "2026-11-12"]);
  const card = cols[0].cards[0];
  assert.equal(card.title, "Belém Tour");
  assert.equal(card.timeKey, "10:00");
  assert.equal(card.pax, 5);
  assert.equal(card.present, 2);
  assert.equal(card.guides[0].name, "Maria Alves");
  assert.equal(card.attachments, 2);
  assert.equal(card.notes, 1);
  assert.equal(card.checks, 1);
  assert.equal(cols[1].cards[0].pending, 1);
  assert.equal(cols[2].cards[0].tagIds[0], "x");
});

test("etiquetas fixas do passeio + da saída", () => {
  const labels = { tours: { t1: { tagIds: ["pena", "regaleira"] } }, colorAliases: {} };
  assert.deepEqual(cardLabelIds(labels, { tourId: "t1", tagIds: ["transfer", "pena"] }), ["pena", "regaleira", "transfer"]);
});

test("utilitários", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(initials("Maria Alves"), "MA");
  assert.equal(initials("Sofia"), "SO");
});

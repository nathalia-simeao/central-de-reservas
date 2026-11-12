import test from "node:test";
import assert from "node:assert/strict";
import { saveTrelloFile, stripLink } from "../app/services/trello-files.server.js";
import { checkImportToken, createImportToken } from "../app/utils/import-tokens.server.js";

test("stripLink removes the attachment line and an empty header", () => {
  const text = "10 am or 2 pm\n\nAnexos no Trello:\n• T3.pdf: https://trello.com/a/T3.pdf";
  assert.equal(stripLink(text, "https://trello.com/a/T3.pdf"), "10 am or 2 pm");
  const two = "Anexos no Trello:\n• a: https://x/a\n• b: https://x/b";
  assert.equal(stripLink(two, "https://x/a"), "Anexos no Trello:\n• b: https://x/b");
});

test("import tokens expire after 30 minutes", () => {
  const { token } = createImportToken("Nathalia", 1000);
  assert.ok(checkImportToken(token, 1000 + 60_000));
  assert.equal(checkImportToken(token, 1000 + 31 * 60_000), null);
  assert.equal(checkImportToken("nope"), null);
});

test("tour card file goes to every departure with that Trello note, once", async () => {
  const deps = [
    { id: "d1", guideNotes: [{ text: "Obs\n\nAnexos no Trello:\n• T1.pdf: U1", source: "trello", trelloId: "c1" }] },
    { id: "d2", guideNotes: [{ text: "x", by: "Renan" }] },
  ];
  const files = [];
  const prisma = {
    supportCard: { findUnique: async () => null },
    tourDeparture: { findMany: async () => deps, update: async ({ where, data }) => { deps.find((d) => d.id === where.id).guideNotes = data.guideNotes; } },
    departureAttachment: {
      findFirst: async ({ where }) => files.find((f) => f.departureId === where.departureId && f.fileName === where.fileName) || null,
      count: async () => files.length,
      create: async ({ data }) => files.push(data),
    },
  };
  const args = { prisma, trelloCardId: "c1", url: "U1", fileName: "T1.pdf", mimeType: "application/pdf", bytes: Buffer.from("pdf") };
  assert.deepEqual(await saveTrelloFile(args), { target: "departure", saved: 1, departures: 1 });
  assert.equal((await saveTrelloFile(args)).saved, 0);
  assert.equal(files.length, 1);
  assert.equal(deps[0].guideNotes[0].text, "Obs");
});

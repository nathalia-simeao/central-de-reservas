import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIcs, calendarLinks } from "../app/utils/guide-calendar.js";

test("gera o .ics com as saídas do guia", () => {
  const ics = buildIcs({ name: "PMY · Miguel", now: new Date("2026-11-13T10:00:00Z"), events: [
    { uid: "a1", start: "2026-11-14T09:30:00.000Z", minutes: 150, title: "PMY · Belém, Jerónimos; 5 pax", description: "Grupo: Inglês\nAbrir: x", url: "https://central.portugalmeandyou.com/guia/saida/a1" },
  ] });
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART:20261114T093000Z/);
  assert.match(ics, /DTEND:20261114T120000Z/);
  assert.match(ics, /SUMMARY:PMY · Belém\\, Jerónimos\\; 5 pax/);
  assert.match(ics, /DESCRIPTION:Grupo: Inglês\\nAbrir: x/);
  assert.ok(ics.split("\r\n").every((l) => Buffer.byteLength(l) <= 75));
});

test("links de assinatura", () => {
  const l = calendarLinks("https://central.portugalmeandyou.com/guia-agenda/abc");
  assert.equal(l.webcal, "webcal://central.portugalmeandyou.com/guia-agenda/abc");
  assert.ok(l.google.startsWith("https://calendar.google.com/calendar/r?cid=webcal%3A%2F%2F"));
});

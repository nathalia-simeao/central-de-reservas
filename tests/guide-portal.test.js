import test from "node:test";
import assert from "node:assert/strict";
import {
  appendNote,
  clearFailedLogins,
  generatePassword,
  guidePermissions,
  hashPassword,
  loginBlocked,
  passwordProblem,
  recordFailedLogin,
  safeFileName,
  sessionCookie,
  verifyPassword,
  whatsappLink,
} from "../app/utils/guide-portal.server.js";

test("passwords are hashed and verified; wrong ones fail", () => {
  const stored = hashPassword("Belem2026!");
  assert.ok(stored.startsWith("scrypt$"));
  assert.equal(stored.includes("Belem2026!"), false);
  assert.equal(verifyPassword("Belem2026!", stored), true);
  assert.equal(verifyPassword("belem2026!", stored), false);
  assert.equal(verifyPassword("x", "garbage"), false);
  assert.equal(passwordProblem("short"), "A senha precisa ter pelo menos 8 caracteres.");
  assert.equal(passwordProblem(generatePassword()), null);
});

test("login is blocked after repeated failures and unblocked on success", () => {
  const key = "guide@example.com|1.2.3.4";
  for (let i = 0; i < 8; i += 1) recordFailedLogin(key);
  assert.equal(loginBlocked(key), true);
  clearFailedLogins(key);
  assert.equal(loginBlocked(key), false);
});

test("session cookie is HttpOnly, Secure and scoped to the guide portal", () => {
  const cookie = sessionCookie("tok");
  assert.ok(cookie.includes("HttpOnly"));
  assert.ok(cookie.includes("Secure"));
  assert.ok(cookie.includes("Path=/guia"));
  assert.ok(sessionCookie(null).includes("Max-Age=0"));
});

test("guide check-ins follow start → mid → end and never go back", () => {
  const start = new Date("2026-11-04T09:30:00Z");
  const before = new Date("2026-11-04T09:00:00Z");
  assert.deepEqual(
    { s: guidePermissions({}, start, before).canCheckStart, m: guidePermissions({}, start, before).canCheckMid },
    { s: true, m: false },
  );
  const started = { checkStartAt: before };
  assert.equal(guidePermissions(started, start, before).canCheckStart, false);
  assert.equal(guidePermissions(started, start, before).canCheckMid, true);
  const ended = { checkStartAt: before, checkEndAt: before };
  const p = guidePermissions(ended, start, before);
  assert.equal(p.canCheckEnd, false);
  assert.equal(p.canMarkAttendance, false);
});

test("attendance is not open days before the tour", () => {
  const start = new Date("2026-11-10T09:30:00Z");
  assert.equal(guidePermissions({}, start, new Date("2026-11-04T09:30:00Z")).canMarkAttendance, false);
});

test("notes only append", () => {
  const one = appendNote([], { by: "Dee", text: "Todos presentes" });
  const two = appendNote(one, { by: "Dee", text: "  " });
  const three = appendNote(two, { by: "Dee", text: "Cliente da 2A chegou 10 min atrasado" });
  assert.equal(two.length, 1);
  assert.equal(three.length, 2);
  assert.equal(three[0].text, "Todos presentes");
});

test("contact links and file names are safe", () => {
  assert.equal(whatsappLink("+44 7853 224343"), "https://wa.me/447853224343");
  assert.equal(whatsappLink("123"), null);
  assert.equal(safeFileName("../../etc/passwd"), "passwd");
  assert.equal(safeFileName("Ingressos Jerónimos.pdf"), "Ingressos Jerónimos.pdf");
});

import { bookingsForGuideLanguages } from "../app/utils/guide-portal.server.js";

test("a language-group guide sees only their languages plus bookings without language", () => {
  const bookings = [
    { id: "a", language: "English" },
    { id: "b", language: "Português" },
    { id: "c", language: "Español" },
    { id: "d", language: "" },
  ];
  assert.deepEqual(bookingsForGuideLanguages(bookings, ["pt", "es"]).map((b) => b.id), ["b", "c", "d"]);
  assert.deepEqual(bookingsForGuideLanguages(bookings, []).map((b) => b.id), ["a", "b", "c", "d"]);
});

test("a booking placed in a guide's group by the management goes only to that guide", () => {
  const bookings = [
    { id: "a", language: "English", groupGuideId: "luis" },
    { id: "b", language: "English" },
  ];
  assert.deepEqual(bookingsForGuideLanguages(bookings, ["en"], "dee").map((b) => b.id), ["b"]);
  assert.deepEqual(bookingsForGuideLanguages(bookings, ["pt", "es"], "luis").map((b) => b.id), ["a"]);
});

import { cleanParticipants } from "../app/utils/guide-portal.server.js";

test("participants are capped at the booking's pax and trimmed", () => {
  const rows = [{ name: " Ana ", country: "Brasil" }, { name: "", country: "" }, { name: "John", country: "UK" }, { name: "Extra", country: "X" }];
  assert.deepEqual(cleanParticipants(rows, 3), [{ name: "Ana", country: "Brasil" }, { name: "John", country: "UK" }]);
});

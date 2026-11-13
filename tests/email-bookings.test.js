import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyEmail, detectPlatform, htmlToText, labeledValues, parseBookingEmail,
  parseDate, parseLanguage, parsePax, parseTime, productAliasKey,
} from "../app/utils/email-bookings.js";

const ref = new Date("2026-11-13T10:00:00Z");

test("dates in many formats", () => {
  assert.equal(parseDate("Sat, 14 Nov 2026"), "2026-11-14");
  assert.equal(parseDate("14/11/2026"), "2026-11-14");
  assert.equal(parseDate("2026-11-14 09:30"), "2026-11-14");
  assert.equal(parseDate("November 14th, 2026"), "2026-11-14");
  assert.equal(parseDate("sábado, 14 de noviembre de 2026"), "2026-11-14");
  assert.equal(parseDate("14 de novembro de 2026"), "2026-11-14");
  assert.equal(parseDate("Sat, Nov 14", { reference: ref }), "2026-11-14");
  assert.equal(parseDate("Jan 3", { reference: ref }), "2027-01-03");
  assert.equal(parseDate("nothing here"), null);
});

test("times", () => {
  assert.equal(parseTime("09:30"), "09:30");
  assert.equal(parseTime("9:30 AM"), "09:30");
  assert.equal(parseTime("2:00 PM"), "14:00");
  assert.equal(parseTime("3 pm"), "15:00");
  assert.equal(parseTime("14h30"), "14:30");
  assert.equal(parseTime("às 10h"), "10:00");
  assert.equal(parseTime("12:00 PM"), "12:00");
});

test("people", () => {
  assert.deepEqual(parsePax("2 x Adult, 1 x Child"), { adults: 2, children: 1, youths: 0, seniors: 0, infants: 0, total: 3 });
  assert.equal(parsePax("Adults: 2 ; Niños: 1").total, 3);
  assert.equal(parsePax("3 guests").total, 3);
  assert.equal(parsePax("Personas: 4").total, 4);
  assert.equal(parsePax("Adult (18+) x 2 €50.00").adults, 2);
  assert.equal(parsePax("Total €45.00"), null);
});

test("languages", () => {
  assert.equal(parseLanguage("Spanish"), "es");
  assert.equal(parseLanguage("Inglés"), "en");
  assert.equal(parseLanguage("Tour in Portuguese"), "pt");
  assert.equal(parseLanguage("Guided tour (ES)"), "es");
  assert.equal(parseLanguage("tour de belem"), null);
});

test("platform from sender and forwarded mail", () => {
  assert.equal(detectPlatform({ from: "Airbnb <automated@airbnb.com>" }), "AIRBNB");
  assert.equal(detectPlatform({ from: "noreply@mail.klook.com" }), "KLOOK");
  assert.equal(detectPlatform({ from: "reservas@pmy.pt", text: "---------- Forwarded message ---------\nFrom: Civitatis <operadores@civitatis.com>\n" }), "CIVITATIS");
  assert.equal(detectPlatform({ from: "someone@gmail.com", text: "hi" }), null);
});

test("kind of email", () => {
  assert.equal(classifyEmail({ subject: "New booking: Belém tour" }), "NEW");
  assert.equal(classifyEmail({ subject: "Nueva reserva 123456" }), "NEW");
  assert.equal(classifyEmail({ subject: "Booking cancelled - BR-123456789" }), "CANCEL");
  assert.equal(classifyEmail({ subject: "Reserva cancelada" }), "CANCEL");
  assert.equal(classifyEmail({ subject: "Booking amended" }), "CHANGE");
  assert.equal(classifyEmail({ subject: "You have a new review" }), "OTHER");
  assert.equal(classifyEmail({ subject: "Message from Ana" }), "OTHER");
});

test("html tables become label/value lines", () => {
  const text = htmlToText("<table><tr><td>Booking reference</td><td>BR-987654321</td></tr><tr><td>Date</td><td>Sat, 14 Nov 2026</td></tr></table>");
  const values = labeledValues(text);
  assert.equal(values.ref[0], "BR-987654321");
  assert.equal(values.date[0], "Sat, 14 Nov 2026");
});

test("Viator style e-mail", () => {
  const parsed = parseBookingEmail({
    from: "Viator <no-reply@viator.com>",
    subject: "New Booking for Sat, Nov 14, 2026 (BR-987654321)",
    date: ref,
    text: [
      "Booking Reference: BR-987654321",
      "Tour Name: Belém Walking Tour with Jerónimos Monastery",
      "Tour Grade: Spanish Tour 9:30",
      "Travel Date: Sat, Nov 14, 2026",
      "Lead Traveler Name: Ana Gómez",
      "Travelers: 2 Adults, 1 Child",
      "Phone: +34 612 345 678",
      "Tour Language: Spanish",
      "Net Rate: €96.00",
    ].join("\n"),
  });
  assert.equal(parsed.platform, "VIATOR");
  assert.equal(parsed.kind, "NEW");
  assert.equal(parsed.ref, "BR-987654321");
  assert.equal(parsed.dateKey, "2026-11-14");
  assert.equal(parsed.pax.total, 3);
  assert.equal(parsed.language, "es");
  assert.equal(parsed.customerName, "Ana Gómez");
  assert.equal(parsed.customerPhone, "+34612345678");
  assert.equal(parsed.product, "Belém Walking Tour with Jerónimos Monastery");
});

test("Civitatis style e-mail in Spanish (label on its own line)", () => {
  const parsed = parseBookingEmail({
    from: "Civitatis <reservas@civitatis.com>",
    subject: "Nueva reserva - Tour por Belém",
    date: ref,
    html: "<p>Localizador</p><p>7654321</p><p>Actividad</p><p>Tour por Belém y el Monasterio de los Jerónimos</p><p>Fecha</p><p>14/11/2026</p><p>Hora</p><p>10:00</p><p>Personas</p><p>Adultos: 2 Niños: 1</p><p>Nombre</p><p>Lucía Pérez</p><p>Teléfono</p><p>+34 600 111 222</p>",
  });
  assert.equal(parsed.platform, "CIVITATIS");
  assert.equal(parsed.kind, "NEW");
  assert.equal(parsed.ref, "7654321");
  assert.equal(parsed.dateKey, "2026-11-14");
  assert.equal(parsed.timeKey, "10:00");
  assert.equal(parsed.pax.total, 3);
  assert.equal(parsed.customerName, "Lucía Pérez");
  assert.deepEqual(parsed.missing, []);
});

test("cancellation only needs platform + reference", () => {
  const parsed = parseBookingEmail({ from: "noreply@tiqets.com", subject: "Order cancelled", text: "Order number: 12345678\nYour order was cancelled." });
  assert.equal(parsed.kind, "CANCEL");
  assert.equal(parsed.ref, "12345678");
  assert.deepEqual(parsed.missing, []);
});

test("alias keys ignore accents and case", () => {
  assert.equal(productAliasKey("airbnb", "Belém  Tour!"), productAliasKey("AIRBNB", "belem tour"));
});

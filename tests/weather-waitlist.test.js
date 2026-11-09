import test from "node:test";
import assert from "node:assert/strict";
import { isOutdoorTour, parseOpenMeteoDaily, placeForTour, weatherAlert, weatherIcon } from "../app/utils/weather.js";
import { freeSeats, mailtoLink, messageTemplates, normalizeWaitlistInput, personalize, waitlistMatches, whatsappLink } from "../app/utils/waitlist.js";

test("local do passeio pelo título", () => {
  assert.equal(placeForTour("Sintra & Cascais Full Day"), "sintra");
  assert.equal(placeForTour("Fátima, Nazaré & Óbidos Day Trip"), "fatima");
  assert.equal(placeForTour("Douro Valley Wine Tour"), "douro");
  assert.equal(placeForTour("Walking Tour Lisbon"), "lisboa");
  assert.equal(placeForTour("Passeio misterioso"), "lisboa");
});

test("passeio em local fechado não gera alerta de chuva", () => {
  assert.equal(isOutdoorTour("Fado Dinner & Show"), false);
  assert.equal(isOutdoorTour("Sintra Guided Tour"), true);
});

test("níveis de alerta", () => {
  assert.equal(weatherAlert({ rainMm: 0, rainChance: 10, gustKmh: 20, tempMax: 22 }), null);
  assert.equal(weatherAlert({ rainMm: 4, rainChance: 40 }), "watch");
  assert.equal(weatherAlert({ rainMm: 12, rainChance: 90 }), "bad");
  assert.equal(weatherAlert({ gustKmh: 75 }), "bad");
  assert.equal(weatherAlert({ tempMax: 41 }), "bad");
  assert.equal(weatherAlert(null), null);
});

test("lê a resposta do Open-Meteo", () => {
  const days = parseOpenMeteoDaily({ daily: { time: ["2026-11-10"], temperature_2m_min: [11], temperature_2m_max: [17], precipitation_sum: [8.2], precipitation_probability_max: [85], wind_gusts_10m_max: [44], weather_code: [63] } });
  assert.deepEqual(days["2026-11-10"], { tempMin: 11, tempMax: 17, rainMm: 8.2, rainChance: 85, gustKmh: 44, code: 63 });
  assert.equal(weatherIcon(days["2026-11-10"]), "🌧️");
  assert.deepEqual(parseOpenMeteoDaily(null), {});
});

test("valida a entrada da lista de espera", () => {
  assert.throws(() => normalizeWaitlistInput({ customerName: "" }), /nome/);
  assert.throws(() => normalizeWaitlistInput({ customerName: "Ana" }), /WhatsApp ou e-mail/);
  assert.throws(() => normalizeWaitlistInput({ customerName: "Ana", customerEmail: "x" }), /inválido/);
  assert.throws(() => normalizeWaitlistInput({ customerName: "Ana", customerPhone: "+351 9", pax: 0 }), /pessoas/);
  const ok = normalizeWaitlistInput({ customerName: " Ana ", customerEmail: "ANA@MAIL.COM", pax: "3" });
  assert.deepEqual(ok, { customerName: "Ana", customerPhone: null, customerEmail: "ana@mail.com", language: null, pax: 3, notes: null });
});

test("vagas livres e quem da fila cabe, na ordem de chegada", () => {
  assert.equal(freeSeats({ pax: 15, pending: 2 }, { maxCapacity: 20 }), 3);
  assert.equal(freeSeats({ pax: 25 }, { maxCapacity: 20 }), 0);
  assert.equal(freeSeats({ pax: 1 }, {}), null);
  const entries = [
    { id: "a", pax: 2, status: "WAITING", createdAt: "2026-11-01" },
    { id: "b", pax: 4, status: "WAITING", createdAt: "2026-11-02" },
    { id: "c", pax: 1, status: "WAITING", createdAt: "2026-11-03" },
    { id: "d", pax: 1, status: "NOTIFIED", createdAt: "2026-10-01" },
  ];
  assert.deepEqual(waitlistMatches(entries, 3).map((e) => e.id), ["a", "c"]);
  assert.deepEqual(waitlistMatches(entries, 0), []);
});

test("links de WhatsApp e e-mail com a mensagem pronta", () => {
  assert.equal(whatsappLink("+351 912 345 678", "Olá"), "https://wa.me/351912345678?text=Ol%C3%A1");
  assert.equal(whatsappLink("123", "x"), null);
  const mail = mailtoLink(["a@x.com", "b@x.com", "a@x.com"], "Sintra", "Hi there");
  assert.ok(mail.startsWith("mailto:?bcc=a%40x.com%2Cb%40x.com"));
  assert.ok(mail.includes("Hi%20there"));
  assert.equal(mailtoLink([], "x", "y"), null);
  const t = messageTemplates({ title: "Sintra", dateLabel: "12 November", timeKey: "09:30", lang: "en" });
  assert.deepEqual(t.map((x) => x.key), ["delay", "meeting", "weather", "waitlist"]);
  assert.ok(personalize(t[0].text, "Maria Silva").startsWith("Hi Maria,"));
});

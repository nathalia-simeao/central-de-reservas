import { test } from "node:test";
import assert from "node:assert/strict";
import { findPhones, normalizePhone, phoneLinks, textWithoutPhones } from "../app/utils/phone-actions.js";

test("acha telefones internacionais e celular português", () => {
  assert.deepEqual(findPhones("Ana Silva (2A) +351 912 345 678").map((p) => p.phone), ["+351912345678"]);
  assert.deepEqual(findPhones("John +44 7700 900123 e Maria 912-345-678").map((p) => p.phone), ["+447700900123", "+351912345678"]);
  assert.deepEqual(findPhones("ligar 0055 11 94808 5785").map((p) => p.phone), ["+5511948085785"]);
});

test("não confunde datas, horários e códigos com telefone", () => {
  assert.deepEqual(findPhones("13/11 09:30 GYG123456789 ref 1234567890 2A 1C"), []);
});

test("texto do checklist sem o número", () => {
  assert.deepEqual(textWithoutPhones("Ana Silva (2A) +351912345678"), { text: "Ana Silva (2A)", phones: ["+351912345678"] });
});

test("links de WhatsApp, ligação e SMS", () => {
  const links = phoneLinks("+351 912 345 678", "Olá!");
  assert.equal(links.whatsapp, "https://wa.me/351912345678?text=Ol%C3%A1!");
  assert.equal(links.call, "tel:+351912345678");
  assert.ok(links.sms.startsWith("sms:+351912345678"));
  assert.equal(normalizePhone("12"), "");
});

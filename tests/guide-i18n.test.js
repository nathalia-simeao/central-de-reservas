import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { GUIDE_STRINGS } from "../app/utils/guide-i18n-strings.js";
import { guideLang, langFromAcceptLanguage, translate } from "../app/utils/guide-i18n.js";

const LANGS = ["en", "es", "fr", "it", "de"];

test("every t(\"…\") text in the guide app has all five translations", () => {
  const files = readdirSync("app/routes").filter((f) => f.startsWith("guia")).map((f) => `app/routes/${f}`);
  files.push("app/components/guide/GuideShell.jsx");
  const missing = [];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) {
      const key = JSON.parse(`"${match[1]}"`);
      const row = GUIDE_STRINGS[key];
      if (!row || LANGS.some((l) => !row[l])) missing.push(`${file}: ${key}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("language helpers", () => {
  assert.equal(guideLang("FR"), "fr");
  assert.equal(guideLang("nl"), "pt");
  assert.equal(langFromAcceptLanguage("de-DE,de;q=0.9,en;q=0.8"), "de");
  assert.equal(translate("es", "Olá, {name}", { name: "Ana" }), "Hola, Ana");
  assert.equal(translate("pt", "Olá, {name}", { name: "Ana" }), "Olá, Ana");
  assert.equal(translate("fr", "texto sem tradução"), "texto sem tradução");
});

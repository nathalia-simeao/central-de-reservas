import test from "node:test";
import assert from "node:assert/strict";

import {
  extractTourLanguages,
  variantMatchesTourLanguage,
} from "../app/utils/tour-languages.js";

test("extractTourLanguages reads the Shopify language option values", () => {
  const languages = extractTourLanguages({
    options: [
      { name: "Language", values: ["Português", "English", "Español"] },
      { name: "Time", values: ["10:00", "14:00"] },
    ],
    variants: [],
  });

  assert.deepEqual(languages, ["Português", "English", "Español"]);
});

test("extractTourLanguages also reads selected variant options", () => {
  const languages = extractTourLanguages({
    variants: [
      {
        selectedOptions: [
          { name: "Idioma", value: "Français" },
          { name: "Horário", value: "10:00" },
        ],
      },
    ],
  });

  assert.deepEqual(languages, ["Français"]);
});

test("variantMatchesTourLanguage filters only variants that expose a language dimension", () => {
  const englishVariant = {
    selectedOptions: [
      { name: "Language", value: "English" },
      { name: "Time", value: "10:00" },
    ],
  };

  assert.equal(variantMatchesTourLanguage(englishVariant, "English"), true);
  assert.equal(variantMatchesTourLanguage(englishVariant, "Português"), false);
  assert.equal(variantMatchesTourLanguage({ selectedOptions: [] }, "English"), true);
});


test("extractTourLanguages reads custom.languages_info from Shopify product metafields", () => {
  const languages = extractTourLanguages({
    metafields: {
      languages_info: "English, Spanish, Portuguese",
    },
  });

  assert.deepEqual(languages, ["English", "Spanish", "Portuguese"]);
});

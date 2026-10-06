import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Agenda uses PMY custom dropdowns for tour, language and time selection", async () => {
  const source = await fs.readFile(
    new URL("../app/components/pmy/AgendaTab.jsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("DropdownSelect"), true);
  assert.equal(source.includes('searchPlaceholder={tr("Pesquisar passeio..."'), true);
  assert.equal(source.includes('ariaLabel={t.form_lang}'), true);
  assert.equal(source.includes('ariaLabel={tr("Horário a bloquear", "Time to block")}'), true);
  assert.equal(source.includes("<Select"), false);
});

test("Agenda does not show the generic lowest tour price as if it were the tour price", async () => {
  const source = await fs.readFile(
    new URL("../app/components/pmy/AgendaTab.jsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes('{tour.title}{tour.price ?'), false);
  assert.equal(source.includes('<span className="pmy-ds-accent">{tour.price}'), false);
  assert.equal(source.includes('pmy-ds-variant-price">{variant.price}'), true);
});

test("PMY Design System custom dropdown has styled popover and searchable mode", async () => {
  const ui = await fs.readFile(
    new URL("../app/components/pmy/PmyUI.jsx", import.meta.url),
    "utf8",
  );
  const css = await fs.readFile(
    new URL("../app/styles/pmy-design-system.css", import.meta.url),
    "utf8",
  );

  assert.equal(ui.includes("export function DropdownSelect"), true);
  assert.equal(ui.includes('role="listbox"'), true);
  assert.equal(css.includes(".pmy-ds-dropdown__popover"), true);
  assert.equal(css.includes(".pmy-ds-dropdown__option.is-selected"), true);
});


test("Dashboard overview custom period uses PMY DatePicker instead of native date inputs", async () => {
  const source = await fs.readFile(
    new URL("../app/routes/_index/route.jsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes('type="date"'), false);
  assert.equal(source.includes("<DatePicker"), true);
  assert.equal(source.includes("pmy-dashboard-date-picker--start"), true);
  assert.equal(source.includes("pmy-dashboard-date-picker--end"), true);
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Integration cards and modals expose semantic status accents", async () => {
  const panel = await fs.readFile(new URL("../app/components/pmy/IntegrationConnectionsPanel.jsx", import.meta.url), "utf8");
  const modal = await fs.readFile(new URL("../app/components/pmy/CentralModalLayer.jsx", import.meta.url), "utf8");
  const route = await fs.readFile(new URL("../app/routes/_index/route.jsx", import.meta.url), "utf8");
  const css = await fs.readFile(new URL("../app/styles/pmy-central-style.js", import.meta.url), "utf8");

  assert.equal(panel.includes("FALTA CONFIGURAR"), true);
  assert.equal(panel.includes("AGUARDANDO RESPOSTA / VALIDAÇÃO"), true);
  assert.equal(panel.includes('"is-required"'), true);
  assert.equal(route.includes('awaitingExternalResponse: true'), true);
  assert.equal(modal.includes("modalStatusClass"), true);
  assert.equal(css.includes(".pmy-int-card-v2.is-required::before"), true);
  assert.equal(css.includes(".pmy-int-card-v2.is-configured::before"), true);
  assert.equal(css.includes(".pmy-connect-modal.is-status-waiting::before"), true);
});

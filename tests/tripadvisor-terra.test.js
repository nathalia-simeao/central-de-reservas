import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Tripadvisor is content-only and validates Terra remotely", async () => {
  const credentials = await fs.readFile(
    new URL("../app/routes/api.integration-credentials.jsx", import.meta.url),
    "utf8",
  );
  const server = await fs.readFile(
    new URL("../app/utils/tripadvisor.server.js", import.meta.url),
    "utf8",
  );
  const modal = await fs.readFile(
    new URL("../app/components/pmy/CentralModalLayer.jsx", import.meta.url),
    "utf8",
  );

  assert.equal(credentials.includes('"TRIPADVISOR"'), true);
  assert.equal(credentials.includes("testTripadvisorTerraCredentials"), true);
  assert.equal(server.includes("X-API-Key"), true);
  assert.equal(server.includes("/locations/"), true);
  assert.equal(
    modal.toLowerCase().includes("não cria reservas e não consome vagas"),
    true,
  );
});

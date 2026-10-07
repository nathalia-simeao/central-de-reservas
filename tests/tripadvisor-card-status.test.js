import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Tripadvisor content card reflects real connection state", async () => {
  const source = await fs.readFile(
    new URL("../app/components/pmy/IntegrationConnectionsPanel.jsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("const isConnected = Boolean(conn.connected);"), true);
  assert.equal(source.includes("CONECTADO · TERRA API"), true);
  assert.equal(source.includes('isConnected ? "connected" : ""'), true);
  assert.equal(source.includes('"pmy-int-status-dot " + (isConnected ? "on"'), true);
});

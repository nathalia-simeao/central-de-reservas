import test from "node:test";
import assert from "node:assert/strict";
import { FEATURES, normalizeFeatureFlags, sanitizeFeatureFlagsPatch } from "../app/utils/feature-flags.js";

test("tudo novo chega desligado; só mover saídas (pedido da gestão) vem ligado", () => {
  const flags = normalizeFeatureFlags(null);
  assert.deepEqual(flags, { boardMove: true, weatherAlerts: false, guestMessages: false, waitlist: false });
  for (const f of FEATURES) if (f.key !== "boardMove") assert.equal(f.defaultOn, false, f.key);
});

test("escolha salva prevalece sobre o padrão", () => {
  assert.deepEqual(normalizeFeatureFlags({ boardMove: false, waitlist: true, waitlistX: true }), { boardMove: false, weatherAlerts: false, guestMessages: false, waitlist: true });
});

test("só aceita chaves conhecidas com valor sim/não", () => {
  assert.deepEqual(sanitizeFeatureFlagsPatch({ waitlist: true, weatherAlerts: "yes", hack: true }), { waitlist: true });
  assert.throws(() => sanitizeFeatureFlagsPatch([]), /inválidas/);
});

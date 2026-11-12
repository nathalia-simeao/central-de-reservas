import test from "node:test";
import assert from "node:assert/strict";
import { base32Decode, base32Encode, generateTotpSecret, totpCode, verifyTotp } from "../app/utils/totp.server.js";

test("TOTP matches the RFC 6238 reference values (SHA1)", () => {
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  assert.equal(totpCode(secret, 59 * 1000), "287082");
  assert.equal(totpCode(secret, 1111111109 * 1000), "081804");
  assert.equal(totpCode(secret, 2000000000 * 1000), "279037");
  assert.deepEqual(base32Decode(secret), Buffer.from("12345678901234567890"));
});

test("codes are accepted within ±30 s and rejected otherwise", () => {
  const secret = generateTotpSecret();
  const now = Date.UTC(2026, 10, 12, 18, 0, 0);
  assert.equal(verifyTotp(secret, totpCode(secret, now), now), true);
  assert.equal(verifyTotp(secret, totpCode(secret, now - 30_000), now), true);
  assert.equal(verifyTotp(secret, totpCode(secret, now - 120_000), now), false);
  assert.equal(verifyTotp(secret, "12345", now), false);
});

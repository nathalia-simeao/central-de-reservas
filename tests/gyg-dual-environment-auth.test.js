import test from "node:test";
import assert from "node:assert/strict";
import { checkGygBasicAuth, isGygIncomingAuthConfigured } from "../app/utils/gyg.server.js";

const keys = ["GYG_INCOMING_USER","GYG_INCOMING_PASS","GYG_PRODUCTION_USER","GYG_PRODUCTION_PASS"];
const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
function setPairs(testing, production) {
  for (const key of keys) delete process.env[key];
  if (testing) {
    process.env.GYG_INCOMING_USER = testing[0];
    process.env.GYG_INCOMING_PASS = testing[1];
  }
  if (production) {
    process.env.GYG_PRODUCTION_USER = production[0];
    process.env.GYG_PRODUCTION_PASS = production[1];
  }
}
function request(user, pass) {
  return new Request("https://example.com/1/get-availabilities", {
    headers: { Authorization: "Basic " + Buffer.from(user + ":" + pass).toString("base64") },
  });
}
test("GYG incoming credentials remain isolated and fail closed", () => {
  try {
    setPairs(null, null);
    assert.equal(isGygIncomingAuthConfigured(), false);
    assert.equal(checkGygBasicAuth(request("any", "value")), false);
    setPairs(["test-user","test-secret"],["prod-user","prod-secret"]);
    assert.equal(isGygIncomingAuthConfigured(), true);
    assert.equal(checkGygBasicAuth(request("test-user","test-secret")), true);
    assert.equal(checkGygBasicAuth(request("prod-user","prod-secret")), true);
    assert.equal(checkGygBasicAuth(request("test-user","prod-secret")), false);
    assert.equal(checkGygBasicAuth(request("prod-user","test-secret")), false);
    assert.equal(checkGygBasicAuth(request("test-user","wrong")), false);
    setPairs(["test-user","test-secret"],null);
    assert.equal(checkGygBasicAuth(request("test-user","test-secret")), true);
    assert.equal(checkGygBasicAuth(request("prod-user","prod-secret")), false);
    setPairs(null,["prod-user","prod-secret"]);
    assert.equal(checkGygBasicAuth(request("prod-user","prod-secret")), true);
    process.env.GYG_PRODUCTION_PASS = "";
    assert.equal(checkGygBasicAuth(request("prod-user","prod-secret")), false);
  } finally {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});

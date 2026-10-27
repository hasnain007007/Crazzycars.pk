import assert from "node:assert/strict";
import test from "node:test";
import { getMobileJwtSecret } from "../storecraft-store/lib/mobile/jwtSecret.js";

function withEnv(env, fn) {
  const keep = { M: process.env.MOBILE_JWT_SECRET, W: process.env.JWT_SECRET };
  for (const [k, v] of Object.entries(env)) v == null ? delete process.env[k] : (process.env[k] = v);
  try { return fn(); } finally {
    keep.M == null ? delete process.env.MOBILE_JWT_SECRET : (process.env.MOBILE_JWT_SECRET = keep.M);
    keep.W == null ? delete process.env.JWT_SECRET : (process.env.JWT_SECRET = keep.W);
  }
}

test("explicit MOBILE_JWT_SECRET wins", () => {
  assert.equal(withEnv({ MOBILE_JWT_SECRET: "m-secret", JWT_SECRET: "web-secret-0123456789" }, getMobileJwtSecret), "m-secret");
});

test("derived from JWT_SECRET: stable, not equal to it", () => {
  const a = withEnv({ MOBILE_JWT_SECRET: null, JWT_SECRET: "web-secret-0123456789" }, getMobileJwtSecret);
  const b = withEnv({ MOBILE_JWT_SECRET: null, JWT_SECRET: "web-secret-0123456789" }, getMobileJwtSecret);
  assert.equal(a, b);
  assert.notEqual(a, "web-secret-0123456789");
  assert.equal(a.length, 64);
});

test("neither set → CONFIG_ERROR", () => {
  assert.throws(() => withEnv({ MOBILE_JWT_SECRET: null, JWT_SECRET: null }, getMobileJwtSecret), /not configured/);
});

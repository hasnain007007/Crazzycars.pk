/**
 * Refresh-token grace window (Mongo via mongodb-memory-server).
 * Covers: unused-child grace retry; child-already-used; after window; beyond cap.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const abDir = path.resolve(__dirname, "../scripts/ab-checkout");
register(pathToFileURL(path.join(abDir, "alias-loader.mjs")).href);

const storeRoot = path.resolve(__dirname, "../storecraft-store");

let mem;
let issueRefreshToken;
let rotateRefreshToken;
let hashRefreshToken;
let REFRESH_GRACE_MS;
let REFRESH_GRACE_MAX_RETRIES;
let CustomerRefreshToken;
let dbConnect;

before(async () => {
  const { createRequire } = await import("module");
  const require = createRequire(path.join(abDir, "package.json"));
  const { MongoMemoryServer } = require("mongodb-memory-server");

  mem = await MongoMemoryServer.create();
  const u = new URL(mem.getUri());
  u.pathname = "/cc_refresh_grace_test";
  process.env.MONGODB_URI = u.toString();

  await mongoose.disconnect().catch(() => {});
  for (const k of Object.keys(mongoose.models)) delete mongoose.models[k];
  if (global.mongoose) {
    global.mongoose.conn = null;
    global.mongoose.promise = null;
  }

  // Connect with the same mongoose the models use (db.js caches URI at import)
  const dbMod = await import(pathToFileURL(path.join(storeRoot, "lib/db.js")).href + `?t=${Date.now()}`);
  dbConnect = dbMod.dbConnect;
  await dbConnect();

  const refreshMod = await import(
    pathToFileURL(path.join(storeRoot, "lib/mobile/refreshToken.js")).href + `?t=${Date.now()}`
  );
  issueRefreshToken = refreshMod.issueRefreshToken;
  rotateRefreshToken = refreshMod.rotateRefreshToken;
  hashRefreshToken = refreshMod.hashRefreshToken;
  REFRESH_GRACE_MS = refreshMod.REFRESH_GRACE_MS;
  REFRESH_GRACE_MAX_RETRIES = refreshMod.REFRESH_GRACE_MAX_RETRIES;

  CustomerRefreshToken = (
    await import(pathToFileURL(path.join(storeRoot, "lib/models/CustomerRefreshToken.model.js")).href)
  ).default;
});

after(async () => {
  await mongoose.disconnect().catch(() => {});
  if (mem) await mem.stop();
});

async function wipe() {
  await dbConnect();
  await CustomerRefreshToken.deleteMany({});
}

describe("refresh grace window", () => {
  it("retry in window with unused child issues a NEW child; lost child no longer works", async () => {
    await wipe();
    const customerId = new mongoose.Types.ObjectId();
    const { opaqueToken: parent } = await issueRefreshToken(customerId);

    const first = await rotateRefreshToken(parent);
    assert.ok(first.opaqueToken);
    assert.notEqual(first.opaqueToken, parent);
    const lostChild = first.opaqueToken;

    const grace = await rotateRefreshToken(parent);
    assert.equal(grace.customerId, String(customerId));
    assert.ok(grace.opaqueToken);
    assert.notEqual(grace.opaqueToken, lostChild);
    assert.notEqual(grace.opaqueToken, parent);

    // Lost child must not rotate (soft reject — does not family-revoke the grace child)
    await assert.rejects(() => rotateRefreshToken(lostChild), (err) => {
      assert.equal(err.code, "TOKEN_INVALID");
      return true;
    });

    // New grace child still works
    const again = await rotateRefreshToken(grace.opaqueToken);
    assert.ok(again.opaqueToken);

    const parentDoc = await CustomerRefreshToken.findOne({
      tokenHash: hashRefreshToken(parent),
    }).lean();
    assert.equal(parentDoc.graceRetryCount, 1);
    assert.ok(parentDoc.replacedByTokenHash);
  });

  it("retry in window after child was used → TOKEN_REUSED + all sessions revoked", async () => {
    await wipe();
    const customerId = new mongoose.Types.ObjectId();
    const { opaqueToken: parent } = await issueRefreshToken(customerId);
    // Second session token to prove family revoke
    const { opaqueToken: otherSession } = await issueRefreshToken(customerId);

    const first = await rotateRefreshToken(parent);
    const child = first.opaqueToken;

    // Client received child and rotated again
    const grand = await rotateRefreshToken(child);
    assert.ok(grand.opaqueToken);

    await assert.rejects(() => rotateRefreshToken(parent), (err) => {
      assert.equal(err.code, "TOKEN_REUSED");
      return true;
    });

    const active = await CustomerRefreshToken.countDocuments({
      customerId,
      isRevoked: { $ne: true },
    });
    assert.equal(active, 0);

    // Collateral sessions are dead (401); may be TOKEN_INVALID if they never carried grace metadata
    await assert.rejects(() => rotateRefreshToken(otherSession), (err) => {
      assert.ok(["TOKEN_REUSED", "TOKEN_INVALID"].includes(err.code));
      return true;
    });
    await assert.rejects(() => rotateRefreshToken(grand.opaqueToken), (err) => {
      assert.ok(["TOKEN_REUSED", "TOKEN_INVALID"].includes(err.code));
      return true;
    });
  });

  it("retry after the grace window → TOKEN_REUSED", async () => {
    await wipe();
    const customerId = new mongoose.Types.ObjectId();
    const { opaqueToken: parent } = await issueRefreshToken(customerId);
    await rotateRefreshToken(parent);

    await CustomerRefreshToken.updateOne(
      { tokenHash: hashRefreshToken(parent) },
      { $set: { graceExpiresAt: new Date(Date.now() - 1000) } }
    );

    await assert.rejects(() => rotateRefreshToken(parent), (err) => {
      assert.equal(err.code, "TOKEN_REUSED");
      return true;
    });
  });

  it("retry beyond the grace cap → TOKEN_REUSED", async () => {
    await wipe();
    const customerId = new mongoose.Types.ObjectId();
    const { opaqueToken: parent } = await issueRefreshToken(customerId);
    await rotateRefreshToken(parent);

    let lastChild = null;
    for (let i = 0; i < REFRESH_GRACE_MAX_RETRIES; i++) {
      const r = await rotateRefreshToken(parent);
      lastChild = r.opaqueToken;
      assert.ok(lastChild);
    }

    const parentDoc = await CustomerRefreshToken.findOne({
      tokenHash: hashRefreshToken(parent),
    }).lean();
    assert.equal(parentDoc.graceRetryCount, REFRESH_GRACE_MAX_RETRIES);

    await assert.rejects(() => rotateRefreshToken(parent), (err) => {
      assert.equal(err.code, "TOKEN_REUSED");
      return true;
    });

    // Cap hit family-revokes — last grace child also dead
    await assert.rejects(() => rotateRefreshToken(lastChild), (err) => {
      assert.ok(["TOKEN_REUSED", "TOKEN_INVALID"].includes(err.code));
      return true;
    });
  });

  it("exports a 30s grace window constant", () => {
    assert.equal(REFRESH_GRACE_MS, 30_000);
    assert.equal(REFRESH_GRACE_MAX_RETRIES, 3);
  });
});

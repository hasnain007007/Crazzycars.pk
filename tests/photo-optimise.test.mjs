import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, statSync, existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";

// Temp media folder shared by the admin optimiser and the store resolver (both read MEDIA_ROOT).
const root = mkdtempSync(path.join(os.tmpdir(), "cc-media-"));
process.env.MEDIA_ROOT = root;
mkdirSync(path.join(root, "products"), { recursive: true });

const require = createRequire(new URL("../storecraft-admin/package.json", import.meta.url));
const sharp = require("sharp");

await import("./admin-alias-loader.mjs");
const { optimiseProductPhoto } = await import("../storecraft-admin/lib/mediaStorage.js");
const { pdpImageUrlExisting, thumbImageUrlExisting } = await import("../storecraft-store/lib/resolveLocalMedia.js");

test("heavy PNG gets -400, -sm and -800 copies; original untouched; PDP uses -800", async () => {
  const master = path.join(root, "products", "heavy-photo.png");
  // Random pixels so the PNG is genuinely large (like the 1.5–7.5 MB uploads on the live site).
  const raw = randomBytes(2000 * 1500 * 3);
  await sharp(raw, { raw: { width: 2000, height: 1500, channels: 3 } }).png().toFile(master);
  const before = readFileSync(master);

  const r = await optimiseProductPhoto("https://crazzycars.pk/media/products/heavy-photo.png");
  assert.equal(r.status, "built");
  assert.deepEqual(r.built, ["400", "sm", "800"]);
  assert.ok(r.pageBytes < r.masterBytes / 2, `page copy ${r.pageBytes} should be far smaller than ${r.masterBytes}`);
  assert.deepEqual(readFileSync(master), before, "original must not change");

  const mid = await sharp(path.join(root, "products", "heavy-photo-800.webp")).metadata();
  assert.ok(mid.width <= 1000 && mid.height <= 1000);

  // Second run builds nothing.
  assert.equal((await optimiseProductPhoto("/media/products/heavy-photo.png")).status, "ok");

  assert.equal(pdpImageUrlExisting("/media/products/heavy-photo.png"), "/media/products/heavy-photo-800.webp");
  assert.equal(thumbImageUrlExisting("/media/products/heavy-photo.png"), "/media/products/heavy-photo-sm.webp");
});

test("a copy that would be heavier than the original is thrown away", async () => {
  const flat = path.join(root, "products", "pattern.png");
  const raw = Buffer.alloc(2000 * 1500 * 3);
  for (let i = 0; i < raw.length; i++) raw[i] = (i * 2654435761) % 251;
  await sharp(raw, { raw: { width: 2000, height: 1500, channels: 3 } }).png().toFile(flat);
  const r = await optimiseProductPhoto("/media/products/pattern.png");
  assert.ok(!r.built.includes("800"));
  assert.ok(!existsSync(path.join(root, "products", "pattern-800.webp")));
  assert.equal(pdpImageUrlExisting("/media/products/pattern.png"), "/media/products/pattern.png");
});

test("small webp keeps the original on the product page; missing files reported", async () => {
  const small = path.join(root, "products", "small.webp");
  await sharp({ create: { width: 600, height: 600, channels: 3, background: "#c41e1e" } }).webp().toFile(small);
  const r = await optimiseProductPhoto("/media/products/small.webp");
  assert.deepEqual(r.built, ["400", "sm"]);
  assert.ok(!existsSync(path.join(root, "products", "small-800.webp")));
  assert.equal(pdpImageUrlExisting("/media/products/small.webp"), "/media/products/small.webp");
  assert.equal((await optimiseProductPhoto("/media/products/nope.png")).status, "missing");
  assert.equal((await optimiseProductPhoto("/media/categories/x.png")).status, "skipped");
  assert.ok(statSync(small).size > 0);
});

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
const {
  pdpImageUrlExisting,
  galleryImageUrlExisting,
  galleryImageUrl1200Existing,
  thumbImageUrlExisting,
} = await import("../storecraft-store/lib/resolveLocalMedia.js");

const file = (name) => path.join(root, "products", name);
const size = (name) => statSync(file(name)).size;

test("heavy PNG gets -400, -sm, -800 and -1200 copies; original untouched; pages use the copies", async () => {
  // Random pixels so the PNG is genuinely large (like the 1.5–7.5 MB uploads on the live site).
  const raw = randomBytes(2000 * 1500 * 3);
  await sharp(raw, { raw: { width: 2000, height: 1500, channels: 3 } }).png().toFile(file("heavy-photo.png"));
  const before = readFileSync(file("heavy-photo.png"));

  const r = await optimiseProductPhoto("https://crazzycars.pk/media/products/heavy-photo.png");
  assert.equal(r.status, "built");
  assert.deepEqual(r.built, ["400", "sm", "800", "1200"]);
  assert.ok(r.pageBytes < r.masterBytes / 2, `page copy ${r.pageBytes} should be far smaller than ${r.masterBytes}`);
  assert.deepEqual(readFileSync(file("heavy-photo.png")), before, "original must not change");

  const card = await sharp(file("heavy-photo-400.webp")).metadata();
  assert.equal(card.width, 400);
  assert.equal(card.height, 400);
  const mid = await sharp(file("heavy-photo-800.webp")).metadata();
  assert.ok(mid.width <= 800 && mid.height <= 800, `-800 is ${mid.width}x${mid.height}`);
  const large = await sharp(file("heavy-photo-1200.webp")).metadata();
  assert.ok(large.width <= 1200 && large.height <= 1200, `-1200 is ${large.width}x${large.height}`);

  // Second run builds nothing.
  assert.equal((await optimiseProductPhoto("/media/products/heavy-photo.png")).status, "ok");

  assert.equal(pdpImageUrlExisting("/media/products/heavy-photo.png"), "/media/products/heavy-photo-800.webp");
  assert.equal(galleryImageUrlExisting("/media/products/heavy-photo.png"), "/media/products/heavy-photo-800.webp");
  assert.equal(galleryImageUrl1200Existing("/media/products/heavy-photo.png"), "/media/products/heavy-photo-1200.webp");
  assert.equal(thumbImageUrlExisting("/media/products/heavy-photo.png"), "/media/products/heavy-photo-400.webp");
});

test("a flat-colour graphic never gets a page copy heavier than the original", async () => {
  // Small, highly compressible PNG (logo / graphic style). Lossy WebP alone made the
  // -800 copy 1.7x and the -1200 copy 7x heavier than this master.
  const flat = Buffer.alloc(2000 * 1500 * 3);
  for (let i = 0; i < flat.length; i++) flat[i] = (i * 2654435761) % 251;
  await sharp(flat, { raw: { width: 2000, height: 1500, channels: 3 } }).png().toFile(file("pattern.png"));
  const master = size("pattern.png");

  const r = await optimiseProductPhoto("/media/products/pattern.png");
  assert.ok(r.built.includes("800") && r.built.includes("1200"));
  assert.ok(size("pattern-800.webp") <= master, `-800 ${size("pattern-800.webp")} > master ${master}`);
  // -1200 of this synthetic noise cannot beat the PNG, but must stay far below lossy (≈379 KB).
  assert.ok(size("pattern-1200.webp") < master * 2.5, `-1200 ${size("pattern-1200.webp")} vs master ${master}`);
  assert.equal(pdpImageUrlExisting("/media/products/pattern.png"), "/media/products/pattern-800.webp");
});

test("small photos are never enlarged; missing and non-product files are reported", async () => {
  await sharp({ create: { width: 600, height: 600, channels: 3, background: "#c41e1e" } })
    .webp()
    .toFile(file("small.webp"));
  const r = await optimiseProductPhoto("/media/products/small.webp");
  assert.equal(r.status, "built");
  for (const s of ["800", "1200", "sm"]) {
    const m = await sharp(file(`small-${s}.webp`)).metadata();
    assert.ok(m.width <= 600 && m.height <= 600, `-${s} was enlarged to ${m.width}x${m.height}`);
  }
  assert.equal((await optimiseProductPhoto("/media/products/nope.png")).status, "missing");
  assert.equal((await optimiseProductPhoto("/media/categories/x.png")).status, "skipped");
  assert.equal((await optimiseProductPhoto("/media/products/small-1200.webp")).status, "skipped");
  assert.ok(existsSync(file("small.webp")) && size("small.webp") > 0);
});

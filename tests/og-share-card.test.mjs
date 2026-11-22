/**
 * WhatsApp / Facebook share cards: 1200×630 JPEG, real photo, small file.
 * Renders through next/og (Satori + Resvg) with the bundled Inter fonts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const storeRoot = new URL("../storecraft-store/", import.meta.url);
// Fonts are read from <cwd>/public/og-fonts, as in the server (cwd = app root).
process.chdir(storeRoot.pathname);
const require = createRequire(new URL("package.json", storeRoot));
const sharp = require("sharp");

const { ProductCard, CollectionCard, renderOgJpeg, clampText, formatRs, OG_WIDTH, OG_HEIGHT } =
  await import("../storecraft-store/lib/ogCard.js");
const { ogCardVersion } = await import("../storecraft-store/lib/ogCardUrl.js");

async function samplePhoto(size) {
  const jpg = await sharp({ create: { width: size, height: size, channels: 3, background: "#c41e1e" } })
    .jpeg()
    .toBuffer();
  return `data:image/jpeg;base64,${jpg.toString("base64")}`;
}

test("product card renders a small 1200×630 JPEG", async () => {
  const el = ProductCard({
    name: "Honda Civic X 2016-2021 Batman Style Side Mirror Cover",
    price: 3399,
    regular: 3999,
    photo: await samplePhoto(600),
    cod: true,
  });
  const buf = await renderOgJpeg(el);
  const meta = await sharp(buf).metadata();
  assert.equal(meta.format, "jpeg", "WhatsApp is unreliable with WebP — must be JPEG");
  assert.equal(meta.width, OG_WIDTH);
  assert.equal(meta.height, OG_HEIGHT);
  assert.ok(buf.length < 300_000, `card is ${buf.length} bytes; WhatsApp drops large previews`);
});

test("collection card renders even when a photo is missing", async () => {
  const el = CollectionCard({
    kicker: "Shop by category",
    title: "Body Kits & Extensions",
    sub: "48 products with prices in Pakistan",
    photos: [await samplePhoto(392), null, null],
    cod: "none",
  });
  const meta = await sharp(await renderOgJpeg(el)).metadata();
  assert.equal(meta.width, OG_WIDTH);
  assert.equal(meta.height, OG_HEIGHT);
});

test("helpers: price format, text clamp, cache-busting version", () => {
  assert.equal(formatRs(10999), "Rs 10,999");
  const long = "Universal ".repeat(30);
  const c = clampText(long, 96);
  assert.ok(c.length <= 96 && c.endsWith("…"));
  assert.equal(clampText("Short name", 96), "Short name");
  // Version changes when price changes, stays stable otherwise.
  assert.equal(ogCardVersion(3399, 3999, "/a.webp"), ogCardVersion(3399, 3999, "/a.webp"));
  assert.notEqual(ogCardVersion(3399, 3999, "/a.webp"), ogCardVersion(2899, 3999, "/a.webp"));
});

test("pages point og:image at JPEG cards, not square WebP", () => {
  const read = (p) => readFileSync(new URL(p, storeRoot), "utf8");
  assert.match(read("app/[slug]/page.jsx"), /\/og\/p\/\$\{slugKey\}\.jpg\?v=/);
  assert.match(read("app/categories/[slug]/page.jsx"), /\/og\/c\/\$\{slugStr\}\.jpg/);
  assert.match(read("app/cars/[slug]/page.jsx"), /\/og\/car\/\$\{vehicle\.slug\}\.jpg/);
  assert.match(read("lib/pageMetadata.js"), /DEFAULT_OG_IMAGE_PATH = "\/og\/site\/home\.jpg"/);
  // The route's fallback must not be the dynamic default (redirect loop).
  assert.match(read("app/og/[kind]/[slug]/route.js"), /absoluteUrl\(FALLBACK_OG_IMAGE_PATH\)/);
});

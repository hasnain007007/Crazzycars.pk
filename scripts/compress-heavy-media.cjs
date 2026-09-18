/**
 * Compress heavy homepage media (brand story, oversized category masters, orphan PNG banners).
 * Run on VPS store container:
 *   node /tmp/compress-heavy-media.cjs
 */
const fs = require("fs");
const path = require("path");
const sharp = require("/app/node_modules/sharp");
const { MongoClient } = require("/app/node_modules/mongodb");

const MEDIA = "/app/media";
const CB = "v=perf" + Date.now().toString(36);

async function toWebp(absIn, absOut, { width, height, quality = 78 } = {}) {
  let pipeline = sharp(absIn).rotate();
  if (width || height) {
    pipeline = pipeline.resize(width || null, height || null, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }
  await pipeline.webp({ quality, effort: 4 }).toFile(absOut);
  return fs.statSync(absOut).size;
}

async function make400(abs) {
  const out = abs.replace(/\.(webp|jpe?g|png|gif|avif)$/i, "-400.webp");
  await sharp(abs)
    .rotate()
    .resize(400, 400, { fit: "cover", position: "centre" })
    .webp({ quality: 72, effort: 4 })
    .toFile(out);
}

(async () => {
  const report = { brand: [], categories: [], deletedPngBanners: 0 };

  // Brand story — 2MB PNGs → webp ~100KB
  const brandPairs = [
    ["brand/crazzycars-pk-brand-story-workshop.png", "brand/crazzycars-pk-brand-story-workshop.webp", "brandStory.image1"],
    ["brand/crazzycars-pk-brand-story-builds.png", "brand/crazzycars-pk-brand-story-builds.webp", "brandStory.image2"],
  ];

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const settings = await client.db().collection("settings").findOne({});
  const set = {};

  for (const [srcRel, outRel, field] of brandPairs) {
    const src = path.join(MEDIA, srcRel);
    const out = path.join(MEDIA, outRel);
    if (!fs.existsSync(src)) continue;
    const before = fs.statSync(src).size;
    const after = await toWebp(src, out, { width: 1200, quality: 76 });
    await make400(out);
    set[field] = `https://crazzycars.pk/media/${outRel}?${CB}`;
    report.brand.push({
      from: srcRel,
      to: outRel,
      beforeKB: Math.round(before / 1024),
      afterKB: Math.round(after / 1024),
    });
  }
  if (Object.keys(set).length) {
    await client.db().collection("settings").updateMany({}, { $set: { ...set, updatedAt: new Date() } });
  }

  // Oversized category masters → webp + refresh -400
  const catDir = path.join(MEDIA, "categories");
  for (const name of fs.readdirSync(catDir)) {
    if (!/\.(png|jpe?g)$/i.test(name) || /-400\./i.test(name)) continue;
    const abs = path.join(catDir, name);
    const size = fs.statSync(abs).size;
    if (size < 180_000) continue;
    const outName = name.replace(/\.(png|jpe?g)$/i, ".webp");
    const outAbs = path.join(catDir, outName);
    const after = await toWebp(abs, outAbs, { width: 1200, quality: 78 });
    await make400(outAbs);
    // rewrite mongo urls pointing at old file
    const oldUrlPart = `/media/categories/${name}`;
    const newUrl = `https://crazzycars.pk/media/categories/${outName}?${CB}`;
    const res = await client
      .db()
      .collection("categories")
      .updateMany(
        { "image.url": { $regex: name.replace(/\./g, "\\.") } },
        { $set: { "image.url": newUrl, updatedAt: new Date() } }
      );
    report.categories.push({
      name,
      outName,
      beforeKB: Math.round(size / 1024),
      afterKB: Math.round(after / 1024),
      mongo: res.modifiedCount,
    });
  }

  // Delete orphan multi-MB PNG banner masters (webp heroes already live)
  const banDir = path.join(MEDIA, "banners");
  for (const name of fs.readdirSync(banDir)) {
    if (!/^crazzycars-pk-hero-.*\.png$/i.test(name)) continue;
    const abs = path.join(banDir, name);
    if (fs.statSync(abs).size > 500_000) {
      fs.unlinkSync(abs);
      report.deletedPngBanners += 1;
    }
  }

  console.log(JSON.stringify(report, null, 2));
  await client.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

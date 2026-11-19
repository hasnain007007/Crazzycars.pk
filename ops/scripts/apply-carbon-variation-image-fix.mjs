#!/usr/bin/env node
/**
 * G apply: clear 3 dead variationCombinations[].image on carbon-trims.
 * Sets each dead URL to the product main media image (safer than "" for cart thumbs).
 * DB: crazzycars_motorsports only. Writes timestamped backup JSON first.
 */
import mongoose from "mongoose";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const SLUG = "honda-city-2009-2018-interior-carbon-fiber-trims";
const DEAD = ["f00f93c853", "dc435b0e05", "9786bb1b3d"];
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (db.databaseName !== "crazzycars_motorsports") {
    throw new Error(`Refusing DB ${db.databaseName}`);
  }

  const p = await db.collection("products").findOne({ slug: SLUG });
  if (!p) throw new Error("product not found");

  const mainUrl =
    (p.media?.images || []).find((i) => i?.isMain)?.url ||
    (p.media?.images || [])[0]?.url ||
    "";
  if (!mainUrl) throw new Error("no main image on product");

  const before = JSON.parse(JSON.stringify(p.variationCombinations || []));
  const outDir = process.env.BACKUP_DIR || "/tmp";
  await mkdir(outDir, { recursive: true });
  const backupPath = path.join(outDir, `carbon-variation-images-${stamp}.json`);
  await writeFile(
    backupPath,
    JSON.stringify(
      {
        at: stamp,
        db: db.databaseName,
        productId: String(p._id),
        slug: SLUG,
        mainUrl,
        variationCombinations: before,
      },
      null,
      2
    )
  );

  let changed = 0;
  const next = (p.variationCombinations || []).map((v) => {
    const img = String(v?.image || "");
    if (DEAD.some((d) => img.includes(d))) {
      changed += 1;
      return { ...v, image: mainUrl };
    }
    return v;
  });
  if (!changed) throw new Error("no dead images found — abort");

  const res = await db.collection("products").updateOne(
    { _id: p._id },
    { $set: { variationCombinations: next, updatedAt: new Date() } }
  );

  const afterDoc = await db.collection("products").findOne(
    { _id: p._id },
    { projection: { slug: 1, variationCombinations: 1, "media.images.url": 1 } }
  );

  const report = {
    backupPath,
    matched: res.matchedCount,
    modified: res.modifiedCount,
    mainUrl,
    changed,
    before: before.map((v, i) => ({ i, sku: v.sku, image: v.image })),
    after: (afterDoc.variationCombinations || []).map((v, i) => ({
      i,
      sku: v.sku,
      image: v.image,
    })),
  };
  const reportPath = path.join(outDir, `carbon-variation-images-after-${stamp}.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, ...report, reportPath }, null, 2));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

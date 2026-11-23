#!/usr/bin/env node
/**
 * CrazzyCars.pk — Product Photos Batch 02 (IDs 02–07, 12 PNGs)
 *
 * Source: CrazzyCars-Product-Photos-Batch-02.zip
 * SKU map: GULAUTOS_Photo_Replacement/replace-list-batch2.csv rows 2–7
 *
 * Action for existing active listings:
 *   - Append AI main+fitted as supplementary gallery (never steal primary/OG)
 *   - Preserve prices/stock/SKU/slug
 *   - Idempotent via sha256 short-hash in media URL
 *
 * Usage (admin container, DB crazzycars_motorsports only):
 *   node import-photo-batch-02.mjs --handoff=/path --media-root=/app/media
 *   node import-photo-batch-02.mjs --handoff=/path --media-root=/app/media --apply
 *
 * Handoff layout:
 *   images/02-main.png … images/07-fitted.png
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

const LIVE_DB = "crazzycars_motorsports";
const BATCH = "CC-PHOTO-BATCH02-2026-11-23";
const IMPORT_TAG = "crazzycars-photo-batch-02";

/** Pack ID → live articleNo (replace-list-batch2.csv). */
const PACK_SKU = {
  2: "CC-INT-134",
  3: "CC-0203",
  4: "CC-0145",
  5: "CC-INT-137",
  6: "CC-0281",
  7: "CC-COR-BBL-2",
};

const HOLD_NOTES = {
  3: "Universal Batman-style splitter — vehicle fit not verified by illustration",
  4: "E210 Grande reflector illustration — confirm bumper/facelift against stock",
  6: "Carbon-look dash trim — composition not independently documented by these images",
  7: "RGB bumper lamp — electrical/CANbus compatibility not verified by illustration",
};

function arg(name, fallback = "") {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}
function sha256File(p) {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}
function dbNameFromUri(uri) {
  const m = String(uri || "").match(/\/([^/?]+)(\?|$)/);
  return m ? decodeURIComponent(m[1]) : "";
}
function padId(n) {
  return String(n).padStart(2, "0");
}

async function getSharp() {
  return (await import("sharp")).default;
}

async function pngMeta(abs) {
  const sharp = await getSharp();
  const meta = await sharp(abs, { failOn: "none" }).metadata();
  return {
    width: Number(meta.width) || 0,
    height: Number(meta.height) || 0,
  };
}

async function writeDerivatives(destAbs) {
  try {
    const sharp = await getSharp();
    const stem = destAbs.replace(/\.png$/i, "");
    for (const [suf, size, q] of [
      ["-sm", 200, 70],
      ["-400", 400, 72],
      ["-800", 1000, 78],
      ["-1200", 1200, 80],
    ]) {
      const out = `${stem}${suf}.webp`;
      if (fs.existsSync(out)) continue;
      await sharp(destAbs, { failOn: "none" })
        .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
        .webp({ quality: q, effort: 4 })
        .toFile(out);
    }
  } catch (err) {
    console.warn("derivative_failed", path.basename(destAbs), String(err?.message || err));
  }
}

function publicFileName(slug, role, sha) {
  const safe = String(slug || "product")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${safe}-${role}-${sha.slice(0, 10)}.png`;
}

async function main() {
  const handoff = arg("handoff");
  if (!handoff || !fs.existsSync(handoff)) {
    console.error("Missing --handoff=/path (images/NN-main.png + NN-fitted.png)");
    process.exit(2);
  }
  const dryRun = !hasFlag("apply");
  const mediaRoot = arg("media-root", process.env.MEDIA_ROOT || "/app/media");
  const mediaProducts = path.join(mediaRoot, "products");
  const outDir = arg("out", path.join(handoff, "import-out"));
  fs.mkdirSync(outDir, { recursive: true });

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "";
  if (!uri) {
    console.error("Set MONGODB_URI");
    process.exit(2);
  }
  const dbn = dbNameFromUri(uri);
  if (dbn && dbn !== LIVE_DB) {
    console.error(`REFUSE DB ${dbn}`);
    process.exit(2);
  }

  const imagesDir = path.join(handoff, "images");
  const expected = Object.keys(PACK_SKU).length * 2;
  const pngCount = fs.readdirSync(imagesDir).filter((f) => f.endsWith(".png")).length;
  if (pngCount !== expected) {
    console.error(`Expected ${expected} PNGs in images/, found ${pngCount}`);
    process.exit(2);
  }

  await mongoose.connect(uri);
  if (mongoose.connection.db.databaseName !== LIVE_DB) {
    console.error(`REFUSE connected ${mongoose.connection.db.databaseName}`);
    process.exit(2);
  }
  const products = mongoose.connection.db.collection("products");

  const report = [];
  const backup = { at: new Date().toISOString(), batch: BATCH, products: [] };

  for (const id of Object.keys(PACK_SKU).map(Number).sort((a, b) => a - b)) {
    const sku = PACK_SKU[id];
    const mainSrc = path.join(imagesDir, `${padId(id)}-main.png`);
    const fittedSrc = path.join(imagesDir, `${padId(id)}-fitted.png`);
    if (!fs.existsSync(mainSrc) || !fs.existsSync(fittedSrc)) {
      report.push({ id, action: "held", sku, reason: "missing image files" });
      continue;
    }

    const doc = await products.findOne({ articleNo: sku });
    if (!doc) {
      report.push({
        id,
        action: "held_no_match",
        sku,
        reason: "no live product — pack has no price/stock for draft create",
      });
      continue;
    }

    const prevImages = Array.isArray(doc.media?.images) ? [...doc.media.images] : [];
    const primary = prevImages.find((i) => i.isMain) || prevImages[0] || null;
    const mainSha = sha256File(mainSrc);
    const fittedSha = sha256File(fittedSrc);
    const mainName = publicFileName(doc.slug, "main-illust", mainSha);
    const fittedName = publicFileName(doc.slug, "fitted-illust", fittedSha);
    const mainUrl = `/media/products/${mainName}`;
    const fittedUrl = `/media/products/${fittedName}`;
    const hasMain = prevImages.some((i) => String(i.url || "").includes(mainSha.slice(0, 10)));
    const hasFitted = prevImages.some((i) => String(i.url || "").includes(fittedSha.slice(0, 10)));

    backup.products.push({
      _id: String(doc._id),
      articleNo: doc.articleNo,
      slug: doc.slug,
      status: doc.status,
      pricing: doc.pricing,
      inventory: doc.inventory,
      mediaImages: prevImages,
    });

    const mainMeta = await pngMeta(mainSrc);
    const fittedMeta = await pngMeta(fittedSrc);
    const altMain = `${doc.name} — illustrative product set with fitted inset — CrazzyCars.pk`;
    const altFitted = `${doc.name} — illustrative fitted visualisation — CrazzyCars.pk`;

    const toAppend = [];
    if (!hasMain) {
      toAppend.push({
        url: mainUrl,
        publicId: "",
        isMain: false,
        altText: altMain,
        alt: altMain,
        label: "Illustrative catalogue poster (AI) — not verified stock photo",
        imageName: `${doc.slug}-main-illust`,
        width: mainMeta.width,
        height: mainMeta.height,
        mimeType: "image/png",
      });
    }
    if (!hasFitted) {
      toAppend.push({
        url: fittedUrl,
        publicId: "",
        isMain: false,
        altText: altFitted,
        alt: altFitted,
        label: "Illustrative fitted visualisation (AI) — not verified installation",
        imageName: `${doc.slug}-fitted-illust`,
        width: fittedMeta.width,
        height: fittedMeta.height,
        mimeType: "image/png",
      });
    }

    const action =
      toAppend.length === 0 ? "existing_gallery_skip_present" : "existing_gallery_append";

    if (!dryRun && toAppend.length) {
      fs.mkdirSync(mediaProducts, { recursive: true });
      if (!hasMain) {
        const abs = path.join(mediaProducts, mainName);
        if (!fs.existsSync(abs)) fs.copyFileSync(mainSrc, abs);
        await writeDerivatives(abs);
      }
      if (!hasFitted) {
        const abs = path.join(mediaProducts, fittedName);
        if (!fs.existsSync(abs)) fs.copyFileSync(fittedSrc, abs);
        await writeDerivatives(abs);
      }
      const nextImages = [
        ...prevImages.map((img, idx) => ({
          ...img,
          isMain: primary ? String(img.url) === String(primary.url) : idx === 0,
        })),
        ...toAppend,
      ];
      if (!nextImages.some((i) => i.isMain) && nextImages[0]) nextImages[0].isMain = true;

      const tags = Array.from(
        new Set([...(doc.tags || []).map(String), BATCH, IMPORT_TAG, `pack-id:b2-${id}`])
      );
      await products.updateOne(
        { _id: doc._id },
        {
          $set: {
            "media.images": nextImages,
            tags,
            updatedAt: new Date(),
          },
        }
      );
    }

    report.push({
      id,
      action,
      sku: doc.articleNo,
      slug: doc.slug,
      url: `https://crazzycars.pk/${doc.slug}`,
      status: doc.status,
      price_source: "live_preserved",
      sale: doc.pricing?.salePrice ?? null,
      regular: doc.pricing?.regularPrice ?? null,
      stock: doc.inventory?.quantity ?? null,
      primary_retained: primary?.url || null,
      appended: toAppend.map((a) => a.url),
      dims_main: `${mainMeta.width}x${mainMeta.height}`,
      dims_fitted: `${fittedMeta.width}x${fittedMeta.height}`,
      hold_note:
        HOLD_NOTES[id] ||
        "AI illustrations — stock/fitment not verified by these images; primary stock photo retained",
      fitment_verified: false,
      stock_match_verified: false,
    });
  }

  const backupPath = path.join(outDir, `backup-before-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  const reportPath = path.join(outDir, dryRun ? "dry-run-report.json" : "apply-report.json");
  const summary = {
    dryRun,
    batch: BATCH,
    db: LIVE_DB,
    backupPath,
    counts: {
      products_matched: report.filter((r) => r.sku && !String(r.action).startsWith("held")).length,
      gallery_append: report.filter((r) => r.action === "existing_gallery_append").length,
      gallery_skip: report.filter((r) => r.action === "existing_gallery_skip_present").length,
      held: report.filter((r) => String(r.action).startsWith("held")).length,
      published_new: 0,
      drafts_created: 0,
    },
    report,
  };
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.log(
    JSON.stringify(
      { ok: true, dryRun, backupPath, reportPath, counts: summary.counts },
      null,
      2
    )
  );
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * CrazzyCars.pk — Complete Product Photos pack (75 PNGs, 2026-11-23)
 *
 * All 36 catalogue rows match existing live SKUs. Action:
 *   - Append AI main+fitted as supplementary gallery (never steal primary/OG)
 *   - Map category images 37–39 onto existing category docs
 *   - Preserve prices/stock/SKU/slug; no new product records
 *   - Idempotent via sha256 short-hash in media URL
 *
 * Usage (in store/admin container with MONGODB_URI + /app/media):
 *   node import-complete-photos-75.mjs --handoff=/path --media-root=/app/media
 *   node import-complete-photos-75.mjs --handoff=/path --media-root=/app/media --apply
 *   node import-complete-photos-75.mjs ... --apply --update-categories
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

const LIVE_DB = "crazzycars_motorsports";
const BATCH = "CC-PHOTO-75-2026-11-23";
const IMPORT_TAG = "crazzycars-complete-photos-75";

/** Pack ID → live articleNo (identity-matched; IDs 25–29 ≠ replace-list order). */
const PACK_SKU = {
  1: "CC-UNI-142",
  2: "CC-0124",
  3: "CC-0090",
  4: "CC-INT-138",
  5: "CC-LGT-103",
  6: "CC-LGT-105",
  7: "CC-0086",
  8: "CC-0085",
  9: "CC-0083",
  10: "CC-0070",
  11: "CC-0063",
  12: "CC-0059",
  13: "CC-0092",
  14: "CC-0162",
  15: "CC-LGT-102",
  16: "CC-EXT-128",
  17: "CC-EXT-134",
  18: "CC-PRI-MIR-BAT-17",
  19: "CC-LGT-104",
  20: "CC-0091",
  21: "CC-0089",
  22: "CC-EXT-113",
  23: "CC-EXT-116",
  24: "CC-0077",
  25: "CC-0080",
  26: "CC-0072",
  27: "CC-0071",
  28: "CC-0151",
  29: "CC-0075",
  30: "CC-0079",
  31: "CC-SAL-EXT-RFS-RS-19",
  32: "CC-0126",
  33: "CC-0041",
  34: "CC-0054",
  35: "CC-0159",
  36: "CC-0165",
};

const CATEGORY_MAP = {
  37: { slug: "fender-light", file: "37-category.png" },
  38: { slug: "rear-reflectors", file: "38-category.png" },
  39: { slug: "utility", file: "39-category.png" },
};

const HOLD_NOTES = {
  10: "Title/box identity conflict: pack shows front splitter; live listing is Side Splitter ABS — gallery append only; identity still held",
  15: "Fog covers span Corolla pre/facelift; illustration is one bumper only",
  19: "Strobe legality / public-road use unverified",
  21: "PK City year-range vs GM6 illustration conflict — fitment not verified for full range",
  22: "City fog covers span gen change; illustration is 2022 GM6 only",
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
function shortHash(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex").slice(0, 10);
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
    format: meta.format || "png",
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
    console.error("Missing --handoff=/path/to/cc_complete_product_photos_2026_11_23");
    process.exit(2);
  }
  const dryRun = !hasFlag("apply");
  const updateCategories = hasFlag("update-categories");
  const mediaRoot = arg("media-root", process.env.MEDIA_ROOT || "/app/media");
  const mediaProducts = path.join(mediaRoot, "products");
  const mediaCategories = path.join(mediaRoot, "categories");
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

  const catalogue = JSON.parse(fs.readFileSync(path.join(handoff, "catalogue.json"), "utf8"));
  const imagesDir = path.join(handoff, "images");
  const pngCount = fs.readdirSync(imagesDir).filter((f) => f.endsWith(".png")).length;
  if (pngCount !== 75) {
    console.error(`Expected 75 PNGs, found ${pngCount}`);
    process.exit(2);
  }

  await mongoose.connect(uri);
  const products = mongoose.connection.db.collection("products");
  const categories = mongoose.connection.db.collection("categories");

  const report = [];
  const backup = { at: new Date().toISOString(), products: [], categories: [] };

  // --- Products 01–36 ---
  for (let id = 1; id <= 36; id += 1) {
    const sku = PACK_SKU[id];
    const row = catalogue.find((r) => Number(r.id) === id) || {};
    const mainSrc = path.join(imagesDir, `${padId(id)}-main.png`);
    const fittedSrc = path.join(imagesDir, `${padId(id)}-fitted.png`);
    if (!fs.existsSync(mainSrc) || !fs.existsSync(fittedSrc)) {
      report.push({
        id,
        action: "held",
        sku,
        reason: "missing image files",
      });
      continue;
    }

    const doc = await products.findOne({ articleNo: sku });
    if (!doc) {
      report.push({
        id,
        action: "held_no_match",
        sku,
        title: row.title,
        reason: "no live product with this SKU — would create draft but pack has no price/stock",
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

    const altMain = `${doc.name} — illustrative product set with fitted inset — CrazzyCars.pk`;
    const altFitted = `${doc.name} — illustrative fitted visualisation — CrazzyCars.pk`;

    const mainMeta = await pngMeta(mainSrc);
    const fittedMeta = await pngMeta(fittedSrc);

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
      toAppend.length === 0
        ? "existing_gallery_skip_present"
        : "existing_gallery_append";

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
      // Ensure exactly one main
      if (!nextImages.some((i) => i.isMain) && nextImages[0]) nextImages[0].isMain = true;

      const tags = Array.from(
        new Set([...(doc.tags || []).map(String), BATCH, IMPORT_TAG, `pack-id:${id}`])
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
      hold_note: HOLD_NOTES[id] || "AI illustrations — stock/fitment not verified by these images",
      fitment_verified: false,
      stock_match_verified: false,
    });
  }

  // --- Categories 37–39 ---
  for (const [idStr, meta] of Object.entries(CATEGORY_MAP)) {
    const id = Number(idStr);
    const src = path.join(imagesDir, meta.file);
    const cat = await categories.findOne({ slug: meta.slug });
    if (!cat) {
      report.push({ id, action: "held_category_missing", slug: meta.slug });
      continue;
    }
    const sha = sha256File(src);
    const destName = `${meta.slug}-illust-${sha.slice(0, 10)}.png`;
    const destUrl = `/media/categories/${destName}`;
    const prevUrl = cat.image?.url || "";
    backup.categories.push({
      _id: String(cat._id),
      slug: cat.slug,
      name: cat.name,
      image: cat.image || null,
    });

    const already = String(prevUrl).includes(sha.slice(0, 10));
    let action = "category_image_skip_present";
    if (!already && updateCategories) {
      action = dryRun ? "category_image_would_update" : "category_image_updated";
      if (!dryRun) {
        fs.mkdirSync(mediaCategories, { recursive: true });
        const abs = path.join(mediaCategories, destName);
        if (!fs.existsSync(abs)) fs.copyFileSync(src, abs);
        await writeDerivatives(abs);
        await categories.updateOne(
          { _id: cat._id },
          {
            $set: {
              image: {
                url: destUrl,
                publicId: "",
                altText: `${cat.name} — illustrative category collage — CrazzyCars.pk`,
                title: cat.name,
              },
              previousCategoryImageUrl: prevUrl || undefined,
              updatedAt: new Date(),
            },
          }
        );
      }
    } else if (!already && !updateCategories) {
      action = "category_image_ready_pass_update_categories";
    }

    report.push({
      id,
      action,
      type: "category_asset",
      slug: meta.slug,
      url: `https://crazzycars.pk/categories/${meta.slug}`,
      previous_image: prevUrl || null,
      proposed_image: destUrl,
      hold_note: "Category collage only — not a sellable product / not inventory proof",
    });
  }

  const backupPath = path.join(outDir, `backup-before-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  const reportPath = path.join(outDir, dryRun ? "dry-run-report.json" : "apply-report.json");
  const summary = {
    dryRun,
    updateCategories,
    batch: BATCH,
    db: LIVE_DB,
    backupPath,
    counts: {
      products_matched: report.filter((r) => r.sku && r.type !== "category_asset").length,
      gallery_append: report.filter((r) => r.action === "existing_gallery_append").length,
      gallery_skip: report.filter((r) => r.action === "existing_gallery_skip_present").length,
      held: report.filter((r) => String(r.action).startsWith("held")).length,
      category_rows: report.filter((r) => r.type === "category_asset").length,
      published_new: 0,
      drafts_created: 0,
    },
    report,
  };
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ ok: true, dryRun, updateCategories, backupPath, reportPath, counts: summary.counts }, null, 2));

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

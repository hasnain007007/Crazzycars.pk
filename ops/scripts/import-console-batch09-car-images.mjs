#!/usr/bin/env node
/**
 * CrazzyCars Console Batch 09 — image-only car-reference attach.
 * Idempotent: re-run does not duplicate gallery entries or re-upload identical SHA files.
 *
 * Does NOT create products, change prices, stock, or status.
 * Skips car_pairing_pending.json item_ids (no car image / vehicle unconfirmed).
 *
 * Usage (in store container):
 *   node ops/scripts/import-console-batch09-car-images.mjs --handoff=/path --dry-run
 *   node ops/scripts/import-console-batch09-car-images.mjs --handoff=/path --apply --media-root=/app/media
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

const LIVE_DB = "crazzycars_motorsports";
const BATCH = "CC-CONSOLE-09-CAR-IMAGES";

function arg(name, fallback = "") {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}
function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
function shortHash(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex").slice(0, 10);
}
function dbNameFromUri(uri) {
  try {
    const u = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, "http://"));
    return decodeURIComponent((u.pathname || "").replace(/^\//, "").split("/")[0] || "");
  } catch {
    return "";
  }
}
function pngDims(buf) {
  if (buf.length < 24 || buf[0] !== 0x89 || buf[1] !== 0x50) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
function basenameNoExt(p) {
  return path.basename(p, path.extname(p));
}

async function main() {
  const handoff = arg("handoff");
  if (!handoff || !fs.existsSync(handoff)) {
    console.error("Missing --handoff=/path/to/CrazzyCars_Console_Car_Batch_09");
    process.exit(2);
  }
  const dryRun = !hasFlag("apply");
  const mediaRoot = arg("media-root", process.env.MEDIA_ROOT || "/app/media");
  const outDir = arg("out", path.join(handoff, "import-out"));
  fs.mkdirSync(outDir, { recursive: true });

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "";
  if (!uri) {
    console.error("Set MONGODB_URI");
    process.exit(2);
  }
  const dbName = dbNameFromUri(uri);
  if (dbName && dbName !== LIVE_DB) {
    console.error(`REFUSE DB ${dbName}`);
    process.exit(2);
  }

  const additions = JSON.parse(fs.readFileSync(path.join(handoff, "car_image_additions.json"), "utf8"));
  const pending = JSON.parse(fs.readFileSync(path.join(handoff, "car_pairing_pending.json"), "utf8"));
  const pendingIds = new Set(pending.map((p) => p.item_id));
  const catalogue = JSON.parse(fs.readFileSync(path.join(handoff, "product_catalogue.json"), "utf8"));
  const byItem = Object.fromEntries(catalogue.map((c) => [c.item_id, c]));

  // Verify additions only (do not re-touch the 24 product-only masters)
  for (const a of additions) {
    const abs = path.join(handoff, a.filename);
    if (!fs.existsSync(abs)) throw new Error(`missing ${a.filename}`);
    const buf = fs.readFileSync(abs);
    const h = crypto.createHash("sha256").update(buf).digest("hex");
    if (h !== a.sha256) throw new Error(`sha mismatch ${a.filename}`);
    if (buf[0] !== 0x89 || buf[1] !== 0x50) throw new Error(`not png ${a.filename}`);
    const dims = pngDims(buf);
    if (!dims || dims.width !== a.width || dims.height !== a.height) {
      throw new Error(`dims mismatch ${a.filename}`);
    }
    if (a.mime_type !== "image/png") throw new Error(`mime ${a.filename}`);
  }
  console.log(`SHA/MIME/DIMS OK for ${additions.length} car additions`);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (db.databaseName !== LIVE_DB) {
    console.error(`REFUSE connected ${db.databaseName}`);
    process.exit(2);
  }
  const Product = db.collection("products");

  const plan = {
    dry_run: dryRun,
    created_at: new Date().toISOString(),
    batch: BATCH,
    updates: [],
    skipped: [],
    pending: [],
    blocked: [],
    backup: [],
  };

  // Pending rows: confirm product exists, leave media alone
  for (const p of pending) {
    const importKey = `crazzycars-console08:${p.item_id}`;
    const item = byItem[p.item_id];
    const existing =
      (await Product.findOne({ importKey })) ||
      (item ? await Product.findOne({ articleNo: item.proposed_sku }) : null) ||
      (item ? await Product.findOne({ slug: item.slug }) : null);
    plan.pending.push({
      item_id: p.item_id,
      reason: p.reason,
      productId: existing?._id?.toString() || null,
      status: existing?.status || null,
      mediaUrls: (existing?.media?.images || []).map((i) => i.url),
      action: "leave_unchanged_no_car_image",
    });
  }

  for (const a of additions) {
    if (pendingIds.has(a.item_id)) {
      plan.skipped.push({ item_id: a.item_id, reason: "listed_in_pending" });
      continue;
    }
    const item = byItem[a.item_id];
    if (!item) {
      plan.blocked.push({ item_id: a.item_id, reason: "missing_catalogue_row" });
      continue;
    }
    const importKey = `crazzycars-console08:${a.item_id}`;
    const existing =
      (await Product.findOne({ importKey })) ||
      (await Product.findOne({ articleNo: item.proposed_sku })) ||
      (await Product.findOne({ slug: item.slug }));

    if (!existing) {
      plan.blocked.push({
        item_id: a.item_id,
        reason: "product_not_found",
        importKey,
        articleNo: item.proposed_sku,
        slug: item.slug,
      });
      continue;
    }

    const stem = basenameNoExt(a.filename); // descriptive model+product name from pack
    const fileHash = shortHash(a.sha256);
    const destName = `${stem}-${fileHash}.png`;
    const destAbs = path.join(mediaRoot, "products", destName);
    const destUrl = `/media/products/${destName}`;
    const alt = a.alt || `${item.name} beside vehicle reference`;

    const prior = Array.isArray(existing.media?.images) ? existing.media.images.map((x) => ({ ...x })) : [];
    const already = prior.find((img) => {
      const u = String(img.url || "");
      return u === destUrl || u.includes(stem) || String(img.sha256 || "") === a.sha256;
    });

    // Rebuild: car card first as primary; retain prior product-only images; drop prior car duplicates
    const retained = prior.filter((img) => {
      const u = String(img.url || "");
      const lab = String(img.label || "").toLowerCase();
      if (u === destUrl) return false;
      if (u.includes(stem)) return false;
      if (lab.includes("vehicle reference") || lab.includes("product_with_vehicle")) return false;
      if (String(img.sha256 || "") === a.sha256) return false;
      return true;
    });

    const carDoc = {
      url: destUrl,
      publicId: "",
      isMain: true,
      altText: alt,
      alt,
      label: "VEHICLE REFERENCE",
      imageName: `${item.name} — vehicle reference`,
      width: a.width,
      height: a.height,
      sha256: a.sha256,
      role: a.role,
      physicalFitmentVerified: false,
      provenance: a.provenance || "Generated compositing — vehicle reference only",
    };

    const nextImages = [
      carDoc,
      ...retained.map((img, idx) => ({
        ...img,
        isMain: false,
        // keep existing alts; ensure first retained stays labelled as product hero if unlabeled
        label: img.label || (idx === 0 ? "product visualisation" : "product visualisation detail"),
      })),
    ];

    const priceBefore = {
      salePrice: existing.pricing?.salePrice,
      regularPrice: existing.pricing?.regularPrice,
      qty: existing.inventory?.quantity,
      status: existing.status,
    };

    const entry = {
      item_id: a.item_id,
      productId: existing._id.toString(),
      importKey: existing.importKey || importKey,
      articleNo: existing.articleNo,
      slug: existing.slug,
      status: existing.status,
      liveUrl: `https://crazzycars.pk/${existing.slug}`,
      destName,
      destUrl,
      sha256: a.sha256,
      alreadyPresent: Boolean(already),
      fileExistsOnDisk: fs.existsSync(destAbs),
      beforeUrls: prior.map((i) => i.url),
      afterUrls: nextImages.map((i) => i.url),
      priceBefore,
      primaryChanged: prior[0]?.url !== destUrl || !prior[0]?.isMain,
      action: already && prior[0]?.url === destUrl && prior[0]?.isMain ? "noop_idempotent" : "set_car_primary_keep_gallery",
    };

    plan.backup.push({
      _id: existing._id.toString(),
      articleNo: existing.articleNo,
      slug: existing.slug,
      status: existing.status,
      pricing: existing.pricing,
      inventory: existing.inventory,
      media: existing.media,
      metadata: existing.metadata,
    });

    if (entry.action === "noop_idempotent" && entry.fileExistsOnDisk) {
      plan.skipped.push({ ...entry, reason: "already_applied" });
      continue;
    }

    plan.updates.push(entry);
    if (dryRun) continue;

    fs.mkdirSync(path.join(mediaRoot, "products"), { recursive: true });
    const src = path.join(handoff, a.filename);
    if (!fs.existsSync(destAbs)) {
      fs.copyFileSync(src, destAbs);
    }
    if (sha256File(destAbs) !== a.sha256) {
      throw new Error(`post-copy sha fail ${destName}`);
    }

    // Gallery thumbs request -400.webp (see cloudinaryImage.localMediaForWidth).
    // Masters stay untouched PNG; build sibling webp derivatives only.
    try {
      const sharp = (await import("sharp")).default;
      const stem = destAbs.replace(/\.png$/i, "");
      for (const [suf, size, q] of [
        ["-400", 400, 72],
        ["-sm", 200, 70],
        ["-800", 1000, 78],
      ]) {
        const out = `${stem}${suf}.webp`;
        if (fs.existsSync(out)) continue;
        await sharp(destAbs)
          .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
          .webp({ quality: q, effort: 4 })
          .toFile(out);
      }
    } catch (err) {
      console.warn("derivative_build_failed", destName, String(err?.message || err));
    }

    const meta = { ...(existing.metadata || {}) };
    meta.image_batch = "09";
    meta.car_image_sha256 = a.sha256;
    meta.car_image_role = a.role;
    meta.car_physical_fitment_verified = false;
    meta.car_image_batch = BATCH;

    await Product.updateOne(
      { _id: existing._id },
      {
        $set: {
          "media.images": nextImages,
          metadata: meta,
          updatedAt: new Date(),
          // Explicitly do NOT touch pricing, inventory, status, slug, descriptions
        },
      }
    );
  }

  fs.writeFileSync(path.join(outDir, "plan.json"), JSON.stringify(plan, null, 2));
  fs.writeFileSync(path.join(outDir, "backup-products.json"), JSON.stringify(plan.backup, null, 2));
  console.log(
    JSON.stringify(
      {
        dryRun,
        updates: plan.updates.length,
        skipped: plan.skipped.length,
        pending: plan.pending.length,
        blocked: plan.blocked.length,
        outDir,
      },
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

#!/usr/bin/env node
/**
 * CrazzyCars OSRAM V1 Batch 10 R2 — update existing CC-LGT-202 in place.
 * Idempotent key: importKey = crazzycars-osram-v1:CC-LGT-202
 *
 *   node ops/scripts/import-osram-v1-batch10.mjs --handoff=/path --dry-run
 *   node ops/scripts/import-osram-v1-batch10.mjs --handoff=/path --apply --media-root=/app/media
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

const LIVE_DB = "crazzycars_motorsports";
const BATCH = "CC-OSRAM-V1-10-R2";
const TARGET_ID = "6a633a61d40b29d18ad3ce67";
const TARGET_SKU = "CC-LGT-202";
const TARGET_SLUG = "osram-projector-lights-3-colour-premium-quality";
const SALE = 14999;
const REGULAR = 18000;

const FIT_NOTE =
  "Fitting groups are size/mounting references, not a guarantee for every model or year. Confirm fog-lamp size, bracket and connector before ordering. Vehicle images are references, not verified installations.";

const VEHICLE_SLUGS = [
  "honda-civic-x-2016-2021",
  "suzuki-swift-2018-2024",
  "toyota-corolla-e140-2009-2014",
  "toyota-corolla-e170-2014-2026",
  "toyota-yaris-2020-present",
  "honda-city-classic-2009-2020",
];

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
  if (buf.length < 24 || buf[0] !== 0x89) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
function basenameStem(rel) {
  return path.basename(rel, path.extname(rel));
}

async function main() {
  const handoff = arg("handoff");
  if (!handoff || !fs.existsSync(handoff)) {
    console.error("Missing --handoff=/path/to/CrazzyCars_OSRAM_V1_Batch_10_R2");
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

  const update = JSON.parse(fs.readFileSync(path.join(handoff, "product_update.json"), "utf8"));
  const fittings = JSON.parse(fs.readFileSync(path.join(handoff, "fitting_options.json"), "utf8"));
  const manifest = JSON.parse(fs.readFileSync(path.join(handoff, "image_manifest.json"), "utf8"));
  const manByPath = Object.fromEntries(manifest.map((m) => [m.filename, m]));

  for (const m of manifest) {
    const abs = path.join(handoff, m.filename);
    if (!fs.existsSync(abs)) throw new Error(`missing ${m.filename}`);
    const buf = fs.readFileSync(abs);
    const h = crypto.createHash("sha256").update(buf).digest("hex");
    if (h !== m.sha256) throw new Error(`sha mismatch ${m.filename}`);
    if (!pngDims(buf) || pngDims(buf).width !== 1254) throw new Error(`dims ${m.filename}`);
    if (m.contains_price) throw new Error(`price text flagged ${m.filename}`);
    if (m.car_photo_count !== 1) throw new Error(`car count ${m.filename}`);
  }
  console.log(`SHA/MIME OK for ${manifest.length} images (no price, 1 car each)`);

  if (Number(update.sale_price) !== SALE || Number(update.regular_price) !== REGULAR) {
    throw new Error("product_update prices do not match owner 14999/18000");
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (db.databaseName !== LIVE_DB) {
    console.error(`REFUSE connected ${db.databaseName}`);
    process.exit(2);
  }

  const Product = db.collection("products");
  const Category = db.collection("categories");
  const Vehicle = db.collection("vehicles");

  const existing =
    (await Product.findOne({ _id: new mongoose.Types.ObjectId(TARGET_ID) })) ||
    (await Product.findOne({ articleNo: TARGET_SKU })) ||
    (await Product.findOne({ slug: TARGET_SLUG }));

  if (!existing) {
    console.error("Target product not found — refusing to create duplicate without owner match");
    process.exit(2);
  }

  const fog = await Category.findOne({ slug: "fog-lamps-drl-covers" });
  const led = await Category.findOne({ slug: "led-lighting" });
  if (!fog || !led) throw new Error("Missing fog/led categories");

  const vehicles = [];
  for (const slug of VEHICLE_SLUGS) {
    const v = await Vehicle.findOne({ slug });
    if (!v) throw new Error(`Missing vehicle ${slug}`);
    vehicles.push(v);
  }

  // Stage media files
  const mediaImages = [];
  const stagedFiles = [];
  for (let i = 0; i < (update.gallery_images || []).length; i++) {
    const rel = update.gallery_images[i];
    const man = manByPath[rel];
    if (!man) throw new Error(`manifest missing ${rel}`);
    const stem = basenameStem(rel);
    const destName = `${stem}-${shortHash(man.sha256)}.png`;
    const destAbs = path.join(mediaRoot, "products", destName);
    const destUrl = `/media/products/${destName}`;
    stagedFiles.push({ rel, destAbs, destName, destUrl, man });
    mediaImages.push({
      url: destUrl,
      publicId: "",
      isMain: i === 0,
      altText: man.alt,
      alt: man.alt,
      label: man.fitting_key ? `fitting:${man.fitting_key}` : man.role || "",
      imageName: stem,
      width: 1254,
      height: 1254,
      sha256: man.sha256,
      batch: BATCH,
      role: man.role,
      fittingKey: man.fitting_key || null,
      physicalFitmentVerified: false,
    });
  }

  const urlByRel = Object.fromEntries(stagedFiles.map((s) => [s.rel, s.destUrl]));

  const fittingLabels = fittings.map((f) => f.label);
  const comboSku = {
    "honda-suzuki-3": `${TARGET_SKU}-HS3`,
    "toyota-3": `${TARGET_SKU}-T3`,
    "toyota-yaris-2": `${TARGET_SKU}-Y2`,
    "honda-city-2009-2020-2": `${TARGET_SKU}-HC2`,
  };

  // Shared pool: parent qty preserved; combo.stock mirrored for admin UI only
  const sharedQty = Number(existing.inventory?.quantity);
  const parentQty = Number.isFinite(sharedQty) ? sharedQty : 10;

  const variationCombinations = fittings.map((f) => ({
    options: [{ name: "Fitting", value: f.label }],
    priceDelta: 0,
    weightDelta: 0,
    price: SALE,
    compareAtPrice: REGULAR,
    weight: Number(existing.inventory?.weight) || 1,
    stock: parentQty, // display mirror; sharedFittingInventory uses parent pool
    sku: comboSku[f.key],
    image: urlByRel[f.image] || "",
  }));

  // Preserve prior simpleVariation axes structure if present; enable Fitting
  const priorSimple = Array.isArray(existing.simpleVariations) ? existing.simpleVariations : [];
  const axisNames = ["Fitting", "Pack", "Quality", "size", "colour", "Splitter", "Side Skirts", "Back Lip"];
  const simpleVariations = axisNames.map((name) => {
    const prev = priorSimple.find((v) => v.name === name);
    if (name === "Fitting") {
      return {
        name: "Fitting",
        enabled: true,
        tags: fittingLabels,
        ...(prev?._id ? { _id: prev._id } : {}),
      };
    }
    return {
      name,
      enabled: false,
      tags: [],
      ...(prev?._id ? { _id: prev._id } : {}),
    };
  });

  const compatibleCars = vehicles.map((v) => ({
    make: v.make,
    model: v.model,
    generation: v.displayName || "",
    generationId: v._id,
    generationLabel: v.displayName || "",
    yearFrom: v.yearFrom,
    yearTo: v.yearTo,
  }));

  const vehicleCompatibility = {
    // The fitting groups are the cars it fits, so "specific"; "semi-universal" would list
    // them as exceptions (cars it does NOT fit) on the product page.
    fitmentType: "specific",
    universalNote: FIT_NOTE,
    vehicles: vehicles.map((v) => ({
      make: v.make,
      model: v.model,
      generationId: v._id,
      generationLabel: v.displayName || "",
      yearFrom: v.yearFrom,
      yearTo: v.yearTo,
      bodyStyle: "All",
      notes: FIT_NOTE,
    })),
    categories: [],
  };

  const tags = Array.from(
    new Set([...(update.tags || []), BATCH, "osram v1", "fog light projectors", "yellow white warm"].filter(Boolean))
  ).filter((t) => !/indicator/i.test(t));

  const specs = [
    { label: "Product", value: "OSRAM V1 fog light projectors" },
    { label: "Light colours", value: "Yellow / White / Warm" },
    { label: "Beam functions", value: "Low / High" },
    { label: "Warranty", value: "6 months, seller-provided (CrazzyCars.pk)" },
    { label: "Fitting options", value: fittingLabels.join("; ") },
    { label: "Listing code", value: TARGET_SKU },
    { label: "Condition", value: "New" },
  ];

  const setDoc = {
    name: update.name,
    slug: TARGET_SLUG, // keep established URL
    articleNo: TARGET_SKU,
    importKey: `crazzycars-osram-v1:${TARGET_SKU}`,
    shortDescription: update.short_description,
    longDescription: update.description_html,
    features: update.features || [],
    specifications: specs,
    pricing: {
      regularPrice: REGULAR,
      salePrice: SALE,
      costPerItem: Number(existing.pricing?.costPerItem) || 0,
      saleSchedule: { enabled: false },
    },
    inventory: {
      quantity: parentQty,
      trackInventory: true,
      allowBackorder: false,
      lowStockThreshold: Number(existing.inventory?.lowStockThreshold) || 3,
      weight: Number(existing.inventory?.weight) || 1,
      weightUnit: existing.inventory?.weightUnit || "kg",
      sku: TARGET_SKU,
    },
    sharedFittingInventory: true,
    simpleVariations,
    variationCombinations,
    categories: [led._id, fog._id],
    primaryCategorySlug: "fog-lamps-drl-covers",
    tags,
    isUniversal: false,
    compatibleVehicles: vehicles.map((v) => v._id),
    compatibleCars,
    vehicleCompatibility,
    metaTitle: update.meta_title,
    metaDescription: update.meta_description,
    seo: {
      metaTitle: update.meta_title,
      metaDescription: update.meta_description,
      metaKeywords: tags.slice(0, 12),
      excludeFromMerchantFeed: false,
      excludeFromSitemap: false,
      excludeFromListings: false,
      robots: "",
      omitProductSchemaImage: false,
    },
    status: "active",
    securityHold: false,
    securityHoldReason: "",
    vendor: "CrazzyCars.pk",
    condition: "new",
    segment: "car",
    media: { images: mediaImages, videos: existing.media?.videos || [] },
    metadata: {
      batch_id: BATCH,
      image_batch: "10-R2",
      product_label: "OSRAM V1",
      warranty_months: 6,
      warranty_provider: "CrazzyCars.pk (seller)",
      light_colours: ["Yellow", "White", "Warm"],
      beam_functions: ["Low", "High"],
      package_sales_unit: null,
      package_quantity: null,
      sharedFittingInventory: true,
      sharedFittingStock: parentQty,
      pending: [
        "Exact bracket-to-SKU / connector mapping per fitting",
        "Confirm selling unit / box contents (pair vs single) from supplier",
        "Per-fitting stock split unknown — using shared parent pool of " + parentQty,
      ],
    },
    updatedAt: new Date(),
  };

  const plan = {
    dry_run: dryRun,
    created_at: new Date().toISOString(),
    action: "update_existing_in_place",
    productId: String(existing._id),
    articleNo: TARGET_SKU,
    slug: TARGET_SLUG,
    liveUrl: `https://crazzycars.pk/${TARGET_SLUG}`,
    before: {
      name: existing.name,
      pricing: existing.pricing,
      inventory: existing.inventory,
      media: (existing.media?.images || []).map((i) => i.url),
      categories: (existing.categories || []).map(String),
      tags: existing.tags,
    },
    after: {
      sale: SALE,
      regular: REGULAR,
      qty: parentQty,
      fittings: fittingLabels,
      media: mediaImages.map((i) => i.url),
      sharedFittingInventory: true,
      allowBackorder: false,
    },
    stagedFiles: stagedFiles.map((s) => s.destName),
  };

  fs.writeFileSync(path.join(outDir, "plan.json"), JSON.stringify(plan, null, 2));
  fs.writeFileSync(
    path.join(outDir, "backup-product.json"),
    JSON.stringify(
      {
        _id: String(existing._id),
        name: existing.name,
        slug: existing.slug,
        articleNo: existing.articleNo,
        pricing: existing.pricing,
        inventory: existing.inventory,
        media: existing.media,
        categories: existing.categories,
        tags: existing.tags,
        shortDescription: existing.shortDescription,
        longDescription: existing.longDescription,
        seo: existing.seo,
        metaTitle: existing.metaTitle,
        metaDescription: existing.metaDescription,
        compatibleCars: existing.compatibleCars,
        compatibleVehicles: existing.compatibleVehicles,
        vehicleCompatibility: existing.vehicleCompatibility,
        simpleVariations: existing.simpleVariations,
        variationCombinations: existing.variationCombinations,
        specifications: existing.specifications,
        features: existing.features,
      },
      null,
      2
    )
  );

  console.log(JSON.stringify({ dryRun, productId: plan.productId, sale: SALE, regular: REGULAR, qty: parentQty, images: mediaImages.length, fittings: fittings.length }, null, 2));

  if (dryRun) {
    await mongoose.disconnect();
    return;
  }

  fs.mkdirSync(path.join(mediaRoot, "products"), { recursive: true });
  for (const s of stagedFiles) {
    const src = path.join(handoff, s.rel);
    if (!fs.existsSync(s.destAbs)) {
      fs.copyFileSync(src, s.destAbs);
    }
    if (sha256File(s.destAbs) !== s.man.sha256) throw new Error(`post-copy sha ${s.destName}`);
    // Build gallery thumb derivatives (master PNG untouched)
    try {
      const sharp = (await import("sharp")).default;
      const stem = s.destAbs.replace(/\.png$/i, "");
      for (const [suf, size, q] of [
        ["-400", 400, 72],
        ["-sm", 200, 70],
        ["-800", 1000, 78],
      ]) {
        const out = `${stem}${suf}.webp`;
        if (fs.existsSync(out)) continue;
        await sharp(s.destAbs)
          .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
          .webp({ quality: q, effort: 4 })
          .toFile(out);
      }
    } catch (err) {
      console.warn("derivative_failed", s.destName, String(err?.message || err));
    }
  }

  await Product.updateOne({ _id: existing._id }, { $set: setDoc });
  console.log("updated", String(existing._id));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * CrazzyCars Welcome Door Logo Lights — Batch 11
 * Updates existing articleNo 11 / slug car-door-welcome-logo-lights in place.
 *
 *   node ops/scripts/import-welcome-lights-batch11.mjs --handoff=/path --dry-run
 *   node ops/scripts/import-welcome-lights-batch11.mjs --handoff=/path --apply --media-root=/app/media
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

const LIVE_DB = "crazzycars_motorsports";
const BATCH = "CC-WELCOME-11";
const TARGET_ID = "6a9c51661531ae6a3f8e9c0d";
const TARGET_SKU = "11";
const TARGET_SLUG = "car-door-welcome-logo-lights";

/**
 * Prefer dual cards when both direct+dual exist for the same logo.
 * Store option labels stay Title Case to match the existing selector.
 */
const OPTION_IMAGE_MAP = {
  // Existing options → preferred Batch 11 asset
  Civic: "15-universal-civic",
  RS: "16-universal-rs",
  Honda: "13-universal-honda",
  Toyota: "11-dual-toyota",
  Grande: "26-universal-grande",
  "Altis Corolla": "28-universal-altis-corolla",
  Suzuki: "14-universal-suzuki",
  Swift: "23-universal-swift",
  Fortuner: "06-direct-fortuner",
  GR: "07-direct-gr",
  Haval: "17-universal-haval",
  Hyundai: "22-universal-hyundai",
  KIA: "19-universal-kia",
  "Mark X": "08-dual-mark-x",
  // New owner-listed options
  Prius: "10-dual-prius",
  Crown: "09-dual-crown",
  "Land Cruiser": "04-direct-land-cruiser",
  Prado: "05-direct-prado",
  "Oshan X7": "18-universal-oshan-x7",
  "N Line": "20-universal-n-line",
  JAECOO: "21-universal-jaecoo",
  Alto: "24-universal-alto",
  Yaris: "25-universal-yaris",
  "Altis X": "27-universal-altis-x",
  "Honda Accord": "29-universal-honda-accord",
};

/** Options with no Batch 11 card — keep prior combo image/price/stock. */
const PRESERVE_WITHOUT_NEW_IMAGE = new Set(["City", "Kia New", "BMW", "Audi", "Mercedes"]);

const FIT_NOTE =
  "Choose the logo that matches your projection design. Direct-fit housings and universal retrofit lights are different hardware — confirm mounting, connector and the actual projected emblem before ordering. Images are projection visualisations, not verified installations.";

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
function pngOk(buf, wWant, hWant) {
  if (buf.length < 24 || buf[0] !== 0x89) return false;
  return buf.readUInt32BE(16) === wWant && buf.readUInt32BE(20) === hWant;
}
function skuSlug(label) {
  return String(label)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
function absMediaUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  // Undo accidental /media/products/https://… prefix from an earlier bad normalize
  const unprefixed = s.replace(/^\/media\/products\/(https?:\/\/)/i, "$1");
  if (/^https?:\/\//i.test(unprefixed)) {
    // Keep external CDN URLs (legacy Shopify) intact; local media hosts → pathname only
    if (unprefixed.includes("/media/")) {
      try {
        return new URL(unprefixed).pathname.split("?")[0];
      } catch {
        return unprefixed.split("?")[0];
      }
    }
    return unprefixed.split("?")[0];
  }
  if (unprefixed.startsWith("/media/")) return unprefixed.split("?")[0];
  // Legacy Shopify-ish bare filenames — treat as unusable for local media
  if (!unprefixed.includes("/")) return "";
  return unprefixed.startsWith("/")
    ? unprefixed.split("?")[0]
    : `/media/products/${unprefixed.split("?")[0]}`;
}

async function main() {
  const handoff = arg("handoff");
  if (!handoff || !fs.existsSync(handoff)) {
    console.error("Missing --handoff=/path/to/CrazzyCars_Welcome_Lights_Batch_11");
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
  if (dbNameFromUri(uri) && dbNameFromUri(uri) !== LIVE_DB) {
    console.error(`REFUSE DB ${dbNameFromUri(uri)}`);
    process.exit(2);
  }

  const draft = JSON.parse(fs.readFileSync(path.join(handoff, "catalogue_draft.json"), "utf8"));
  const byAsset = Object.fromEntries(draft.map((d) => [d.asset_id, d]));

  for (const d of draft) {
    const abs = path.join(handoff, d.image);
    if (!fs.existsSync(abs)) throw new Error(`missing ${d.image}`);
    const buf = fs.readFileSync(abs);
    const h = crypto.createHash("sha256").update(buf).digest("hex");
    if (h !== d.sha256) throw new Error(`sha mismatch ${d.asset_id}`);
    if (!pngOk(buf, 1254, 1254)) throw new Error(`dims ${d.asset_id}`);
    if (d.has_price_text) throw new Error(`price on image ${d.asset_id}`);
    if (d.car_photo_count !== 1) throw new Error(`cars ${d.asset_id}`);
  }
  console.log(`SHA OK for ${draft.length} images`);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (db.databaseName !== LIVE_DB) {
    console.error(`REFUSE connected ${db.databaseName}`);
    process.exit(2);
  }
  const Product = db.collection("products");

  const existing =
    (await Product.findOne({ _id: new mongoose.Types.ObjectId(TARGET_ID) })) ||
    (await Product.findOne({ articleNo: TARGET_SKU })) ||
    (await Product.findOne({ slug: TARGET_SLUG }));
  if (!existing) {
    console.error("Target welcome-lights product not found");
    process.exit(2);
  }

  const sale = Number(existing.pricing?.salePrice);
  const regular = Number(existing.pricing?.regularPrice);
  if (!Number.isFinite(sale) || sale <= 0 || !Number.isFinite(regular) || regular <= 0) {
    throw new Error("Refuse: existing product has no verified price to preserve");
  }
  const parentQty = Number(existing.inventory?.quantity);
  if (!Number.isFinite(parentQty) || parentQty < 0) {
    throw new Error("Refuse: existing product has no verified stock to preserve");
  }

  // Stage only assets used by OPTION_IMAGE_MAP (dedupe)
  const usedAssetIds = [...new Set(Object.values(OPTION_IMAGE_MAP))];
  const staged = {};
  const mediaRootProducts = path.join(mediaRoot, "products");
  for (const assetId of usedAssetIds) {
    const d = byAsset[assetId];
    if (!d) throw new Error(`draft missing ${assetId}`);
    const destName = `${assetId}-${shortHash(d.sha256)}.png`;
    const destAbs = path.join(mediaRootProducts, destName);
    const destUrl = `/media/products/${destName}`;
    staged[assetId] = { d, destName, destAbs, destUrl };
  }

  const priorCombos = Array.isArray(existing.variationCombinations) ? existing.variationCombinations : [];
  const priorByValue = Object.fromEntries(
    priorCombos.map((c) => {
      const v = (c.options || []).find((o) => o.name === "Select Your Logo")?.value;
      return [v, c];
    }).filter(([v]) => v)
  );

  const logoAxis = (existing.simpleVariations || []).find((v) => v.name === "Select Your Logo");
  const priorTags = Array.isArray(logoAxis?.tags) ? [...logoAxis.tags] : [];

  // Preserve existing order; append new options
  const newTags = Object.keys(OPTION_IMAGE_MAP).filter((t) => !priorTags.includes(t));
  const preservedOrphans = priorTags.filter(
    (t) => PRESERVE_WITHOUT_NEW_IMAGE.has(t) || OPTION_IMAGE_MAP[t] || priorByValue[t]
  );
  // Keep all prior tags (including City/BMW etc.), then append brand-new ones
  const finalTags = [...priorTags];
  for (const t of newTags) {
    if (!finalTags.includes(t)) finalTags.push(t);
  }

  const defaultSale = sale;
  const defaultRegular = regular;

  const variationCombinations = [];
  const mapped = [];
  const pending = [];
  const preserved = [];

  for (const label of finalTags) {
    const prior = priorByValue[label];
    const assetId = OPTION_IMAGE_MAP[label];
    const priorPrice = Number(prior?.price);
    const priorCompare = Number(prior?.compareAtPrice);
    const comboSale = Number.isFinite(priorPrice) && priorPrice > 0 ? priorPrice : defaultSale;
    const comboRegular =
      Number.isFinite(priorCompare) && priorCompare > 0 ? priorCompare : defaultRegular;

    if (assetId) {
      const st = staged[assetId];
      variationCombinations.push({
        options: [{ name: "Select Your Logo", value: label }],
        priceDelta: 0,
        weightDelta: 0,
        price: comboSale,
        compareAtPrice: comboRegular,
        weight: 0,
        stock: parentQty, // display mirror; sharedFittingInventory uses parent pool
        sku: prior?.sku || `DOOR-LIGHT-${skuSlug(label)}`,
        image: st.destUrl,
        ...(prior?._id ? { _id: prior._id } : {}),
      });
      mapped.push({ label, assetId, image: st.destUrl, price: comboSale });
    } else if (prior) {
      // Keep prior image if it is a usable /media path; otherwise leave blank label only
      const kept = absMediaUrl(prior.image);
      variationCombinations.push({
        options: [{ name: "Select Your Logo", value: label }],
        priceDelta: Number(prior.priceDelta) || 0,
        weightDelta: Number(prior.weightDelta) || 0,
        price: comboSale,
        compareAtPrice: comboRegular,
        weight: Number(prior.weight) || 0,
        stock: parentQty,
        sku: prior.sku || `DOOR-LIGHT-${skuSlug(label)}`,
        image: kept || String(prior.image || ""),
        ...(prior._id ? { _id: prior._id } : {}),
      });
      preserved.push({ label, image: kept || prior.image, reason: "no_batch11_card" });
      if (!kept) {
        pending.push({
          label,
          reason: "No Batch 11 card; legacy image path may be broken — needs replacement photo",
        });
      }
    } else {
      pending.push({ label, reason: "option listed without prior combo or Batch 11 map" });
    }
  }

  // Build gallery: primary = Toyota dual; then other staged cards (unique); keep original hardware photo
  const galleryOrder = [
    "11-dual-toyota",
    ...usedAssetIds.filter((id) => id !== "11-dual-toyota"),
  ];
  // Also stage unused direct/universal siblings for gallery depth (not as options)
  const extraGallery = ["01-direct-prius", "02-direct-crown", "03-direct-mark-x", "12-universal-toyota"].filter(
    (id) => byAsset[id] && !staged[id]
  );
  for (const assetId of extraGallery) {
    const d = byAsset[assetId];
    const destName = `${assetId}-${shortHash(d.sha256)}.png`;
    staged[assetId] = {
      d,
      destName,
      destAbs: path.join(mediaRootProducts, destName),
      destUrl: `/media/products/${destName}`,
      galleryOnly: true,
    };
    galleryOrder.push(assetId);
  }

  const mediaImages = [];
  for (let i = 0; i < galleryOrder.length; i++) {
    const assetId = galleryOrder[i];
    const st = staged[assetId];
    const d = st.d;
    mediaImages.push({
      url: st.destUrl,
      publicId: "",
      isMain: i === 0,
      altText: d.alt,
      alt: d.alt,
      label: `logo:${Object.entries(OPTION_IMAGE_MAP).find(([, a]) => a === assetId)?.[0] || d.option}`,
      imageName: d.asset_id,
      width: 1254,
      height: 1254,
      sha256: d.sha256,
      batch: BATCH,
      assetGroup: d.asset_group,
      visibleProjection: d.visible_projection,
      isVerifiedInstallation: false,
    });
  }

  // Keep original product hardware / glow reference if present
  const priorMedia = Array.isArray(existing.media?.images) ? existing.media.images : [];
  const hardwareKeep = priorMedia.find((im) =>
    String(im.url || "").includes("car-door-welcome-logo-lights-1-")
  );
  if (hardwareKeep?.url) {
    mediaImages.push({
      ...hardwareKeep,
      isMain: false,
      label: hardwareKeep.label || "product reference",
      altText: hardwareKeep.altText || hardwareKeep.alt || "Car door welcome logo light product reference",
      alt: hardwareKeep.alt || hardwareKeep.altText || "Car door welcome logo light product reference",
    });
  }
  // Explicitly drop gallery-handoff DEMO
  // (not re-added)

  const simpleVariations = (existing.simpleVariations || []).map((v) => {
    if (v.name === "Select Your Logo") {
      return { ...v, enabled: true, tags: finalTags };
    }
    return v;
  });
  if (!simpleVariations.some((v) => v.name === "Select Your Logo")) {
    simpleVariations.unshift({ name: "Select Your Logo", enabled: true, tags: finalTags });
  }

  const shortDescription =
    "Car door welcome logo lights with selectable projection designs including dual-logo options (brand emblem and car name together). Choose your logo, confirm fitting, and shop at CrazzyCars.pk.";

  const longDescription = `<p data-cc-aeo="1">Car door welcome logo lights project a logo onto the ground when the door opens. Select the logo that matches the design you want. Images on this page are projection visualisations — confirm the actual logo slide and mounting on your car before ordering.</p>
<h2>Dual / double logo meaning</h2>
<p>Dual logo means the brand emblem and the car name are projected <strong>together</strong> (for example the Toyota emblem with PRIUS underneath). It does <strong>not</strong> mean switching, flashing, alternating beams, RGB modes or two separate lights.</p>
<h2>Logo choices</h2>
<p>Use the logo selector for brands and badges such as Toyota, Honda, Suzuki, Civic, RS, Haval, Oshan X7, Kia, N Line, JAECOO, Hyundai, Swift, Alto, Yaris, Grande, Altis X, Altis Corolla, Honda Accord, Fortuner, Mark X, Prius, Crown, Land Cruiser, Prado and GR. GR, RS and N Line are projection/badge options, not standalone vehicle models.</p>
<h2>Fitting notes</h2>
<p>${FIT_NOTE}</p>
<h2>Why buy from CrazzyCars.pk?</h2>
<p>Compare the projection close-up and vehicle-reference images before choosing your logo. Ask CrazzyCars.pk on WhatsApp if you need help matching the design to your car. Visit crazzycars.pk for other matching car accessories.</p>`;

  const tags = Array.from(
    new Set([
      ...(existing.tags || []).filter((t) => !/ambient light price/i.test(t)),
      "welcome door logo light",
      "door projector light",
      "dual logo welcome light",
      "car door light Pakistan",
      "crazzycars.pk",
      BATCH,
      ...finalTags.map((t) => t.toLowerCase()),
    ])
  );

  const metaTitle = "Car Door Welcome Logo Lights | CrazzyCars.pk";
  const metaDescription =
    "Shop car door welcome logo lights with selectable logos including dual-logo projections (emblem + name together). Confirm fitting at CrazzyCars.pk.";

  const setDoc = {
    name: "Car Door Welcome Logo Lights – Bright LED Projection",
    slug: TARGET_SLUG,
    articleNo: TARGET_SKU,
    importKey: `crazzycars-welcome11:${TARGET_SKU}`,
    shortDescription,
    longDescription,
    features: [
      "Selectable logo projections",
      "Dual logo = brand emblem and car name together (not switching/flashing)",
      "Projection visualisations with logo close-up",
      "Confirm mounting and connector before ordering",
    ],
    specifications: [
      { label: "Product", value: "Car door welcome logo lights" },
      { label: "Dual logo", value: "Brand emblem + car name projected together" },
      { label: "Selection", value: "Select Your Logo" },
      { label: "Listing code", value: TARGET_SKU },
      { label: "Condition", value: "New" },
    ],
    // Preserve verified pricing + inventory
    pricing: {
      regularPrice: regular,
      salePrice: sale,
      costPerItem: Number(existing.pricing?.costPerItem) || 0,
      saleSchedule: existing.pricing?.saleSchedule || { enabled: false },
    },
    inventory: {
      quantity: parentQty,
      trackInventory: true,
      allowBackorder: false,
      lowStockThreshold: Number(existing.inventory?.lowStockThreshold) || 5,
      weight: Number(existing.inventory?.weight) || 0,
      weightUnit: existing.inventory?.weightUnit || "g",
      sku: existing.inventory?.sku || "DOOR-LIGHT",
    },
    sharedFittingInventory: true,
    simpleVariations,
    variationCombinations,
    media: { images: mediaImages, videos: existing.media?.videos || [] },
    tags,
    isUniversal: true,
    vehicleCompatibility: {
      fitmentType: "universal",
      universalNote: FIT_NOTE,
      vehicles: [],
      categories: [],
    },
    metaTitle,
    metaDescription,
    seo: {
      metaTitle,
      metaDescription,
      metaKeywords: tags.slice(0, 12),
      excludeFromMerchantFeed: false,
      excludeFromSitemap: false,
      excludeFromListings: false,
      robots: "",
      omitProductSchemaImage: false,
    },
    primaryCategorySlug: "interior-lights",
    status: "active",
    securityHold: false,
    vendor: existing.vendor || "CrazzyCars.pk",
    condition: "new",
    segment: "car",
    metadata: {
      batch_id: BATCH,
      dual_logo_definition: "Brand emblem and car name projected together — not switching/flashing",
      sharedFittingInventory: true,
      sharedFittingStock: parentQty,
      superseded_demo_gallery: "car-door-welcome-logo-lights-gallery-handoff-ec04a93577ea.webp",
      pending,
      mapped_count: mapped.length,
      preserved_without_new_image: preserved.map((p) => p.label),
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
    preserved_price: { sale, regular },
    preserved_qty: parentQty,
    mapped,
    preserved,
    pending,
    final_logo_tags: finalTags,
    gallery_count: mediaImages.length,
    staged: Object.values(staged).map((s) => s.destName),
  };

  fs.writeFileSync(path.join(outDir, "plan.json"), JSON.stringify(plan, null, 2));
  fs.writeFileSync(
    path.join(outDir, "backup-product.json"),
    JSON.stringify(
      {
        _id: String(existing._id),
        name: existing.name,
        pricing: existing.pricing,
        inventory: existing.inventory,
        media: existing.media,
        simpleVariations: existing.simpleVariations,
        variationCombinations: existing.variationCombinations,
        shortDescription: existing.shortDescription,
        longDescription: existing.longDescription,
        seo: existing.seo,
        tags: existing.tags,
        vehicleCompatibility: existing.vehicleCompatibility,
      },
      null,
      2
    )
  );

  console.log(
    JSON.stringify(
      {
        dryRun,
        productId: plan.productId,
        sale,
        regular,
        qty: parentQty,
        mapped: mapped.length,
        preserved: preserved.length,
        pending: pending.length,
        logos: finalTags.length,
        gallery: mediaImages.length,
      },
      null,
      2
    )
  );

  if (dryRun) {
    await mongoose.disconnect();
    return;
  }

  fs.mkdirSync(mediaRootProducts, { recursive: true });
  for (const st of Object.values(staged)) {
    const src = path.join(handoff, st.d.image);
    if (!fs.existsSync(st.destAbs)) fs.copyFileSync(src, st.destAbs);
    if (sha256File(st.destAbs) !== st.d.sha256) throw new Error(`post-copy sha ${st.destName}`);
    try {
      const sharp = (await import("sharp")).default;
      const stem = st.destAbs.replace(/\.png$/i, "");
      for (const [suf, size, q] of [
        ["-400", 400, 72],
        ["-sm", 200, 70],
        ["-800", 1000, 78],
      ]) {
        const out = `${stem}${suf}.webp`;
        if (fs.existsSync(out)) continue;
        await sharp(st.destAbs)
          .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
          .webp({ quality: q, effort: 4 })
          .toFile(out);
      }
    } catch (err) {
      console.warn("derivative_failed", st.destName, String(err?.message || err));
    }
  }

  // Preserve categories on the existing doc (do not strip)
  if (Array.isArray(existing.categories) && existing.categories.length) {
    setDoc.categories = existing.categories;
  }

  await Product.updateOne({ _id: existing._id }, { $set: setDoc });
  console.log("updated", String(existing._id));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

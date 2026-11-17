#!/usr/bin/env node
/**
 * Idempotent CrazzyCars Product Handoff R3 importer.
 *
 * Stable key: importKey = crazzycars-r3:<vehicle_key>:<style_key>
 *
 * Usage (inside store container or with MONGODB_URI):
 *   node ops/scripts/import-handoff-r3.mjs --handof=/path/to/CrazzyCars_Product_Handoff_R3 --dry-run
 *   node ops/scripts/import-handoff-r3.mjs --handof=... --apply --media-root=/app/media
 *
 * Refuses non-crazzycars_motorsports DB names. Does not invent prices/stock —
 * copies current parent pricing and links inventorySourceProductId.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

const LIVE_DB = "crazzycars_motorsports";
const FITMENT_NOTE =
  "Universal accessory shown in a fitment visualisation. Confirm dimensions and mounting suitability before ordering.";

const VEHICLE_MAP = {
  "city-2021": {
    slug: "honda-city-2021-present",
    make: "Honda",
    model: "City",
    generationLabel: "Honda City (2021–Present)",
    yearFrom: 2021,
    yearTo: null,
  },
  "city-gm": {
    slug: "honda-city-classic-2009-2020",
    make: "Honda",
    model: "City",
    generationLabel: "Honda City Classic (2009–2020)",
    yearFrom: 2009,
    yearTo: 2020,
  },
  "civic-reborn": {
    slug: "honda-civic-reborn-2006-2012",
    make: "Honda",
    model: "Civic",
    generationLabel: "Honda Civic Reborn (2006–2012)",
    yearFrom: 2006,
    yearTo: 2012,
  },
  "civic-rebirth": {
    slug: "honda-civic-rebirth-2012-2016",
    make: "Honda",
    model: "Civic",
    generationLabel: "Honda Civic Rebirth (2012–2016)",
    yearFrom: 2012,
    yearTo: 2016,
  },
  "civic-x": {
    slug: "honda-civic-x-2016-2021",
    make: "Honda",
    model: "Civic",
    generationLabel: "Honda Civic X (2016–2021)",
    yearFrom: 2016,
    yearTo: 2021,
  },
};

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
  return crypto.createHash("sha256").update(String(s)).digest("hex").slice(0, 8);
}

function dbNameFromUri(uri) {
  try {
    const u = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, "http://"));
    return decodeURIComponent((u.pathname || "").replace(/^\//, "").split("/")[0] || "");
  } catch {
    return "";
  }
}

function whyBuyHtml() {
  return `<h2>Why buy from CrazzyCars.pk?</h2>
<p>CrazzyCars.pk is a Gujranwala car accessories shop. This listing shows a clear fitment visualisation for the pictured generation plus a loose-product view so you can compare the style. WhatsApp 03284010007 with your make, model and year if you want help confirming the right accessory before you order. Cash on Delivery is available on eligible items. Delivery charges follow the current store shipping policy (bulky exterior pieces use the bulky delivery floor).</p>`;
}

function buildLongDescription(draft, parent) {
  const title = draft.proposed_title;
  const short = draft.short_description || "";
  const draftHtml = String(draft.description_html_draft || "").trim();
  const material =
    draft.specifications_draft?.material ||
    (/\bABS\b/i.test(String(parent?.longDescription || "")) ? "ABS plastic" : null);
  const pieces = draft.specifications_draft?.candidate_piece_count;
  const finish = draft.specifications_draft?.pictured_colour_finish;
  const accessory = draft.specifications_draft?.accessory_type || "";

  const bits = [];
  bits.push(`<p data-cc-aeo="1">${escapeHtml(short)}</p>`);
  if (draftHtml) {
    // Prefer handoff draft body but strip any invented commercial claims later if needed.
    bits.push(draftHtml);
  } else {
    bits.push(`<p>Explore the ${escapeHtml(accessory || title)} illustrated for ${escapeHtml(draft.generation)} ${escapeHtml(draft.year_range)}.</p>`);
  }
  bits.push(`<h2>Product and fitment</h2><p>${escapeHtml(FITMENT_NOTE)}</p>`);
  bits.push("<h2>Verified details</h2><ul>");
  if (finish) bits.push(`<li>Pictured finish: ${escapeHtml(finish)}</li>`);
  if (material) bits.push(`<li>Material (from physical parent listing): ${escapeHtml(material)}</li>`);
  if (pieces) bits.push(`<li>Piece count (kit): ${escapeHtml(String(pieces))}</li>`);
  bits.push(`<li>Physical stock source: ${escapeHtml(parent.articleNo)} — ${escapeHtml(parent.name)}</li>`);
  bits.push("</ul>");
  bits.push(whyBuyHtml());
  return bits.join("\n");
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSpecs(draft, parent) {
  const rows = [];
  const finish = draft.specifications_draft?.pictured_colour_finish;
  const pieces = draft.specifications_draft?.candidate_piece_count;
  const accessory = draft.specifications_draft?.accessory_type;
  const material =
    draft.specifications_draft?.material ||
    (/\bABS\b/i.test(String(parent?.longDescription || parent?.name || "")) ? "ABS plastic" : null);
  if (accessory) rows.push({ label: "Accessory", value: accessory });
  if (finish) rows.push({ label: "Finish (pictured)", value: finish });
  if (material) rows.push({ label: "Material", value: material });
  if (pieces) rows.push({ label: "Pieces", value: String(pieces) });
  rows.push({ label: "Fitment note", value: FITMENT_NOTE });
  rows.push({ label: "Listing code", value: draft.proposed_listing_sku });
  rows.push({ label: "Physical stock SKU", value: parent.articleNo });
  rows.push({ label: "Condition", value: "New" });
  return rows;
}

function mediaUrl(relPath) {
  const clean = String(relPath || "").replace(/^\/+/, "");
  return `https://crazzycars.pk/${clean}`;
}

async function main() {
  const handoff = arg("handoff") || arg("handof");
  if (!handoff || !fs.existsSync(handoff)) {
    console.error("Missing --handoff=/path/to/CrazzyCars_Product_Handoff_R3");
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
    console.error(`REFUSE DB ${dbName} (want ${LIVE_DB})`);
    process.exit(2);
  }

  const drafts = JSON.parse(fs.readFileSync(path.join(handoff, "product_drafts.json"), "utf8"));
  const manifest = JSON.parse(fs.readFileSync(path.join(handoff, "image_manifest.json"), "utf8"));
  const manByPath = Object.fromEntries(manifest.map((m) => [m.path, m]));

  // SHA verify every image
  const shaErrors = [];
  for (const m of manifest) {
    const abs = path.join(handoff, m.path);
    if (!fs.existsSync(abs)) {
      shaErrors.push({ path: m.path, error: "missing" });
      continue;
    }
    const h = sha256File(abs);
    if (h !== m.sha256) shaErrors.push({ path: m.path, error: "sha_mismatch", got: h, want: m.sha256 });
  }
  if (shaErrors.length) {
    console.error("SHA verify failed", shaErrors);
    process.exit(2);
  }
  console.log(`SHA OK for ${manifest.length} images`);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (db.databaseName !== LIVE_DB) {
    console.error(`REFUSE connected db ${db.databaseName}`);
    process.exit(2);
  }
  console.log(`Connected ${db.databaseName}`);

  const Product = db.collection("products");
  const Vehicle = db.collection("vehicles");
  const Category = db.collection("categories");

  const exterior = await Category.findOne({ slug: "exterior" }, { projection: { _id: 1, slug: 1 } });
  const splitters = await Category.findOne(
    { slug: "splitters-side-skirts" },
    { projection: { _id: 1, slug: 1 } }
  );
  if (!exterior || !splitters) {
    console.error("Missing exterior / splitters-side-skirts categories");
    process.exit(2);
  }

  const vehicles = {};
  for (const [key, meta] of Object.entries(VEHICLE_MAP)) {
    const v = await Vehicle.findOne({ slug: meta.slug });
    if (!v) {
      console.error(`Missing vehicle ${meta.slug}`);
      process.exit(2);
    }
    vehicles[key] = { ...meta, _id: v._id };
  }

  const plan = {
    created_at: new Date().toISOString(),
    dry_run: dryRun,
    creates: [],
    updates: [],
    blocked: [],
    skipped: [],
  };

  const rollbackDocs = [];

  for (const draft of drafts.products) {
    const importKey = draft.import_key;
    const imgRel = draft.image?.relative_path;
    const man = manByPath[imgRel];
    if (!man) {
      plan.blocked.push({ importKey, reason: "missing_manifest_entry" });
      continue;
    }

    if (draft.preflight_status === "HOLD_PARENT_MATCH") {
      plan.blocked.push({
        importKey,
        reason: draft.block_reason || "HOLD_PARENT_MATCH",
        source_sku: draft.source_candidate?.sku || null,
      });
      continue;
    }

    const parentSku = draft.source_candidate?.sku;
    if (!parentSku) {
      plan.blocked.push({ importKey, reason: "missing_parent_sku" });
      continue;
    }
    const parent = await Product.findOne({ articleNo: parentSku });
    if (!parent || parent.status !== "active") {
      plan.blocked.push({
        importKey,
        reason: "parent_not_active",
        source_sku: parentSku,
      });
      continue;
    }

    const vmeta = vehicles[draft.vehicle_key];
    if (!vmeta) {
      plan.blocked.push({ importKey, reason: "unknown_vehicle_key" });
      continue;
    }

    // Stage media: master PNG kept; derivatives optional (built by companion script).
    const srcAbs = path.join(handoff, imgRel);
    const fileHash = shortHash(man.sha256);
    const masterName = `${draft.proposed_slug}-main-${fileHash}.png`;
    const masterRel = `media/products/${masterName}`;
    const masterAbs = path.join(mediaRoot, "products", masterName);

    const existingByKey = await Product.findOne({ importKey });
    const existingBySku = await Product.findOne({ articleNo: draft.proposed_listing_sku });
    const existingBySlug = await Product.findOne({ slug: draft.proposed_slug });

    // Exact physical + vehicle match: Rebirth finned → update CC-0076 in place (keep slug/SKU).
    const exactParentVehicleMatch =
      parent.articleNo === "CC-0076" &&
      draft.vehicle_key === "civic-rebirth" &&
      draft.style_key === "front-finned-black";

    let target = existingByKey || existingBySku || existingBySlug;
    if (exactParentVehicleMatch) {
      target = parent;
    }

    const imageDoc = {
      url: `/${masterRel}`,
      publicId: "",
      isMain: true,
      altText: draft.image?.alt || `${draft.proposed_title} — fitment visualisation`,
      alt: draft.image?.alt || "",
      label: "fitment visualisation",
      imageName: draft.proposed_title,
      width: man.width || 1254,
      height: man.height || 1254,
    };

    const tags = Array.from(
      new Set([
        ...(Array.isArray(draft.tags) ? draft.tags : []),
        "crazzycars-r3",
        importKey,
        "fitment-visualisation",
        draft.generation,
        "universal accessory visualisation",
      ].filter(Boolean))
    );

    const pricing = {
      regularPrice: Number(parent.pricing?.regularPrice) || 0,
      salePrice:
        parent.pricing?.salePrice != null && Number.isFinite(Number(parent.pricing.salePrice))
          ? Number(parent.pricing.salePrice)
          : undefined,
      costPerItem: Number(parent.pricing?.costPerItem) || 0,
    };
    if (!pricing.regularPrice) {
      plan.blocked.push({ importKey, reason: "parent_missing_price", source_sku: parentSku });
      continue;
    }

    const baseDoc = {
      // Exact matched records keep their established public name/slug/SKU.
      name: exactParentVehicleMatch ? parent.name : draft.proposed_title,
      slug: exactParentVehicleMatch ? parent.slug : draft.proposed_slug,
      articleNo: exactParentVehicleMatch ? parent.articleNo : draft.proposed_listing_sku,
      importKey,
      inventorySourceProductId: exactParentVehicleMatch ? null : parent._id,
      shortDescription: draft.short_description,
      longDescription: buildLongDescription(draft, parent),
      specifications: buildSpecs(draft, parent),
      features: [
        FITMENT_NOTE,
        `Pictured on ${draft.generation} ${draft.year_range}`,
        `Physical stock linked to ${parent.articleNo}`,
      ],
      pricing,
      inventory: exactParentVehicleMatch
        ? parent.inventory
        : {
            quantity: 0,
            trackInventory: true,
            allowBackorder: parent.inventory?.allowBackorder === true,
            lowStockThreshold: parent.inventory?.lowStockThreshold ?? 5,
            weight: parent.inventory?.weight ?? 0,
            weightUnit: parent.inventory?.weightUnit || "g",
            sku: draft.proposed_listing_sku,
          },
      categories: [exterior._id, splitters._id],
      primaryCategorySlug: "splitters-side-skirts",
      primaryCarSlug: vmeta.slug,
      tags,
      isUniversal: false,
      isBulky: true,
      codEligible: parent.codEligible !== false && parent.codEnabled !== false,
      codEnabled: parent.codEligible !== false && parent.codEnabled !== false,
      compatibleVehicles: [vmeta._id],
      compatibleCars: [
        {
          make: vmeta.make,
          model: vmeta.model,
          generation: vmeta.generationLabel,
          generationId: vmeta._id,
          generationLabel: vmeta.generationLabel,
          yearFrom: vmeta.yearFrom,
          yearTo: vmeta.yearTo,
        },
      ],
      vehicleCompatibility: {
        fitmentType: "semi-universal",
        universalNote: FITMENT_NOTE,
        vehicles: [
          {
            make: vmeta.make,
            model: vmeta.model,
            generationId: vmeta._id,
            generationLabel: vmeta.generationLabel,
            yearFrom: vmeta.yearFrom,
            yearTo: vmeta.yearTo,
            bodyStyle: "All",
            notes: FITMENT_NOTE,
          },
        ],
        categories: [],
      },
      metaTitle: draft.seo?.meta_title || `${draft.proposed_title} | CrazzyCars.pk`,
      metaDescription: draft.seo?.meta_description || draft.short_description,
      seo: {
        metaTitle: draft.seo?.meta_title || `${draft.proposed_title} | CrazzyCars.pk`,
        metaDescription: draft.seo?.meta_description || draft.short_description,
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
      vendor: parent.vendor || "CrazzyCars.pk",
      condition: "new",
      segment: "car",
      updatedAt: new Date(),
    };

    const entry = {
      importKey,
      action: target ? "update" : "create",
      exact_parent_update: !!exactParentVehicleMatch,
      slug: baseDoc.slug,
      articleNo: baseDoc.articleNo,
      parentSku: parent.articleNo,
      parentId: String(parent._id),
      price: pricing.salePrice ?? pricing.regularPrice,
      masterRel,
      masterAbs,
      imageSha256: man.sha256,
      liveUrl: `https://crazzycars.pk/${baseDoc.slug}`,
    };

    if (dryRun) {
      if (target) plan.updates.push(entry);
      else plan.creates.push(entry);
      continue;
    }

    // Write master PNG (never overwrite different content for same path without check)
    fs.mkdirSync(path.dirname(masterAbs), { recursive: true });
    if (fs.existsSync(masterAbs)) {
      const existingSha = sha256File(masterAbs);
      if (existingSha !== man.sha256) {
        plan.blocked.push({ importKey, reason: "media_path_collision", masterAbs });
        continue;
      }
    } else {
      fs.copyFileSync(srcAbs, masterAbs);
      // verify after copy
      if (sha256File(masterAbs) !== man.sha256) {
        plan.blocked.push({ importKey, reason: "post_copy_sha_mismatch" });
        continue;
      }
    }

    if (target) {
      rollbackDocs.push({
        _id: target._id,
        before: {
          name: target.name,
          slug: target.slug,
          articleNo: target.articleNo,
          status: target.status,
          media: target.media,
          pricing: target.pricing,
          inventory: target.inventory,
          inventorySourceProductId: target.inventorySourceProductId,
          importKey: target.importKey,
          shortDescription: target.shortDescription,
          longDescription: target.longDescription,
          seo: target.seo,
          tags: target.tags,
        },
      });

      const setDoc = { ...baseDoc };
      // Keep established URL/identity on exact parent update.
      if (exactParentVehicleMatch) {
        setDoc.slug = parent.slug;
        setDoc.articleNo = parent.articleNo;
        setDoc.inventorySourceProductId = null;
        setDoc.inventory = parent.inventory;
        // Prepend new visualisation as main; keep prior genuine photos after.
        const prior = Array.isArray(parent.media?.images) ? parent.media.images : [];
        const rest = prior
          .filter((im) => im && im.url && !String(im.url).includes(masterName))
          .map((im) => ({ ...im, isMain: false }));
        setDoc.media = { images: [imageDoc, ...rest], videos: parent.media?.videos || [] };
      } else {
        const prior = Array.isArray(parent.media?.images) ? parent.media.images : [];
        const loose = prior
          .filter((im) => im && im.url)
          .slice(0, 4)
          .map((im) => ({
            ...im,
            isMain: false,
            label: im.label || "physical product",
          }));
        setDoc.media = { images: [imageDoc, ...loose], videos: [] };
      }

      await Product.updateOne({ _id: target._id }, { $set: setDoc });
      entry.id = String(target._id);
      plan.updates.push(entry);
    } else {
      const prior = Array.isArray(parent.media?.images) ? parent.media.images : [];
      const loose = prior
        .filter((im) => im && im.url)
        .slice(0, 4)
        .map((im) => ({
          ...im,
          isMain: false,
          label: im.label || "physical product",
        }));
      const insertDoc = {
        ...baseDoc,
        media: { images: [imageDoc, ...loose], videos: [] },
        createdAt: new Date(),
      };
      const res = await Product.insertOne(insertDoc);
      entry.id = String(res.insertedId);
      plan.creates.push(entry);
    }
  }

  fs.writeFileSync(path.join(outDir, "plan.json"), JSON.stringify(plan, null, 2));
  if (!dryRun && rollbackDocs.length) {
    fs.writeFileSync(path.join(outDir, "rollback-before.json"), JSON.stringify(rollbackDocs, null, 2));
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        creates: plan.creates.length,
        updates: plan.updates.length,
        blocked: plan.blocked.length,
        outDir,
      },
      null,
      2
    )
  );
  console.log("BLOCKED", plan.blocked);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

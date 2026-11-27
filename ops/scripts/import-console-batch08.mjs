#!/usr/bin/env node
/**
 * CrazzyCars Console Batch 08 importer.
 * Idempotent key: importKey = crazzycars-console08:<item_id>
 *
 * Usage (in store container):
 *   node ops/scripts/import-console-batch08.mjs --handoff=/path --dry-run
 *   node ops/scripts/import-console-batch08.mjs --handoff=/path --apply --media-root=/app/media
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

const LIVE_DB = "crazzycars_motorsports";
const BATCH = "CC-CONSOLE-08";
const FIT =
  "Product visualisation of console organizers. Confirm exact model year, console layout and RHD fitment before ordering.";

const VEHICLE_BY_ITEM = {
  "s05-pad-cup-orange": "deepal-s05-2024-present",
  "s05-pad-cup-black": "deepal-s05-2024-present",
  "s05-console-kit-orange": "deepal-s05-2024-present",
  "s05-console-kit-black": "deepal-s05-2024-present",
  "dual-cup-tray-tan": "haval-h6-2021-present",
  "dual-cup-tray-black": "haval-h6-2021-present",
  "h6-new-armrest-black": "haval-h6-2021-present",
  "atto3-tray-black": "byd-atto3-2025-present",
  "atto2-console-kit-black": "byd-atto2-2025-present",
  "jetour-t2-armrest-black": "jetour-t2-2024-present",
  "jetour-t1-armrest-black": "jetour-t1-2024-present",
  "jetour-t2-console-black": null, // vehicle unconfirmed
};

/** Owner-authorized live prices (researched proposals + colour sibling). */
const LIVE_PRICES = {
  "s05-pad-cup-orange": { sale: 3599, regular: 4799, M: 3999 },
  "s05-pad-cup-black": { sale: 3599, regular: 4799, M: 3999, note: "colour sibling of orange; sold-out quote M02 was 3999" },
  "dual-cup-tray-tan": { sale: 2475, regular: 3300, M: 2750 },
  "dual-cup-tray-black": { sale: 2475, regular: 3300, M: 2750 },
};

const NEW_VEHICLES = [
  {
    slug: "byd-atto2-2025-present",
    make: "BYD",
    model: "Atto 2",
    generation: "",
    displayName: "BYD Atto 2 (2025–Present)",
    yearFrom: 2025,
    yearTo: null,
    catalogModelSlug: "byd-atto2-2025-present",
    metaTitle: "BYD Atto 2 Accessories in Pakistan | CrazzyCars.pk",
    metaDescription: "Shop BYD Atto 2 interior console organizers and accessories in Pakistan. Cash on Delivery.",
    sortOrder: 45,
  },
  {
    slug: "jetour-t1-2024-present",
    make: "Jetour",
    model: "T1",
    generation: "",
    displayName: "Jetour T1 (2024–Present)",
    yearFrom: 2024,
    yearTo: null,
    catalogModelSlug: "jetour-t1-2024-present",
    metaTitle: "Jetour T1 Accessories in Pakistan | CrazzyCars.pk",
    metaDescription: "Shop Jetour T1 armrest organizers and interior accessories in Pakistan. Cash on Delivery.",
    sortOrder: 46,
  },
  {
    slug: "jetour-t2-2024-present",
    make: "Jetour",
    model: "T2",
    generation: "",
    displayName: "Jetour T2 (2024–Present)",
    yearFrom: 2024,
    yearTo: null,
    catalogModelSlug: "jetour-t2-2024-present",
    metaTitle: "Jetour T2 Accessories in Pakistan | CrazzyCars.pk",
    metaDescription: "Shop Jetour T2 armrest organizers and interior accessories in Pakistan. Cash on Delivery.",
    sortOrder: 47,
  },
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
function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function whyBuy() {
  return `<h2>Why buy from CrazzyCars.pk?</h2>
<p>CrazzyCars.pk is a Gujranwala car accessories shop. Check the pictured components and console layout against your car before ordering. WhatsApp 03284010007 with your make, model and year if you want help confirming fitment. Cash on Delivery is available on eligible items. Delivery charges follow the current store shipping policy.</p>`;
}

function buildLongDescription(item) {
  const short = item.short_description || "";
  const body = String(item.description_html || "").trim();
  const bits = [];
  bits.push(`<p data-cc-aeo="1">${escapeHtml(short)}</p>`);
  if (body) bits.push(body);
  bits.push(`<h2>Product and fitment</h2><p>${escapeHtml(FIT)}</p>`);
  bits.push("<h2>Verified details</h2><ul>");
  bits.push(`<li>Colour (pictured): ${escapeHtml(item.color || "")}</li>`);
  bits.push(`<li>Visible pieces in photos: ${escapeHtml(String(item.visible_piece_count || ""))}</li>`);
  bits.push(`<li>Model candidate: ${escapeHtml(item.model_candidate || "")}</li>`);
  bits.push(`<li>Listing code: ${escapeHtml(item.proposed_sku || "")}</li>`);
  bits.push("</ul>");
  bits.push(whyBuy());
  return bits.join("\n");
}

async function ensureVehicles(Vehicle) {
  const now = new Date();
  const map = {};
  for (const v of NEW_VEHICLES) {
    let doc = await Vehicle.findOne({ slug: v.slug });
    if (!doc) {
      const r = await Vehicle.insertOne({
        ...v,
        image: "",
        isActive: true,
        segment: "car",
        createdAt: now,
        updatedAt: now,
        contentUpdatedAt: now,
      });
      doc = await Vehicle.findOne({ _id: r.insertedId });
      console.log("vehicle_created", v.slug);
    } else {
      console.log("vehicle_exists", v.slug);
    }
    map[v.slug] = doc;
  }
  for (const slug of ["deepal-s05-2024-present", "haval-h6-2021-present", "byd-atto3-2025-present"]) {
    const doc = await Vehicle.findOne({ slug });
    if (!doc) throw new Error(`Missing vehicle ${slug}`);
    map[slug] = doc;
  }
  return map;
}

async function ensureCarCatalog(CarCatalog, vehicles) {
  const now = new Date();
  // BYD Atto 2 under byd
  let byd = await CarCatalog.findOne({ slug: "byd" });
  if (byd && !(byd.models || []).some((m) => m.slug === "byd-atto2-2025-present")) {
    await CarCatalog.updateOne(
      { _id: byd._id },
      {
        $push: {
          models: {
            name: "Atto 2",
            slug: "byd-atto2-2025-present",
            years: [2025, 2026],
            yearFrom: 2025,
            yearTo: null,
            isActive: true,
            bodyStyle: "SUV",
            image: "",
            description: "Shop BYD Atto 2 accessories in Pakistan.",
            popularAccessories: [],
            generation: "",
            nickname: "",
            isPopular: false,
            popularOrder: 3,
            variants: [],
          },
        },
        $set: { updatedAt: now },
      }
    );
    console.log("catalog_model_added byd-atto2");
  }
  let jetour = await CarCatalog.findOne({ slug: "jetour" });
  if (!jetour) {
    const max = await CarCatalog.find({}, { order: 1 }).sort({ order: -1 }).limit(1).toArray();
    const order = (max[0]?.order || 20) + 1;
    const r = await CarCatalog.insertOne({
      name: "Jetour",
      slug: "jetour",
      order,
      isActive: true,
      logo: "",
      country: "China",
      segment: "car",
      models: [],
      createdAt: now,
      updatedAt: now,
    });
    jetour = await CarCatalog.findOne({ _id: r.insertedId });
    console.log("catalog_make_created jetour");
  }
  for (const m of [
    { name: "T1", slug: "jetour-t1-2024-present", yearFrom: 2024 },
    { name: "T2", slug: "jetour-t2-2024-present", yearFrom: 2024 },
  ]) {
    if (!(jetour.models || []).some((x) => x.slug === m.slug)) {
      await CarCatalog.updateOne(
        { _id: jetour._id },
        {
          $push: {
            models: {
              name: m.name,
              slug: m.slug,
              years: [2024, 2025, 2026],
              yearFrom: m.yearFrom,
              yearTo: null,
              isActive: true,
              bodyStyle: "SUV",
              image: "",
              description: `Shop Jetour ${m.name} accessories in Pakistan.`,
              popularAccessories: [],
              generation: "",
              nickname: "",
              isPopular: true,
              popularOrder: m.name === "T1" ? 1 : 2,
              variants: [],
            },
          },
          $set: { updatedAt: now, isActive: true },
        }
      );
      console.log("catalog_model_added", m.slug);
      jetour = await CarCatalog.findOne({ _id: jetour._id });
    }
  }
  return vehicles;
}

async function main() {
  const handoff = arg("handoff");
  if (!handoff || !fs.existsSync(handoff)) {
    console.error("Missing --handoff=/path/to/CrazzyCars_Console_Batch_08");
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

  const items = JSON.parse(fs.readFileSync(path.join(handoff, "product_catalogue.json"), "utf8"));
  const manifest = JSON.parse(fs.readFileSync(path.join(handoff, "image_manifest.json"), "utf8"));
  const manByPath = Object.fromEntries(manifest.map((m) => [m.filename, m]));

  for (const m of manifest) {
    const abs = path.join(handoff, m.filename);
    if (!fs.existsSync(abs)) throw new Error(`missing ${m.filename}`);
    const h = sha256File(abs);
    if (h !== m.sha256) throw new Error(`sha mismatch ${m.filename}`);
  }
  console.log(`SHA OK for ${manifest.length} images`);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (db.databaseName !== LIVE_DB) {
    console.error(`REFUSE connected ${db.databaseName}`);
    process.exit(2);
  }

  const Product = db.collection("products");
  const Vehicle = db.collection("vehicles");
  const Category = db.collection("categories");
  const CarCatalog = db.collection("carcatalogs");

  const interior = await Category.findOne({ slug: "interior" });
  const organizers = await Category.findOne({ slug: "car-organizers" });
  const armrest = await Category.findOne({ slug: "arm-rests-console-boxes" });
  if (!interior || !organizers) throw new Error("Missing interior/car-organizers categories");

  const vehicles = await ensureVehicles(Vehicle);
  await ensureCarCatalog(CarCatalog, vehicles);

  const plan = { dry_run: dryRun, created_at: new Date().toISOString(), creates: [], updates: [], drafts: [], blocked: [] };

  for (const item of items) {
    const importKey = `crazzycars-console08:${item.item_id}`;
    const livePrice = LIVE_PRICES[item.item_id];
    const status = livePrice ? "active" : "draft";
    const vehicleSlug = VEHICLE_BY_ITEM[item.item_id];
    const vehicle = vehicleSlug ? vehicles[vehicleSlug] : null;

    const heroRel = (item.gallery_images && item.gallery_images[0]) || item.primary_image;
    const detailRel = (item.gallery_images && item.gallery_images[1]) || null;
    const heroMan = manByPath[heroRel];
    const detailMan = detailRel ? manByPath[detailRel] : null;
    if (!heroMan) {
      plan.blocked.push({ importKey, reason: "missing_hero_manifest" });
      continue;
    }

    const heroHash = shortHash(heroMan.sha256);
    const heroName = `${item.slug}-hero-${heroHash}.png`;
    const heroAbs = path.join(mediaRoot, "products", heroName);
    const heroUrl = `/media/products/${heroName}`;

    let detailName = null;
    let detailAbs = null;
    let detailUrl = null;
    if (detailMan) {
      const dh = shortHash(detailMan.sha256);
      detailName = `${item.slug}-detail-${dh}.png`;
      detailAbs = path.join(mediaRoot, "products", detailName);
      detailUrl = `/media/products/${detailName}`;
    }

    const existing =
      (await Product.findOne({ importKey })) ||
      (await Product.findOne({ articleNo: item.proposed_sku })) ||
      (await Product.findOne({ slug: item.slug }));

    const pricing = livePrice
      ? {
          regularPrice: livePrice.regular,
          salePrice: livePrice.sale,
          costPerItem: 0,
          saleSchedule: { enabled: false },
        }
      : {
          regularPrice: 0,
          salePrice: undefined,
          costPerItem: 0,
          saleSchedule: { enabled: false },
        };

    const cats = [interior._id, organizers._id];
    if (/armrest/i.test(item.item_id) && armrest) cats.push(armrest._id);

    const mediaImages = [
      {
        url: heroUrl,
        publicId: "",
        isMain: true,
        altText: heroMan.alt || item.name,
        alt: heroMan.alt || item.name,
        label: "product visualisation",
        imageName: item.name,
        width: 1254,
        height: 1254,
      },
    ];
    if (detailUrl) {
      mediaImages.push({
        url: detailUrl,
        publicId: "",
        isMain: false,
        altText: detailMan.alt || `${item.name} detail`,
        alt: detailMan.alt || `${item.name} detail`,
        label: "product visualisation detail",
        imageName: `${item.name} detail`,
        width: 1254,
        height: 1254,
      });
    }

    const tags = Array.from(
      new Set([...(item.tags || []), ...(item.keywords || []), BATCH, importKey, "console organizer", "product visualisation"].filter(Boolean))
    );

    const baseDoc = {
      name: item.name,
      slug: item.slug,
      articleNo: item.proposed_sku,
      importKey,
      shortDescription: item.short_description || "",
      longDescription: buildLongDescription(item),
      specifications: [
        { label: "Accessory", value: item.name },
        { label: "Colour (pictured)", value: item.color || "" },
        { label: "Pieces (pictured)", value: String(item.visible_piece_count || "") },
        { label: "Fitment note", value: FIT },
        { label: "Listing code", value: item.proposed_sku },
        { label: "Condition", value: "New" },
      ],
      features: [FIT, `Pictured colour: ${item.color || ""}`, `Visible pieces: ${item.visible_piece_count || ""}`],
      pricing,
      inventory: {
        quantity: livePrice ? 100 : 0,
        trackInventory: true,
        allowBackorder: false,
        lowStockThreshold: 5,
        weight: 0,
        weightUnit: "g",
        sku: item.proposed_sku,
      },
      categories: cats,
      primaryCategorySlug: "car-organizers",
      primaryCarSlug: vehicleSlug || "",
      tags,
      isUniversal: !vehicle,
      isBulky: false,
      codEligible: true,
      codEnabled: true,
      compatibleVehicles: vehicle ? [vehicle._id] : [],
      compatibleCars: vehicle
        ? [
            {
              make: vehicle.make,
              model: vehicle.model,
              generation: vehicle.displayName || "",
              generationId: vehicle._id,
              generationLabel: vehicle.displayName || "",
              yearFrom: vehicle.yearFrom,
              yearTo: vehicle.yearTo,
            },
          ]
        : [],
      vehicleCompatibility: {
        // "specific" when the item is for one car ("semi-universal" = most cars EXCEPT these).
        fitmentType: vehicle ? "specific" : "universal",
        universalNote: FIT,
        vehicles: vehicle
          ? [
              {
                make: vehicle.make,
                model: vehicle.model,
                generationId: vehicle._id,
                generationLabel: vehicle.displayName || "",
                yearFrom: vehicle.yearFrom,
                yearTo: vehicle.yearTo,
                bodyStyle: "All",
                notes: FIT,
              },
            ]
          : [],
        categories: [],
      },
      metaTitle: item.meta_title || `${item.name} | CrazzyCars.pk`,
      metaDescription: item.meta_description || item.short_description || "",
      seo: {
        metaTitle: item.meta_title || `${item.name} | CrazzyCars.pk`,
        metaDescription: item.meta_description || item.short_description || "",
        metaKeywords: tags.slice(0, 12),
        excludeFromMerchantFeed: status !== "active",
        excludeFromSitemap: status !== "active",
        excludeFromListings: status !== "active",
        robots: "",
        omitProductSchemaImage: false,
      },
      status,
      securityHold: false,
      securityHoldReason: "",
      vendor: "CrazzyCars.pk",
      condition: "new",
      segment: "car",
      newArrival: true,
      media: { images: mediaImages },
      metadata: {
        batch_id: BATCH,
        item_id: item.item_id,
        importKey,
        market_baseline_pkr: livePrice?.M ?? item.market_baseline_pkr ?? null,
        pricing_note: livePrice?.note || item.pricing_note || "",
        hold_reasons: item.hold_reasons || [],
      },
      updatedAt: new Date(),
    };

    const entry = {
      importKey,
      action: existing ? "update" : "create",
      status,
      slug: item.slug,
      articleNo: item.proposed_sku,
      price: livePrice ? livePrice.sale : null,
      liveUrl: `https://crazzycars.pk/${item.slug}`,
    };

    if (status === "draft") plan.drafts.push(entry);
    else if (existing) plan.updates.push(entry);
    else plan.creates.push(entry);

    if (dryRun) continue;

    fs.mkdirSync(path.join(mediaRoot, "products"), { recursive: true });
    const heroSrc = path.join(handoff, heroRel);
    if (!fs.existsSync(heroAbs)) {
      fs.copyFileSync(heroSrc, heroAbs);
      if (sha256File(heroAbs) !== heroMan.sha256) throw new Error(`post-copy sha ${heroName}`);
    }
    if (detailAbs && detailRel) {
      const detailSrc = path.join(handoff, detailRel);
      if (!fs.existsSync(detailAbs)) {
        fs.copyFileSync(detailSrc, detailAbs);
        if (sha256File(detailAbs) !== detailMan.sha256) throw new Error(`post-copy sha ${detailName}`);
      }
    }

    if (existing) {
      await Product.updateOne(
        { _id: existing._id },
        {
          $set: {
            ...baseDoc,
            createdAt: existing.createdAt || new Date(),
          },
        }
      );
    } else {
      await Product.insertOne({ ...baseDoc, createdAt: new Date() });
    }
  }

  fs.writeFileSync(path.join(outDir, "plan.json"), JSON.stringify(plan, null, 2));
  console.log(
    JSON.stringify(
      {
        dryRun,
        creates: plan.creates.length,
        updates: plan.updates.length,
        drafts: plan.drafts.length,
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

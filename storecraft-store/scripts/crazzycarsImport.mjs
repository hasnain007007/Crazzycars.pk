/**
 * Homefy AutoJin import — vehicles → categories → product batches.
 *
 * Usage (from storecraft-store):
 *   node --env-file=.env.local ../crazzycars-import/runImport.mjs vehicles
 *   node --env-file=.env.local ../crazzycars-import/runImport.mjs categories
 *   node --env-file=.env.local ../crazzycars-import/runImport.mjs batch1
 *   node --env-file=.env.local ../crazzycars-import/runImport.mjs batch2
 *   node --env-file=.env.local ../crazzycars-import/runImport.mjs batch3
 *   node --env-file=.env.local ../crazzycars-import/runImport.mjs verify
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Vehicle from "../lib/models/Vehicle.model.js";
import CarCatalog from "../lib/models/CarCatalog.model.js";
import Category from "../lib/models/Category.model.js";
import Product from "../lib/models/Product.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const FILES = {
  vehicles: path.join(__dirname, "../../crazzycars-import/crazzycars-new-vehicles.csv"),
  batch1: path.join(__dirname, "../../crazzycars-import/crazzycars-import-batch1-exterior-mats.csv"),
  batch2: path.join(__dirname, "../../crazzycars-import/crazzycars-import-batch2-trunk-sun-curtains.csv"),
  batch3: path.join(__dirname, "../../crazzycars-import/crazzycars-import-batch3-seatbelt-knob-carbon-fragrance.csv"),
};

const MAKE_COUNTRY = {
  kia: "South Korea",
  hyundai: "South Korea",
  changan: "China",
  byd: "China",
  chery: "China",
  mg: "China",
  toyota: "Japan",
  honda: "Japan",
  suzuki: "Japan",
  haval: "China",
};

const BODY_STYLES = new Set(["Sedan", "SUV", "Hatchback", "Pickup", "Van", "Crossover", "Coupe", "MPV"]);

const ACTIVATE_SLUGS = [
  "front-grilles",
  "wind-deflectors",
  "dashboard-mats",
  "floor-mats",
];

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parseCsv(text) {
  const raw = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let i = 0;
  let field = "";
  let row = [];
  let inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    if (!(row.length === 1 && row[0] === "" && rows.length)) rows.push(row);
    row = [];
  };
  while (i < raw.length) {
    const ch = raw[i];
    if (inQuotes) {
      if (ch === '"') {
        if (raw[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (ch === "\n") {
      pushField();
      pushRow();
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  pushField();
  if (row.length > 1 || (row.length === 1 && row[0] !== "")) pushRow();
  if (!rows.length) return [];
  const headers = rows[0].map((h) => String(h || "").trim());
  const out = [];
  for (let r = 1; r < rows.length; r += 1) {
    const cells = rows[r];
    if (!cells.some((c) => String(c || "").trim())) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] != null ? String(cells[idx]) : "";
    });
    out.push(obj);
  }
  return out;
}

function splitList(value) {
  return String(value || "")
    .split(/[|;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function truthy(v, fallback = false) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return fallback;
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return fallback;
}

function num(v, fallback = 0) {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : fallback;
}

function yearOrNull(v) {
  const s = String(v ?? "").trim();
  if (!s || /^present$/i.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function displayName(make, model, generation, yearFrom, yearTo) {
  const years =
    yearTo == null ? `${yearFrom}–present` : `${yearFrom}–${yearTo}`;
  const gen = generation ? ` ${generation}` : "";
  return `${make} ${model}${gen} (${years})`;
}

async function importVehicles() {
  const rows = parseCsv(fs.readFileSync(FILES.vehicles, "utf8"));
  console.log(`\n═══ STEP 1: Import ${rows.length} vehicles ═══`);

  let created = 0;
  let updated = 0;
  const makeSlugsTouched = new Set();

  for (const row of rows) {
    const make = String(row.Make || "").trim();
    const model = String(row.Model || "").trim();
    const generation = String(row.Generation || "").trim();
    const slug = String(row.Slug || "").trim().toLowerCase();
    const yearFrom = yearOrNull(row.YearFrom);
    const yearTo = yearOrNull(row.YearTo);
    const bodyType = String(row.BodyType || "Sedan").trim();
    if (!make || !model || !slug || !yearFrom) {
      console.warn("  skip invalid row", row);
      continue;
    }

    const payload = {
      make,
      model,
      generation,
      slug,
      yearFrom,
      yearTo,
      displayName: displayName(make, model, generation, yearFrom, yearTo),
      isActive: true,
      metaTitle: `${make} ${model}${generation ? ` ${generation}` : ""} ${yearFrom}–${yearTo || "present"} Accessories | Homefy.pk`,
      metaDescription: `Shop ${make} ${model} accessories in Pakistan at Homefy.pk — Cash on Delivery nationwide.`,
    };

    const existing = await Vehicle.findOne({ slug }).select("_id").lean();
    await Vehicle.findOneAndUpdate(
      { slug },
      { $set: payload },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    if (existing) updated += 1;
    else created += 1;
    console.log(`  ${existing ? "↻" : "+"} ${payload.displayName}  [${slug}]`);

    // Car Catalog make/model upsert
    const makeSlug = slugify(make);
    makeSlugsTouched.add(makeSlug);
    const country = MAKE_COUNTRY[makeSlug] || "Japan";
    const bodyStyle = BODY_STYLES.has(bodyType) ? bodyType : "Sedan";
    const modelSlug = slugify(`${make}-${model}${generation ? `-${generation}` : ""}-${yearFrom}-${yearTo || "present"}`);

    let makeDoc = await CarCatalog.findOne({ slug: makeSlug });
    if (!makeDoc) {
      makeDoc = await CarCatalog.create({
        name: make,
        slug: makeSlug,
        country,
        isActive: true,
        order: 100,
        models: [],
      });
      console.log(`    📁 created make ${make} (${country})`);
    } else {
      makeDoc.country = country;
      makeDoc.isActive = true;
      makeDoc.name = make;
    }

    const years = [];
    const end = yearTo || new Date().getFullYear();
    for (let y = yearFrom; y <= end; y += 1) years.push(y);

    const idx = (makeDoc.models || []).findIndex(
      (m) => m.slug === modelSlug || (m.name === model && String(m.generation || "") === generation && m.yearFrom === yearFrom)
    );
    const modelFields = {
      name: model,
      slug: modelSlug,
      years,
      yearFrom,
      yearTo: yearTo || undefined,
      isActive: true,
      bodyStyle,
      generation,
      description: payload.displayName,
    };
    if (idx >= 0) {
      Object.assign(makeDoc.models[idx], modelFields);
    } else {
      makeDoc.models.push(modelFields);
    }
    await makeDoc.save();
  }

  const checks = [
    "kia-picanto-2019-present",
    "changan-alsvin-2021-present",
    "byd-atto3-2025-present",
  ];
  console.log("\n  Verify key slugs:");
  for (const s of checks) {
    const v = await Vehicle.findOne({ slug: s }).select("displayName slug isActive").lean();
    console.log(`    ${s}: ${v ? `OK — ${v.displayName}` : "MISSING"}`);
  }
  console.log(`\n  Vehicles upserted: +${created} new, ↻${updated} updated (CSV rows: ${rows.length})`);
  console.log(`  Total vehicles in DB: ${await Vehicle.countDocuments()}`);
  console.log(`  Makes touched: ${[...makeSlugsTouched].join(", ")}`);
}

async function ensureCategories() {
  console.log(`\n═══ STEP 2: Activate / create required categories (Batch 1) ═══`);
  const exterior = await Category.findOne({ slug: "exterior" }).select("_id name").lean();
  const interior = await Category.findOne({ slug: "interior" }).select("_id name").lean();
  if (!exterior) throw new Error('Parent category "exterior" not found');
  if (!interior) throw new Error('Parent category "interior" not found');

  const ensureChild = async (slug, name, parent, meta) => {
    let doc = await Category.findOne({ slug });
    if (!doc) {
      doc = await Category.create({
        name,
        slug,
        description: meta.description || "",
        parentCategory: parent._id,
        parents: [parent._id],
        ancestors: [parent._id],
        level: 1,
        status: "active",
        showInNav: true,
        showInFooter: false,
        showOnHomepage: false,
        sortOrder: 40,
        seo: {
          metaTitle: meta.metaTitle || `${name} | Homefy.pk`,
          metaDescription: meta.metaDescription || `Shop ${name} in Pakistan at Homefy.pk.`,
          metaKeywords: meta.metaKeywords || [name.toLowerCase()],
        },
        image: { url: "", publicId: "", altText: "", title: "" },
      });
      console.log(`  + created ${slug} under ${parent.name}`);
    }
    return doc;
  };

  await ensureChild("wind-deflectors", "Wind Deflectors", exterior, {
    description: "Window wind deflectors / air press for cars.",
    metaTitle: "Car Wind Deflectors in Pakistan | Homefy.pk",
  });
  await ensureChild("dashboard-mats", "Dashboard Mats", interior, {
    description: "Dashboard mats and covers.",
    metaTitle: "Dashboard Mats in Pakistan | Homefy.pk",
  });
  await ensureChild("floor-mats", "Floor Mats", interior, {
    description: "Car floor mats.",
    metaTitle: "Car Floor Mats in Pakistan | Homefy.pk",
  });

  for (const slug of ACTIVATE_SLUGS) {
    const doc = await Category.findOne({ slug });
    if (!doc) {
      console.log(`  ✗ missing category slug: ${slug}`);
      continue;
    }
    doc.status = "active";
    doc.showInNav = true;
    await doc.save();
    console.log(`  ✓ activated ${slug} [${doc.name}]`);
  }
}

async function importProductBatch(batchKey) {
  const file = FILES[batchKey];
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  console.log(`\n═══ STEP 3: Import ${batchKey} (${rows.length} rows) ═══`);

  const cats = await Category.find({}).select("_id slug status").lean();
  const catBySlug = new Map(cats.map((c) => [c.slug, c]));
  const vehicles = await Vehicle.find({}).select("_id slug make model displayName").lean();
  const vehBySlug = new Map(vehicles.map((v) => [v.slug, v]));

  let created = 0;
  let updated = 0;
  const unresolvedCategories = new Map(); // slug -> count
  const unresolvedVehicles = new Map();
  const noCategory = [];
  const noVehicleWhenRequired = [];
  const notAutojinReal = [];
  const needImages = [];

  for (const row of rows) {
    const name = String(row.name || "").trim();
    const slug = String(row.slug || "").trim().toLowerCase() || slugify(name);
    if (!name) continue;

    const categorySlugs = splitList(row.categorySlugs);
    const categoryIds = [];
    for (const s of categorySlugs) {
      const c = catBySlug.get(s);
      if (!c) {
        unresolvedCategories.set(s, (unresolvedCategories.get(s) || 0) + 1);
        continue;
      }
      categoryIds.push(c._id);
    }

    const vehicleSlugs = splitList(row.vehicleSlugs);
    const vehicleIds = [];
    for (const s of vehicleSlugs) {
      const v = vehBySlug.get(s);
      if (!v) {
        unresolvedVehicles.set(s, (unresolvedVehicles.get(s) || 0) + 1);
        continue;
      }
      vehicleIds.push(v._id);
    }

    const isUniversal = truthy(row.isUniversal, false);
    const statusRaw = String(row.status || "draft").trim().toLowerCase();
    const status = ["active", "inactive", "draft"].includes(statusRaw) ? statusRaw : "draft";
    const articleNo = String(row.articleNo || "").trim();
    const featured = truthy(row.featured, false);
    const keywords = splitList(row.metaKeywords);
    const tags = splitList(row.tags);
    const imageUrls = splitList(row.imageUrls);
    const saleRaw = String(row.salePrice ?? "").trim();
    const salePrice = saleRaw === "" ? undefined : num(saleRaw, undefined);
    // priceSource + autojinPrice are helper columns only — never stored
    const priceSource = String(row.priceSource || "").trim().toUpperCase();

    if (!categoryIds.length) noCategory.push(slug);
    if (!isUniversal && !vehicleIds.length) noVehicleWhenRequired.push(slug);
    if (!imageUrls.length) needImages.push(slug);
    if (priceSource && priceSource !== "AUTOJIN-REAL") notAutojinReal.push({ slug, priceSource });

    const fields = {
      name,
      articleNo,
      ean: String(row.ean || "").trim(),
      partNumber: String(row.partNumber || "").trim(),
      condition: ["new", "used", "refurbished"].includes(String(row.condition || "").toLowerCase())
        ? String(row.condition).toLowerCase()
        : "new",
      categories: categoryIds,
      shortDescription: String(row.shortDescription || "").trim().slice(0, 300),
      longDescription: String(row.longDescription || ""),
      pricing: {
        regularPrice: Math.max(0, num(row.regularPrice, 0)),
        ...(salePrice != null && Number.isFinite(salePrice) ? { salePrice } : { salePrice: undefined }),
        costPerItem: Math.max(0, num(row.costPerItem, 0)),
      },
      inventory: {
        sku: String(row.sku || articleNo || "").trim(),
        quantity: Math.max(0, Math.floor(num(row.quantity, 0))),
        trackInventory: truthy(row.trackInventory, true),
        allowBackorder: truthy(row.allowBackorder, false),
        lowStockThreshold: Math.max(0, Math.floor(num(row.lowStockThreshold, 5))),
        weight: Math.max(0, num(row.weight, 0)),
        weightUnit: String(row.weightUnit || "kg").trim() || "kg",
      },
      media: {
        images: imageUrls.map((url, i) => ({
          url,
          publicId: "",
          isMain: i === 0,
          altText: name,
        })),
        videos: [],
        videoUrl: "",
        videoType: "",
      },
      tags,
      vendor: String(row.vendor || "").trim(),
      productType: String(row.productType || "").trim(),
      status,
      featured,
      isFeatured: featured,
      newArrival: truthy(row.newArrival, false),
      isDeal: truthy(row.isDeal, false),
      isUniversal,
      compatibleVehicles: vehicleIds,
      seo: {
        metaTitle: String(row.metaTitle || "").trim(),
        metaDescription: String(row.metaDescription || "").trim(),
        metaKeywords: keywords,
      },
      metaTitle: String(row.metaTitle || "").trim(),
      metaDescription: String(row.metaDescription || "").trim(),
    };

    const existing = await Product.findOne({ slug });
    if (existing) {
      const keepMedia = !imageUrls.length && existing.media?.images?.length;
      const prevMedia = keepMedia ? existing.media : null;
      Object.assign(existing, fields);
      if (prevMedia) existing.media = prevMedia;
      if (salePrice == null && existing.pricing) {
        existing.pricing.salePrice = undefined;
      }
      await existing.save();
      updated += 1;
    } else {
      await Product.create({ ...fields, slug });
      created += 1;
    }
  }

  // Fix: for updates with empty images we may have wiped images. Re-run safer:
  // Actually for new imports all images are empty by design. For re-run of same batch,
  // if product had images added in admin, we wiped them. User said images empty on all rows
  // and they'll add later — first run is fine. For re-run, restore if we wiped.
  // I'll add a note; for safety fix products that had images before this import within this session — skip for first run.

  console.log(`\n  ${batchKey} result: +${created} created, ↻${updated} updated`);
  console.log(`  Products total now: ${await Product.countDocuments()}`);

  // Spot checks
  const spot = [
    "toyota-corolla-2014-2026-velvet-dashboard-mat",
    "kia-picanto-2019-2026-tpe-floor-mats-premium",
  ];
  console.log("\n  Spot-check fitment:");
  for (const s of spot) {
    const p = await Product.findOne({ slug: s })
      .populate("compatibleVehicles", "slug make model displayName")
      .populate("categories", "slug")
      .lean();
    if (!p) {
      console.log(`    ${s}: not in this batch / missing`);
      continue;
    }
    console.log(
      `    ${s}: cats=[${(p.categories || []).map((c) => c.slug).join("|")}] vehicles=[${(p.compatibleVehicles || [])
        .map((v) => v.slug)
        .join("|")}] universal=${p.isUniversal}`
    );
  }

  const report = {
    batch: batchKey,
    rows: rows.length,
    created,
    updated,
    unresolvedCategories: [...unresolvedCategories.entries()].map(([slug, count]) => ({ slug, count })),
    unresolvedVehicles: [...unresolvedVehicles.entries()].map(([slug, count]) => ({ slug, count })),
    noCategory,
    noVehicleWhenRequired,
    needImagesCount: needImages.length,
    notAutojinReal,
    notAutojinRealCount: notAutojinReal.length,
  };

  console.log("\n  ── Verification report ──");
  console.log(`  Unresolved category slugs: ${report.unresolvedCategories.length ? JSON.stringify(report.unresolvedCategories) : "none"}`);
  console.log(`  Unresolved vehicle slugs: ${report.unresolvedVehicles.length ? JSON.stringify(report.unresolvedVehicles) : "none"}`);
  console.log(`  Products with no category: ${noCategory.length ? noCategory.join(", ") : "none"}`);
  console.log(`  Non-universal with 0 vehicles: ${noVehicleWhenRequired.length ? noVehicleWhenRequired.join(", ") : "none"}`);
  console.log(`  Products needing images: ${needImages.length}`);
  console.log(`  priceSource != AUTOJIN-REAL: ${notAutojinReal.length}`);
  if (notAutojinReal.length) {
    for (const row of notAutojinReal) console.log(`    - ${row.slug} (${row.priceSource || "EMPTY"})`);
  }

  const outPath = path.join(__dirname, `report-${batchKey}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`  Wrote ${outPath}`);
  return report;
}

async function removeBatches23() {
  console.log(`\n═══ Remove previously imported Batch 2 & 3 (hold until prices final) ═══`);
  const slugs = [];
  for (const key of ["batch2", "batch3"]) {
    const rows = parseCsv(fs.readFileSync(FILES[key], "utf8"));
    for (const r of rows) {
      const s = String(r.slug || "").trim().toLowerCase();
      if (s) slugs.push(s);
    }
  }
  const unique = [...new Set(slugs)];
  const res = await Product.deleteMany({ slug: { $in: unique } });
  console.log(`  Deleted ${res.deletedCount} products (from ${unique.length} batch2/3 slugs)`);
  console.log(`  Products total now: ${await Product.countDocuments()}`);
}

async function verifyBatch1() {
  console.log(`\n═══ STEP 4: Verify Batch 1 only ═══`);
  const rows = parseCsv(fs.readFileSync(FILES.batch1, "utf8"));
  const batchSlugs = rows.map((r) => String(r.slug || "").trim().toLowerCase()).filter(Boolean);
  const totalProducts = await Product.countDocuments();
  const totalVehicles = await Vehicle.countDocuments();
  const found = await Product.countDocuments({ slug: { $in: batchSlugs } });

  const catChecks = ["dashboard-mats", "floor-mats", "wind-deflectors", "front-grilles"];
  console.log("  Category product counts:");
  for (const slug of catChecks) {
    const cat = await Category.findOne({ slug }).select("_id status").lean();
    if (!cat) {
      console.log(`    /categories/${slug}: MISSING`);
      continue;
    }
    const n = await Product.countDocuments({ status: "active", categories: cat._id });
    console.log(`    /categories/${slug}: status=${cat.status}, active products=${n}`);
  }

  for (const vs of ["kia-picanto-2019-present", "changan-alsvin-2021-present", "byd-atto3-2025-present"]) {
    const v = await Vehicle.findOne({ slug: vs }).select("_id displayName").lean();
    if (!v) {
      console.log(`  Car filter ${vs}: vehicle MISSING`);
      continue;
    }
    const n = await Product.countDocuments({
      status: "active",
      $or: [{ compatibleVehicles: v._id }, { isUniversal: true }],
    });
    console.log(`  Car filter ${v.displayName}: ${n} active products (fit + universal)`);
  }

  const notAutojinReal = [];
  for (const r of rows) {
    const src = String(r.priceSource || "").trim().toUpperCase();
    if (src !== "AUTOJIN-REAL") {
      notAutojinReal.push({ slug: String(r.slug || "").trim().toLowerCase(), priceSource: src || "EMPTY" });
    }
  }

  // Fitment integrity for imported batch1
  const badFit = [];
  for (const slug of batchSlugs) {
    const p = await Product.findOne({ slug }).select("isUniversal compatibleVehicles categories").lean();
    if (!p) continue;
    if (!(p.categories || []).length) badFit.push({ slug, issue: "no-category" });
    if (!p.isUniversal && !(p.compatibleVehicles || []).length) badFit.push({ slug, issue: "no-vehicle" });
  }

  console.log(`\n  Total products in DB: ${totalProducts} (expect 300 = 234+66 if batch2/3 removed)`);
  console.log(`  Total vehicles in DB: ${totalVehicles}`);
  console.log(`  Batch1 slugs found: ${found}/${batchSlugs.length}`);
  console.log(`  Fitment issues: ${badFit.length ? JSON.stringify(badFit) : "none"}`);
  console.log(`  priceSource != AUTOJIN-REAL: ${notAutojinReal.length}`);
  for (const row of notAutojinReal) console.log(`    - ${row.slug} (${row.priceSource})`);

  const report = { totalProducts, totalVehicles, found, batchCount: batchSlugs.length, badFit, notAutojinReal };
  fs.writeFileSync(path.join(__dirname, "report-batch1-verify.json"), JSON.stringify(report, null, 2));
  console.log("  Wrote report-batch1-verify.json");
  return report;
}

async function finalVerify() {
  console.log(`\n═══ STEP 4: Final verification ═══`);
  const totalProducts = await Product.countDocuments();
  const totalVehicles = await Vehicle.countDocuments();
  const batchSlugs = [];
  for (const key of ["batch1", "batch2", "batch3"]) {
    const rows = parseCsv(fs.readFileSync(FILES[key], "utf8"));
    batchSlugs.push(...rows.map((r) => String(r.slug || "").trim().toLowerCase()).filter(Boolean));
  }
  const uniqueBatch = [...new Set(batchSlugs)];
  const found = await Product.countDocuments({ slug: { $in: uniqueBatch } });
  const missing = [];
  for (const s of uniqueBatch) {
    const exists = await Product.exists({ slug: s });
    if (!exists) missing.push(s);
  }

  const catChecks = ["dashboard-mats", "floor-mats", "sun-shades", "trunk-mats", "car-curtains"];
  console.log("  Category product counts:");
  for (const slug of catChecks) {
    const cat = await Category.findOne({ slug }).select("_id status").lean();
    if (!cat) {
      console.log(`    /categories/${slug}: MISSING`);
      continue;
    }
    const n = await Product.countDocuments({
      status: "active",
      categories: cat._id,
    });
    console.log(`    /categories/${slug}: status=${cat.status}, active products=${n}`);
  }

  // KIA Picanto filter simulation
  const picanto = await Vehicle.findOne({ slug: "kia-picanto-2019-present" }).select("_id").lean();
  if (picanto) {
    const n = await Product.countDocuments({
      status: "active",
      $or: [{ compatibleVehicles: picanto._id }, { isUniversal: true }],
    });
    console.log(`  Car filter KIA Picanto (mats+universal active): ${n}`);
  }

  // Collect all ESTIMATE from all batches
  const allEstimate = [];
  for (const key of ["batch1", "batch2", "batch3"]) {
    const rows = parseCsv(fs.readFileSync(FILES[key], "utf8"));
    for (const r of rows) {
      if (String(r.priceSource || "").trim().toUpperCase() === "ESTIMATE") {
        allEstimate.push(String(r.slug || "").trim().toLowerCase());
      }
    }
  }

  const needImages = await Product.countDocuments({
    slug: { $in: uniqueBatch },
    $or: [
      { "media.images": { $size: 0 } },
      { "media.images": { $exists: false } },
      { "media.images.0.url": { $in: ["", null] } },
    ],
  });

  console.log(`\n  Total products in DB: ${totalProducts} (expect 371 = 234+137)`);
  console.log(`  Total vehicles in DB: ${totalVehicles}`);
  console.log(`  Batch product slugs found: ${found}/${uniqueBatch.length}`);
  if (missing.length) console.log(`  Missing batch slugs: ${missing.join(", ")}`);
  console.log(`  Batch products still needing images (approx): ${needImages}`);
  console.log(`  ESTIMATE price products (all batches): ${allEstimate.length}`);

  fs.writeFileSync(
    path.join(__dirname, "report-final.json"),
    JSON.stringify({ totalProducts, totalVehicles, found, missing, needImages, allEstimate }, null, 2)
  );
  console.log(`  Wrote report-final.json`);
  return { allEstimate };
}

async function main() {
  if (!MONGO_URI) {
    console.error("Set MONGO_URI / MONGODB_URI");
    process.exit(1);
  }
  const step = process.argv[2] || "all";
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  try {
    if (step === "remove23") {
      await removeBatches23();
    } else if (step === "batch1-only") {
      await removeBatches23();
      await importVehicles();
      await ensureCategories();
      await importProductBatch("batch1");
      await verifyBatch1();
    } else if (step === "vehicles") {
      await importVehicles();
    } else if (step === "categories") {
      await ensureCategories();
    } else if (step === "batch1") {
      await importProductBatch("batch1");
    } else if (step === "batch2") {
      await importProductBatch("batch2");
    } else if (step === "batch3") {
      await importProductBatch("batch3");
    } else if (step === "verify") {
      await finalVerify();
    } else if (step === "verify-batch1") {
      await verifyBatch1();
    } else {
      console.error(`Unknown step: ${step}`);
      process.exit(1);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

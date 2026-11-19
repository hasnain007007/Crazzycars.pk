#!/usr/bin/env node
/**
 * CrazzyCars.pk — Suzuki Side Mirror Indicators (Complete pack, 4 posters)
 *
 * Creates/updates DRAFT listings only. Owner PKR: sale 5199 / regular 7000.
 * Illustrative PNGs retained as masters; not treated as verified stock photos.
 *
 * Usage (store container, DB crazzycars_motorsports only):
 *   node ... --handoff=/path --out=/path
 *   node ... --apply --media-root=/app/media
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

const LIVE_DB = "crazzycars_motorsports";
const BATCH = "CC-SUZUKI-MIRROR-IND-4";
const IMPORT_PREFIX = "crazzycars-suzuki-mirror-ind:";
const EXPECTED = 4;
/** Owner-confirmed PKR (2026-11-20) — apply to all four SKUs */
const OWNER_SALE_PKR = 5199;
const OWNER_REGULAR_PKR = 7000;

const VEHICLE_SLUGS = {
  "Suzuki Fronx": [],
  "Suzuki Swift New": ["suzuki-swift-2025-present", "suzuki-swift-2018-2024"],
  "Suzuki Cultus New": ["suzuki-cultus-2017-present"],
  "Suzuki Alto New": ["suzuki-alto-2020-present"],
};

const ARTICLE = {
  "Suzuki Fronx": "CC-SMI-FRONX",
  "Suzuki Swift New": "CC-SMI-SWIFT",
  "Suzuki Cultus New": "CC-SMI-CULTUS",
  "Suzuki Alto New": "CC-SMI-ALTO",
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
function pngOk(buf) {
  return buf && buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50;
}
function mdToHtml(md) {
  const lines = String(md || "").split(/\n/);
  const out = [];
  let inList = false;
  const flushList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList();
      continue;
    }
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      flushList();
      out.push(`<h2>${escapeHtml(h2[1])}</h2>`);
      continue;
    }
    const li = line.match(/^[-*]\s+(.*)$/);
    if (li) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${escapeHtml(li[1])}</li>`);
      continue;
    }
    flushList();
    out.push(`<p>${escapeHtml(line)}</p>`);
  }
  flushList();
  return out.join("\n");
}
function whyBuy() {
  return `<h2>Why buy from CrazzyCars.pk?</h2>
<p>CrazzyCars.pk is a Gujranwala car accessories shop. Message WhatsApp 03284010007 with clear photos of your outside mirror and any existing indicator (plus model year and trim) so we can help match the lamp before you order. Cash on Delivery is available on eligible items. Delivery charges follow the current store shipping policy on crazzycars.pk.</p>`;
}
function holdReasons(row, vehicleSlugs) {
  const priceOk = OWNER_SALE_PKR > 0 && OWNER_REGULAR_PKR > OWNER_SALE_PKR;
  const blockers = (row.publish_blockers || []).filter(
    (r) => !/^confirm selling price$/i.test(String(r))
  );
  const reasons = [
    ...blockers,
    "illustrative poster — not verified stock photography",
    "LED / sequential / RGB / voltage claims not confirmed",
    "package quantity and LH/RH supply unconfirmed",
  ];
  if (!priceOk) reasons.unshift("selling price not supplied");
  if (!vehicleSlugs.length) reasons.push("no matching vehicle page slug (Fronx)");
  return [...new Set(reasons.map(String))];
}

async function writeDerivatives(destAbs) {
  try {
    const sharp = (await import("sharp")).default;
    const stem = destAbs.replace(/\.png$/i, "");
    for (const [suf, size, q] of [
      ["-sm", 200, 70],
      ["-400", 400, 72],
      ["-800", 1000, 78],
      ["-1200", 1200, 80],
    ]) {
      const out = `${stem}${suf}.webp`;
      if (fs.existsSync(out)) continue;
      await sharp(destAbs)
        .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
        .webp({ quality: q, effort: 4 })
        .toFile(out);
    }
  } catch (err) {
    console.warn("derivative_failed", path.basename(destAbs), String(err?.message || err));
  }
}

async function main() {
  const handoff = arg("handoff");
  if (!handoff || !fs.existsSync(handoff)) {
    console.error("Missing --handoff=/path (products.json + images/ + SHA256SUMS.txt)");
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

  const products = JSON.parse(fs.readFileSync(path.join(handoff, "products.json"), "utf8"));
  if (!Array.isArray(products) || products.length !== EXPECTED) {
    throw new Error(`Expected ${EXPECTED} products, got ${products?.length}`);
  }

  const sums = Object.fromEntries(
    fs
      .readFileSync(path.join(handoff, "SHA256SUMS.txt"), "utf8")
      .trim()
      .split(/\n/)
      .filter(Boolean)
      .map((line) => {
        const [hash, file] = line.trim().split(/\s+/);
        return [file.replace(/^\.\//, ""), hash];
      })
  );

  const rows = [];
  for (const row of products) {
    const abs = path.join(handoff, row.image);
    if (!fs.existsSync(abs)) throw new Error(`missing ${row.image}`);
    const buf = fs.readFileSync(abs);
    if (!pngOk(buf)) throw new Error(`not png ${row.image}`);
    const h = crypto.createHash("sha256").update(buf).digest("hex");
    const expected = sums[row.image] || sums[`./${row.image}`];
    if (expected && h !== expected) throw new Error(`sha mismatch ${row.image}`);
    if (row.selling_price != null && Number(row.selling_price) > 0) {
      throw new Error(`${row.slug}: pack must not invent selling_price`);
    }
    if (row.compare_at_price != null && Number(row.compare_at_price) > 0) {
      throw new Error(`${row.slug}: pack must not invent compare_at_price`);
    }
    rows.push({ ...row, _abs: abs, _sha: h, _asset: path.basename(row.image, ".png") });
  }
  console.log(`SHA OK suzuki-mirror-ind=${rows.length}`);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (db.databaseName !== LIVE_DB) {
    console.error(`REFUSE connected ${db.databaseName}`);
    process.exit(2);
  }
  const Product = db.collection("products");
  const Category = db.collection("categories");
  const Vehicle = db.collection("vehicles");

  const ledLighting = await Category.findOne({ slug: "led-lighting" });
  const ledIndicators = await Category.findOne({ slug: "led-indicator-lights" });
  if (!ledLighting || !ledIndicators) throw new Error("Missing led-lighting / led-indicator-lights");

  const slugs = rows.map((r) => r.slug);
  const importKeys = rows.map((r) => `${IMPORT_PREFIX}${r._asset}`);
  const preDocs = await Product.find({
    $or: [{ slug: { $in: slugs } }, { importKey: { $in: importKeys } }, { tags: BATCH }],
  }).toArray();
  const preBackup = path.join(outDir, "backup-before-suzuki-mirror-ind.pre.json");
  fs.writeFileSync(
    preBackup,
    JSON.stringify(
      {
        created_at: new Date().toISOString(),
        phase: "pre",
        dry_run: dryRun,
        db: LIVE_DB,
        batch: BATCH,
        count: preDocs.length,
        products: preDocs,
      },
      null,
      2
    )
  );
  console.log(`pre-backup ${preDocs.length} -> ${preBackup}`);

  // Duplicate guard: existing active Suzuki mirror indicators (none expected)
  for (const row of rows) {
    const dup = await Product.findOne({
      status: "active",
      $or: [
        { slug: row.slug },
        {
          name: new RegExp(
            `side mirror indicator.*${row.vehicle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
            "i"
          ),
        },
      ],
    });
    if (dup && dup.status === "active" && Number(dup.pricing?.salePrice) > 0) {
      console.warn(
        "NOTE existing active listing (will not overwrite with draft poster as primary):",
        dup.slug
      );
    }
  }

  const mediaRootProducts = path.join(mediaRoot, "products");
  const plan = {
    dry_run: dryRun,
    created_at: new Date().toISOString(),
    batch: BATCH,
    policy: {
      status: "draft_only",
      price: `owner_sale_${OWNER_SALE_PKR}_regular_${OWNER_REGULAR_PKR}`,
      compare_at: "regularPrice_as_list",
      images: "illustrative_poster_as_main_for_new_drafts",
      currency: "PKR",
    },
    summary: { creates: 0, updates: 0, published: 0 },
    review_table: [],
    backup_path: preBackup,
  };

  for (const row of rows) {
    const vehicleSlugs = VEHICLE_SLUGS[row.vehicle] || [];
    const importKey = `${IMPORT_PREFIX}${row._asset}`;
    const articleNo = ARTICLE[row.vehicle];
    if (!articleNo) throw new Error(`no article for ${row.vehicle}`);
    const hold = holdReasons(row, vehicleSlugs);

    const vehicleDocs = [];
    for (const vs of vehicleSlugs) {
      const v = await Vehicle.findOne(
        { slug: vs },
        { projection: { _id: 1, slug: 1, name: 1, make: 1, model: 1 } }
      );
      if (v) vehicleDocs.push(v);
    }

    const destName = `smi-${row._asset}-${shortHash(row._sha)}.png`;
    const destAbs = path.join(mediaRootProducts, destName);
    const destUrl = `/media/products/${destName}`;
    const alt = row.image_alt || `${row.title} — illustrative preview — CrazzyCars.pk`;

    const longHtml = `${mdToHtml(row.description)}\n${whyBuy()}
<p><strong>Draft blockers:</strong> ${escapeHtml(hold.join("; "))}.</p>`;

    const existing =
      (await Product.findOne({ importKey })) ||
      (await Product.findOne({ articleNo })) ||
      (await Product.findOne({ slug: row.slug }));

    // Never replace an active verified listing's primary gallery with this poster
    if (existing && existing.status === "active" && Number(existing.pricing?.salePrice) > 0) {
      const prev = Array.isArray(existing.media?.images) ? [...existing.media.images] : [];
      const already = prev.some((i) => String(i.url || "").includes(shortHash(row._sha)));
      plan.review_table.push({
        proposed_reference: row.proposed_reference,
        product_id: String(existing._id),
        sku: existing.articleNo,
        vehicle: row.vehicle,
        file: row.image,
        title: existing.name,
        draft_state: existing.status,
        price_state: existing.pricing?.salePrice ?? null,
        disposition: already ? "active_skip_poster_present" : "active_append_poster_only",
        unresolved: hold,
        live_url: `https://crazzycars.pk/${existing.slug}`,
      });
      if (!dryRun && !already) {
        fs.mkdirSync(mediaRootProducts, { recursive: true });
        if (!fs.existsSync(destAbs)) fs.copyFileSync(row._abs, destAbs);
        await writeDerivatives(destAbs);
        await Product.updateOne(
          { _id: existing._id },
          {
            $set: {
              "media.images": [
                ...prev.map((img, idx) => ({ ...img, isMain: idx === 0 ? img.isMain !== false : false })),
                {
                  url: destUrl,
                  publicId: "",
                  isMain: false,
                  altText: alt,
                  alt,
                  label: "Illustrative vehicle-reference poster",
                  imageName: row.title,
                },
              ],
              updatedAt: new Date(),
              tags: Array.from(new Set([...(existing.tags || []).map(String), BATCH, importKey])),
            },
          }
        );
      }
      continue;
    }

    const setDoc = {
      name: row.title,
      slug: row.slug,
      articleNo,
      importKey,
      shortDescription: row.short_description,
      longDescription: longHtml,
      features: [
        "Side mirror indicator (door-mirror turn lamp) — not a complete mirror assembly",
        "Illustrative poster with vehicle reference — not verified stock photography",
        "Confirm year, trim, lens contour, mounting tabs, connector, and LH/RH before ordering",
        "Package quantity (single vs pair) unconfirmed",
        "Do not assume LED, sequential, RGB, DRL, OEM, or plug-and-play without stock evidence",
      ],
      specifications: [
        { label: "Product", value: "Side mirror indicator" },
        { label: "Vehicle reference", value: row.vehicle },
        { label: "Currency", value: "PKR" },
        { label: "Sale price (PKR)", value: String(OWNER_SALE_PKR) },
        { label: "Regular price (PKR)", value: String(OWNER_REGULAR_PKR) },
        { label: "Package quantity", value: "Unconfirmed" },
        { label: "Light source", value: "Unconfirmed" },
        { label: "Listing code", value: articleNo },
        { label: "Condition", value: "New" },
        { label: "Image status", value: "AI illustration — not verified stock photo" },
      ],
      pricing: {
        regularPrice: OWNER_REGULAR_PKR,
        salePrice: OWNER_SALE_PKR,
        costPerItem: 0,
        saleSchedule: { enabled: false },
      },
      inventory: {
        // Owner reports available; no count supplied — do not invent quantity
        quantity: 0,
        trackInventory: false,
        allowBackorder: false,
        lowStockThreshold: 0,
        weight: 0,
        weightUnit: "g",
        sku: articleNo,
      },
      media: {
        images: [
          {
            url: destUrl,
            publicId: "",
            isMain: true,
            altText: alt,
            alt,
            label: "Illustrative vehicle-reference poster",
            imageName: row.title,
            width: 0,
            height: 0,
          },
        ],
        videos: [],
      },
      categories: [ledLighting._id, ledIndicators._id],
      primaryCategorySlug: "led-indicator-lights",
      tags: Array.from(
        new Set([
          BATCH,
          importKey,
          ...(row.tags || []),
          "side mirror indicator",
          "mirror turn signal",
          row.vehicle,
        ])
      ),
      isUniversal: false,
      isBulky: false,
      codEligible: false,
      codEnabled: false,
      vehicleCompatibility: {
        fitmentType: "specific",
        universalNote:
          "Vehicle body/year context is not verified compatibility for the loose part. Confirm mirror housing and lamp shape before ordering.",
        vehicles: vehicleDocs.map((v) => ({
          vehicle: v._id,
          slug: v.slug,
          label: v.name || v.slug,
        })),
        categories: [],
      },
      compatibleCars: vehicleDocs.map((v) => ({
        slug: v.slug,
        name: v.name || v.slug,
        make: v.make || "Suzuki",
        model: v.model || "",
      })),
      compatibleVehicles: vehicleDocs.map((v) => v._id),
      primaryCarSlug: vehicleDocs[0]?.slug || "",
      metaTitle: row.meta_title,
      metaDescription: row.meta_description,
      seo: {
        metaTitle: row.meta_title,
        metaDescription: row.meta_description,
        metaKeywords: row.tags || [],
        excludeFromMerchantFeed: true,
        excludeFromSitemap: true,
        excludeFromListings: true,
        robots: "noindex,nofollow",
        omitProductSchemaImage: false,
      },
      status: "draft",
      securityHold: true,
      securityHoldReason: `Suzuki mirror indicator hold: ${hold.join("; ")}`,
      vendor: "CrazzyCars.pk",
      condition: "new",
      segment: "car",
      metadata: {
        batch_id: BATCH,
        proposed_reference: row.proposed_reference,
        sha256: row._sha,
        hold_reasons: hold,
        unconfirmed_fields: (row.unconfirmed_fields || []).filter(
          (f) => String(f).toLowerCase() !== "selling price"
        ),
        publish_blockers: (row.publish_blockers || []).filter(
          (r) => !/^confirm selling price$/i.test(String(r))
        ),
        owner_reports_available: true,
        stock_quantity: null,
        pricing_source: "owner_confirmed_2026-11-20",
        owner_sale_price_pkr: OWNER_SALE_PKR,
        owner_regular_price_pkr: OWNER_REGULAR_PKR,
        currency: "PKR",
        image_status: row.image_status,
        research_note: row.research_note || "",
        research_source: row.research_source || "",
        vehicle_slugs: vehicleSlugs,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const action = existing ? "draft_update" : "create_draft";
    if (existing) plan.summary.updates += 1;
    else plan.summary.creates += 1;

    plan.review_table.push({
      proposed_reference: row.proposed_reference,
      product_id: existing ? String(existing._id) : null,
      sku: articleNo,
      vehicle: row.vehicle,
      file: row.image,
      title: row.title,
      draft_state: "draft",
      price_state: OWNER_SALE_PKR,
      disposition: action,
      unresolved: hold,
      live_url: `https://crazzycars.pk/${row.slug}`,
    });

    if (!dryRun) {
      fs.mkdirSync(mediaRootProducts, { recursive: true });
      if (!fs.existsSync(destAbs)) fs.copyFileSync(row._abs, destAbs);
      if (sha256File(destAbs) !== row._sha) throw new Error(`post-copy sha ${destName}`);
      await writeDerivatives(destAbs);
      if (existing) {
        await Product.updateOne(
          { _id: existing._id },
          { $set: { ...setDoc, createdAt: existing.createdAt || setDoc.createdAt } }
        );
        console.log("draft_update", row.slug, String(existing._id));
      } else {
        const ins = await Product.insertOne(setDoc);
        console.log("created_draft", String(ins.insertedId), row.slug);
      }
    }
  }

  const planPath = path.join(outDir, "plan-suzuki-mirror-ind.json");
  const mdPath = path.join(outDir, "review-suzuki-mirror-ind.md");
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
  fs.writeFileSync(
    mdPath,
    [
      `# Suzuki Side Mirror Indicators — review`,
      ``,
      `| Ref | SKU | Vehicle | Title | State | Price | Disposition |`,
      `|-----|-----|---------|-------|-------|-------|-------------|`,
      ...plan.review_table.map(
        (r) =>
          `| ${r.proposed_reference} | ${r.sku} | ${r.vehicle} | ${String(r.title).replace(
            /\|/g,
            "/"
          )} | ${r.draft_state} | ${r.price_state} | ${r.disposition} |`
      ),
      ``,
      `Published: **0**. Prices: **unset**.`,
      `Summary: ${JSON.stringify(plan.summary)}`,
    ].join("\n")
  );
  console.log(JSON.stringify(plan.summary, null, 2));
  console.log(`plan -> ${planPath}`);
  console.log(`review -> ${mdPath}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

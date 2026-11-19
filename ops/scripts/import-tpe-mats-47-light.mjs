#!/usr/bin/env node
/**
 * CrazzyCars.pk — TPE Floor Mats catalogue (47 Light pack)
 *
 * Pack: AI illustrative mat-style cards (shared mold artwork). Catalogue marks
 * model_specific_mold_verified=false for every row — do NOT treat as proof of
 * exact-fit molds. New parents stay draft + securityHold.
 *
 * Existing active TPE listings: append the matching PNG (never replace primary),
 * apply owner price tiers when provided, preserve galleries & stock.
 *
 * Usage (store container, DB crazzycars_motorsports only):
 *   node ops/scripts/import-tpe-mats-47-light.mjs --handoff=/path --out=/path
 *   node ... --apply --media-root=/app/media
 *   node ... --apply --publish --media-root=/app/media   # still will not publish unverified new parents
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

const LIVE_DB = "crazzycars_motorsports";
const BATCH = "CC-TPE-MATS-47-LIGHT";
const EXPECTED_ROWS = 47;
const IMPORT_PREFIX = "crazzycars-tpe-mats-47:";

const FIT_NOTE =
  "TPE (thermoplastic elastomer) floor mat set styled for this vehicle reference. Artwork in this pack is a shared illustrative mat style — not proof of a model-specific mold, RHD pedal clearance, or third-row coverage. Confirm the physical set against your car before ordering.";

/**
 * Price tiers (PKR sale price only — no compare-at / discount claims).
 * null = leave pending (do not invent; preserve existing salePrice on merges).
 */
function priceFor(row) {
  const id = row.id;
  if (id === "03-tank-500-5-seater" || id === "04-tank-500-7-seater") return 11999;
  // Chinese brands (incl. Alsvin)
  if (
    /^(01-deepal|02-deepal|23-changan|24-changan|25-changan|26-haval|27-haval|28-byd|29-byd|30-byd|31-byd|32-jac|33-jaecoo|34-jaecoo|35-jaecoo|37-aion|38-omoda)/.test(
      id
    )
  ) {
    return 9000;
  }
  // Local sedans + Alto
  if (
    /^(05-toyota-corolla|06-toyota-corolla|07-toyota-corolla|08-toyota-yaris|12-honda-civic|13-honda-civic|14-honda-civic|15-honda-civic|16-honda-city|17-honda-city|18-suzuki-alto)/.test(
      id
    )
  ) {
    return 6999;
  }
  return null; // pending
}

/**
 * Map catalogue id → existing product slug to merge into (append image).
 * Distinct 5/7 seat and missing generations create new parents instead.
 */
const MERGE_SLUG = {
  "06-toyota-corolla-2010-14": "toyota-corolla-2008-2013-tpe-floor-mats-premium",
  "07-toyota-corolla-2016-present": "toyota-corolla-2014-2026-tpe-floor-mats-premium",
  "08-toyota-yaris": "toyota-yaris-2020-2026-tpe-floor-mats-premium",
  "11-toyota-raize-2024-": "toyota-raize-2019-2026-tpe-floor-mats-premium",
  "12-honda-civic-reborn": "honda-civic-2007-2011-tpe-floor-mats-premium",
  "14-honda-civic-2016-21": "honda-civic-2016-2021-tpe-floor-mats-premium",
  "15-honda-civic-2022-": "honda-civic-2022-2026-tpe-floor-mats-premium",
  "16-honda-city-2015": "honda-city-2009-2020-tpe-floor-mats-premium",
  "17-honda-city-2022-": "honda-city-2021-2026-tpe-floor-mats-premium",
  "18-suzuki-alto-new": "suzuki-alto-2019-2026-tpe-floor-mats-premium",
  "19-suzuki-cultus-new": "suzuki-cultus-2017-2026-tpe-floor-mats-premium",
  "20-suzuki-swift-new": "suzuki-swift-2022-2026-tpe-floor-mats-premium",
  "23-changan-oshan-x7-5-seater": "changan-oshan-x7-2022-2026-tpe-floor-mats-premium",
  "26-haval-h6-2021-": "haval-h6-2023-2026-tpe-floor-mats-premium",
  "28-byd-atto-3": "byd-atto-3-2025-2026-tpe-floor-mats-premium",
  "39-toyota-corolla-cross": "toyota-corolla-cross-2020-2026-tpe-floor-mats-premium",
  "40-honda-br-v": "honda-br-v-2017-2026-tpe-floor-mats-premium",
  "41-honda-vezel": "honda-vezel-2013-2020-tpe-floor-mats-premium",
  "43-kia-sportage": "kia-sportage-2019-2024-tpe-floor-mats-premium",
  "46-hyundai-tucson": "hyundai-tucson-2020-2024-tpe-floor-mats-premium",
};

/** Vehicle page slug(s) for new drafts / compatibility tags. */
const VEHICLE_SLUGS = {
  "01-deepal-s05": ["deepal-s05-2024-present"],
  "02-deepal-s07": [],
  "03-tank-500-5-seater": [],
  "04-tank-500-7-seater": [],
  "05-toyota-corolla-2006-08": ["toyota-corolla-e120-2002-2008"],
  "06-toyota-corolla-2010-14": ["toyota-corolla-e140-2009-2014"],
  "07-toyota-corolla-2016-present": ["toyota-corolla-e170-2014-2026"],
  "08-toyota-yaris": ["toyota-yaris-2020-present"],
  "09-toyota-prius-2012-14": ["toyota-prius-2009-2015"],
  "10-toyota-prius-2016-20": ["toyota-prius-2016-2022"],
  "11-toyota-raize-2024-": ["toyota-raize-2019-present"],
  "12-honda-civic-reborn": ["honda-civic-reborn-2006-2012"],
  "13-honda-civic-rebirth": ["honda-civic-rebirth-2012-2016"],
  "14-honda-civic-2016-21": ["honda-civic-x-2016-2021"],
  "15-honda-civic-2022-": ["honda-civic-11th-gen-2022-present"],
  "16-honda-city-2015": ["honda-city-classic-2009-2020"],
  "17-honda-city-2022-": ["honda-city-2021-present"],
  "18-suzuki-alto-new": ["suzuki-alto-2020-present"],
  "19-suzuki-cultus-new": ["suzuki-cultus-2017-present"],
  "20-suzuki-swift-new": ["suzuki-swift-2025-present", "suzuki-swift-2018-2024"],
  "21-suzuki-wagon-r-2014-": ["suzuki-wagonr-2014-present"],
  "22-suzuki-fronx": [],
  "23-changan-oshan-x7-5-seater": ["changan-oshanx7-2022-present"],
  "24-changan-oshan-x7-7-seater": ["changan-oshanx7-2022-present"],
  "25-changan-alsvin": ["changan-alsvin-2021-present"],
  "26-haval-h6-2021-": ["haval-h6-2021-present"],
  "27-haval-jolion": ["haval-jolion-hev-2024-present"],
  "28-byd-atto-3": ["byd-atto3-2025-present"],
  "29-byd-shark-6": ["byd-shark6-2025-present"],
  "30-byd-seal": [],
  "31-byd-sealion-7": [],
  "32-jac-hunter-t9": [],
  "33-jaecoo-j5": ["jaecoo-j5-hev-premium-2026"],
  "34-jaecoo-j6": [],
  "35-jaecoo-j7-phev": ["jaecoo-j7-shsp-premium-2025-present"],
  "36-hyundai-palisade": [],
  "37-aion-ut": [],
  "38-omoda-e5": [],
  "39-toyota-corolla-cross": ["toyota-corolla-cross-2020-present"],
  "40-honda-br-v": ["honda-brv-2017-present"],
  "41-honda-vezel": ["honda-vezel-2013-2018", "honda-vezel-2020-2026"],
  "42-kia-sorento-new": ["kia-sorento-2021-2024"],
  "43-kia-sportage": ["kia-sportage-2019-2024"],
  "44-hyundai-sonata": ["hyundai-sonata-2020-2024"],
  "45-hyundai-elantra": ["hyundai-elantra-2020-2024"],
  "46-hyundai-tucson": ["hyundai-tucson-2020-2024"],
  "47-toyota-vitz": ["toyota-vitz-2012-present"],
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
function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/·/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function pngOk(buf, w, h) {
  if (!buf || buf.length < 24) return false;
  if (buf[0] !== 0x89 || buf[1] !== 0x50) return false;
  return buf.readUInt32BE(16) === w && buf.readUInt32BE(20) === h;
}

function displayTitle(row) {
  // Example: TPE Floor Mats for Honda Civic 2016–2021 | CrazzyCars.pk  (store name omits brand suffix in name field; SEO title adds it)
  const m = String(row.model || "").replace(/\s+/g, " ").trim();
  if (row.id === "11-toyota-raize-2024-") {
    return "TPE Floor Mats for Toyota Raize 2024+ (Reiz label resolved as Raize)";
  }
  if (row.id === "33-jaecoo-j5") {
    return "TPE Floor Mats for JAECOO J5";
  }
  if (row.id === "04-tank-500-7-seater" || row.id === "24-changan-oshan-x7-7-seater") {
    return `TPE Floor Mats for ${m} (front & 2nd-row style)`;
  }
  return `TPE Floor Mats for ${m}`;
}

function productSlugForNew(row) {
  const base = slugify(row.model).replace(/-seater/, "-seater");
  return `${base}-tpe-floor-mats`;
}

function yearLabel(row) {
  const m = String(row.model || "");
  const hit = m.match(/(\d{4})\s*[–\-]\s*(\d{2,4}|[Pp]resent|\+)/);
  if (hit) return `${hit[1]}–${hit[2]}`;
  const plus = m.match(/(\d{4})\+/);
  if (plus) return `${plus[1]}+`;
  return "";
}

function holdReasons(row, vehicleSlugs, price) {
  const reasons = [];
  reasons.push("catalogue model_specific_mold_verified=false — shared illustrative artwork, not mold proof");
  if (!vehicleSlugs.length) reasons.push("no matching vehicle page slug mapped yet");
  if (price == null) reasons.push("selling price pending — owner did not supply a price for this vehicle class");
  if (row.id === "04-tank-500-7-seater" || row.id === "24-changan-oshan-x7-7-seater") {
    reasons.push("7-seat listing: third-row mat coverage not shown / not verified");
  }
  if (row.id === "11-toyota-raize-2024-") {
    reasons.push("owner typed Reiz — interpreted as Toyota Raize pending confirmation");
  }
  if (row.id === "33-jaecoo-j5") {
    reasons.push("J5 powertrain/PHEV trim unresolved — titled as JAECOO J5 only");
  }
  if (
    /^(36-hyundai-palisade|42-kia-sorento|43-kia-sportage|44-hyundai-sonata|45-hyundai-elantra|46-hyundai-tucson|47-toyota-vitz)$/.test(
      row.id
    ) ||
    row.id === "39-toyota-corolla-cross" ||
    row.id === "40-honda-br-v" ||
    row.id === "41-honda-vezel"
  ) {
    reasons.push("generation/seating not fully resolved for exact-fit publish");
  }
  reasons.push("RHD pedal clearance not physically verified against stock set");
  return [...new Set(reasons)];
}

function whyBuy() {
  return `<h2>Why buy from CrazzyCars.pk?</h2>
<p>CrazzyCars.pk is a Gujranwala car accessories shop. Message WhatsApp 03284010007 with your car’s make, model and year (and a cabin floor photo if you can) so we can help confirm the mat set before you order. Cash on Delivery is available on eligible items. Delivery charges follow the current store shipping policy on crazzycars.pk. Floor mats are treated as bulky freight when the cart rules say so.</p>`;
}

function buildLongDescription(row, title, vehicleSlugs, hold, price) {
  const seats =
    /7-seater|7-Seater/i.test(row.model)
      ? `<p><strong>Seating note:</strong> This listing is labelled for a 7-seat cabin. The pack artwork shows a front-and-second-row mat style only — do not assume a third-row mat is included until we confirm the physical set.</p>`
      : /5-seater|5-Seater/i.test(row.model)
        ? `<p><strong>Seating note:</strong> Labelled for a 5-seat cabin. Confirm the set against your vehicle before ordering.</p>`
        : "";
  const vehNote = vehicleSlugs.length
    ? `<p>Car pages linked for browsing: ${vehicleSlugs
        .map((s) => `<a href="/cars/${escapeHtml(s)}">${escapeHtml(s)}</a>`)
        .join(", ")}. Still confirm the physical mats on your exact vehicle.</p>`
    : `<p>Vehicle page mapping is incomplete for this listing — confirm fitment with us before purchase.</p>`;
  const priceNote =
    price != null
      ? `<p>Listed sale price: <strong>Rs. ${price.toLocaleString("en-PK")}</strong> (PKR). No crossed-out / “was” price is claimed for this pack.</p>`
      : `<p>Sale price is pending owner confirmation for this vehicle class.</p>`;
  const holdNote = hold.length
    ? `<p><strong>Listing status:</strong> ${escapeHtml(hold.join("; "))}.</p>`
    : "";
  return `<p>${escapeHtml(
    title
  )} — thermoplastic elastomer (TPE) floor mats presented with a ${escapeHtml(
    row.model
  )} vehicle reference.</p>
<h2>What we can confirm from this pack</h2>
<ul>
<li>Material style: TPE floor mats (thermoplastic elastomer)</li>
<li>Artwork shows a multi-piece cabin mat layout (illustrative)</li>
<li>Vehicle reference on the card: ${escapeHtml(row.model)}</li>
</ul>
<h2>What these images are not</h2>
<ul>
<li>Not proof that one shared mold fits every vehicle in this 47-card set</li>
<li>Not OEM / genuine factory mats</li>
<li>Not a guarantee of RHD pedal cut-outs, clips, colours, or third-row coverage</li>
<li>Not fitted photography of verified CrazzyCars warehouse stock for this exact mold</li>
</ul>
${seats}
${priceNote}
${vehNote}
${holdNote}
<h2>Before you order</h2>
<ul>
<li>Compare the physical mat outlines to your driver footwell, tunnel and rear footwells.</li>
<li>Pakistan market cars are right-hand drive — check pedal clearance on the driver’s side.</li>
<li>For 7-seat vehicles, ask us specifically about third-row pieces.</li>
</ul>
${whyBuy()}`;
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

function imageAlreadyPresent(doc, sha) {
  const urls = (doc?.media?.images || []).map((i) => String(i.url || ""));
  const tag = shortHash(sha);
  return urls.some((u) => u.includes(tag) || u.includes(`tpe47-${sha.slice(0, 10)}`));
}

async function main() {
  const handoff = arg("handoff");
  if (!handoff || !fs.existsSync(handoff)) {
    console.error("Missing --handoff=/path (CATALOGUE.json + images/)");
    process.exit(2);
  }
  const dryRun = !hasFlag("apply");
  const publish = hasFlag("publish"); // intentionally does not publish unverified new parents
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

  const catalogue = JSON.parse(fs.readFileSync(path.join(handoff, "CATALOGUE.json"), "utf8"));
  if (!Array.isArray(catalogue) || catalogue.length !== EXPECTED_ROWS) {
    throw new Error(`Expected ${EXPECTED_ROWS} rows, got ${catalogue?.length}`);
  }

  const rows = [];
  for (const row of catalogue) {
    const abs = path.join(handoff, row.image);
    if (!fs.existsSync(abs)) throw new Error(`missing ${row.image}`);
    const buf = fs.readFileSync(abs);
    const h = crypto.createHash("sha256").update(buf).digest("hex");
    if (row.sha256 && h !== row.sha256) throw new Error(`sha mismatch ${row.id}`);
    if (!pngOk(buf, row.width || 1254, row.height || 1254)) throw new Error(`dims ${row.id}`);
    if (row.model_specific_mold_verified === true) {
      throw new Error(`${row.id}: unexpected mold_verified=true in this pack`);
    }
    rows.push({ ...row, _abs: abs, _sha: h, _price: priceFor(row) });
  }
  console.log(`SHA OK tpe47=${rows.length}`);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (db.databaseName !== LIVE_DB) {
    console.error(`REFUSE connected ${db.databaseName}`);
    process.exit(2);
  }
  const Product = db.collection("products");
  const Category = db.collection("categories");
  const Vehicle = db.collection("vehicles");

  const interior = await Category.findOne({ slug: "interior" });
  const floorMats = await Category.findOne({ slug: "floor-mats" });
  if (!interior || !floorMats) throw new Error("Missing interior / floor-mats categories");

  const mergeSlugs = [...new Set(Object.values(MERGE_SLUG))];
  const importKeys = rows.map((r) => `${IMPORT_PREFIX}${r.id}`);
  const newSlugs = rows.filter((r) => !MERGE_SLUG[r.id]).map((r) => productSlugForNew(r));

  const preDocs = await Product.find({
    $or: [
      { importKey: { $in: importKeys } },
      { slug: { $in: [...mergeSlugs, ...newSlugs] } },
      { tags: BATCH },
    ],
  }).toArray();
  const preBackupFile = path.join(outDir, "backup-before-tpe47.pre.json");
  fs.writeFileSync(
    preBackupFile,
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
  console.log(`pre-backup ${preDocs.length} -> ${preBackupFile}`);

  const mediaRootProducts = path.join(mediaRoot, "products");
  const plan = {
    dry_run: dryRun,
    created_at: new Date().toISOString(),
    batch: BATCH,
    publish_flag: publish,
    policy: {
      mold_verified: false,
      new_parents: "always_draft_securityHold",
      merges: "append_image_keep_primary_update_price_when_tiered",
      compare_at: "never_set_from_this_pack",
      currency: "PKR pricing.salePrice",
    },
    summary: {
      catalogue_rows: EXPECTED_ROWS,
      merges: 0,
      merge_skips_image_present: 0,
      draft_creates: 0,
      draft_updates: 0,
      price_updates: 0,
      published_new: 0,
    },
    review_table: [],
    products: [],
    backup_path: preBackupFile,
  };

  for (const row of rows) {
    const vehicleSlugs = VEHICLE_SLUGS[row.id] || [];
    const price = row._price;
    const hold = holdReasons(row, vehicleSlugs, price);
    const title = displayTitle(row);
    const importKey = `${IMPORT_PREFIX}${row.id}`;
    const mergeSlug = MERGE_SLUG[row.id] || null;

    const vehicleDocs = [];
    for (const vs of vehicleSlugs) {
      const v = await Vehicle.findOne(
        { slug: vs },
        { projection: { _id: 1, slug: 1, name: 1, make: 1, model: 1 } }
      );
      if (v) vehicleDocs.push(v);
    }

    const destName = `tpe47-${row.id}-${shortHash(row._sha)}.png`;
    const destAbs = path.join(mediaRootProducts, destName);
    const destUrl = `/media/products/${destName}`;
    const altText = `${title} – TPE floor mats vehicle reference card – CrazzyCars.pk`;

    let existing =
      (await Product.findOne({ importKey })) ||
      (mergeSlug ? await Product.findOne({ slug: mergeSlug }) : null) ||
      (await Product.findOne({ slug: productSlugForNew(row) }));

    // --- MERGE onto existing active / draft parent ---
    if (existing && (mergeSlug || existing.importKey === importKey)) {
      const already = imageAlreadyPresent(existing, row._sha);
      const prevImages = Array.isArray(existing.media?.images) ? [...existing.media.images] : [];
      const nextImages = already
        ? prevImages
        : [
            ...prevImages.map((img, idx) => ({
              ...img,
              isMain: idx === 0 ? img.isMain !== false : false,
            })),
            {
              url: destUrl,
              publicId: "",
              isMain: false,
              altText,
              alt: altText,
              label: "Vehicle reference visualisation (TPE mats 47 Light)",
              imageName: title,
              width: 1254,
              height: 1254,
            },
          ];

      const priceUpdate =
        price != null && Number(existing.pricing?.salePrice) !== price
          ? { "pricing.salePrice": price }
          : {};
      // Never invent compare-at; clear only if we are setting sale and compare equals old nonsense? Leave compare as-is.
      if (Object.keys(priceUpdate).length) plan.summary.price_updates += 1;

      const action = already ? "merge_skip_image_present" : "merge_append_image";
      if (already) plan.summary.merge_skips_image_present += 1;
      else plan.summary.merges += 1;

      plan.review_table.push({
        catalogue_id: row.id,
        product_id: String(existing._id),
        title: existing.name,
        vehicle: row.model,
        image: destUrl,
        price_pkr: price != null ? price : existing.pricing?.salePrice ?? null,
        price_action: price != null ? `set_sale_${price}` : "preserve_existing_or_pending",
        fitment_evidence: "shared_AI_card_only",
        status: existing.status,
        disposition: action,
        blockers: hold,
        live_url: `https://crazzycars.pk/${existing.slug}`,
      });
      plan.products.push({
        action,
        catalogue_id: row.id,
        slug: existing.slug,
        existingId: String(existing._id),
        media_added: already ? [] : [destName],
        price,
        hold_reasons: hold,
      });

      if (!dryRun) {
        if (!already) {
          fs.mkdirSync(mediaRootProducts, { recursive: true });
          if (!fs.existsSync(destAbs)) fs.copyFileSync(row._abs, destAbs);
          if (sha256File(destAbs) !== row._sha) throw new Error(`post-copy sha ${destName}`);
          await writeDerivatives(destAbs);
        }
        const tags = Array.from(
          new Set([...(existing.tags || []).map(String), BATCH, importKey, "tpe floor mats", slugify(row.model)])
        );
        await Product.updateOne(
          { _id: existing._id },
          {
            $set: {
              ...(already ? {} : { "media.images": nextImages }),
              ...priceUpdate,
              tags,
              updatedAt: new Date(),
              [`metadata.${BATCH}`]: {
                catalogue_id: row.id,
                sha256: row._sha,
                merged_at: new Date().toISOString(),
                image: destUrl,
                price_tier_pkr: price,
                notes: row.notes || "",
              },
            },
          }
        );
        console.log(action, existing.slug, already ? "image_present" : destName, priceUpdate);
      }
      continue;
    }

    // --- CREATE draft parent (never auto-publish: mold not verified) ---
    const slug = productSlugForNew(row);
    const articleNo = `CC-TPE47-${row.id.replace(/[^a-z0-9]+/gi, "").toUpperCase().slice(0, 18)}`;
    const yl = yearLabel(row);
    const metaTitle = yl
      ? `TPE Floor Mats for ${row.model.replace(/\s*·\s*/g, " ")} | CrazzyCars.pk`
      : `${title} | CrazzyCars.pk`;
    const metaDescription = `TPE floor mats for ${row.model} in Pakistan. Confirm physical fitment before order. CrazzyCars.pk Gujranwala.`;

    const mediaImages = [
      {
        url: destUrl,
        publicId: "",
        isMain: true,
        altText,
        alt: altText,
        label: "Vehicle reference visualisation",
        imageName: title,
        width: 1254,
        height: 1254,
      },
    ];

    const setDoc = {
      name: title,
      slug,
      articleNo,
      importKey,
      shortDescription: `${title}. TPE cabin floor mats with a ${row.model} reference card. Illustrative shared-style artwork — confirm the physical set and RHD pedal clearance before ordering.`,
      longDescription: buildLongDescription(row, title, vehicleSlugs, hold, price),
      features: [
        FIT_NOTE,
        "Material: TPE (thermoplastic elastomer)",
        "Images: AI vehicle-reference cards (shared mat style)",
        "Not OEM / not a mold-fit guarantee from artwork alone",
        row.id.includes("7-seater")
          ? "7-seat label: third-row coverage not verified from artwork"
          : "Confirm piece count against the physical set",
      ],
      specifications: [
        { label: "Product", value: "TPE floor mats" },
        { label: "Material", value: "TPE (thermoplastic elastomer)" },
        { label: "Vehicle reference", value: row.model },
        { label: "Currency", value: "PKR" },
        {
          label: "Sale price (PKR)",
          value: price != null ? String(price) : "Pending",
        },
        { label: "Listing code", value: articleNo },
        { label: "Condition", value: "New" },
        { label: "Fitment evidence", value: "Artwork only — mold not verified in pack" },
      ],
      pricing: {
        regularPrice: price != null ? price : 0,
        salePrice: price != null ? price : null,
        costPerItem: 0,
        saleSchedule: { enabled: false },
      },
      inventory: {
        quantity: 0,
        trackInventory: true,
        allowBackorder: false,
        lowStockThreshold: 5,
        weight: 0,
        weightUnit: "kg",
        sku: articleNo,
      },
      media: { images: mediaImages, videos: [] },
      categories: [interior._id, floorMats._id],
      primaryCategorySlug: "floor-mats",
      tags: Array.from(
        new Set([
          BATCH,
          importKey,
          "tpe floor mats",
          "floor mats",
          "tpe mats",
          slugify(row.model),
          row.model.toLowerCase(),
          "pakistan",
        ])
      ),
      isUniversal: false,
      isBulky: true,
      codEligible: true,
      codEnabled: true,
      vehicleCompatibility: {
        fitmentType: "specific",
        universalNote: FIT_NOTE,
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
        make: v.make || "",
        model: v.model || "",
      })),
      compatibleVehicles: vehicleDocs.map((v) => v._id),
      primaryCarSlug: vehicleDocs[0]?.slug || "",
      metaTitle,
      metaDescription,
      seo: {
        metaTitle,
        metaDescription,
        metaKeywords: [row.model, "TPE floor mats", "Pakistan", "CrazzyCars.pk"],
        excludeFromMerchantFeed: true,
        excludeFromSitemap: true,
        excludeFromListings: true,
        robots: "noindex,nofollow",
        omitProductSchemaImage: false,
      },
      status: "draft",
      securityHold: true,
      securityHoldReason: `TPE mats 47 Light hold: ${hold.join("; ")}`,
      vendor: "CrazzyCars.pk",
      condition: "new",
      segment: "car",
      metadata: {
        batch_id: BATCH,
        catalogue_id: row.id,
        sha256: row._sha,
        hold_reasons: hold,
        vehicle_slugs: vehicleSlugs,
        price_tier_pkr: price,
        pricing_source: price != null ? "owner_tier_pkr" : "pending",
        currency: "PKR",
        image_kind: "AI illustrative mat-style card; shared source set",
        notes: row.notes || "",
        reiz_resolved_as_raize: row.id === "11-toyota-raize-2024-",
        jaecoo_j5_no_phev_assumption: row.id === "33-jaecoo-j5",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Idempotent update if draft already exists under importKey/slug
    if (existing) {
      plan.summary.draft_updates += 1;
      plan.review_table.push({
        catalogue_id: row.id,
        product_id: String(existing._id),
        title,
        vehicle: row.model,
        image: destUrl,
        price_pkr: price,
        fitment_evidence: "shared_AI_card_only",
        status: "draft",
        disposition: "draft_update",
        blockers: hold,
        live_url: `https://crazzycars.pk/${slug}`,
      });
      plan.products.push({
        action: "draft_update",
        catalogue_id: row.id,
        slug,
        existingId: String(existing._id),
        price,
        hold_reasons: hold,
      });
      if (!dryRun) {
        fs.mkdirSync(mediaRootProducts, { recursive: true });
        if (!fs.existsSync(destAbs)) fs.copyFileSync(row._abs, destAbs);
        if (sha256File(destAbs) !== row._sha) throw new Error(`post-copy sha ${destName}`);
        await writeDerivatives(destAbs);
        await Product.updateOne(
          { _id: existing._id },
          {
            $set: {
              ...setDoc,
              createdAt: existing.createdAt || setDoc.createdAt,
            },
          }
        );
        console.log("draft_update", slug);
      }
      continue;
    }

    plan.summary.draft_creates += 1;
    plan.review_table.push({
      catalogue_id: row.id,
      product_id: null,
      title,
      vehicle: row.model,
      image: destUrl,
      price_pkr: price,
      fitment_evidence: "shared_AI_card_only",
      status: "draft",
      disposition: "create_draft",
      blockers: hold,
      live_url: `https://crazzycars.pk/${slug}`,
    });
    plan.products.push({
      action: "create_draft",
      catalogue_id: row.id,
      slug,
      articleNo,
      importKey,
      price,
      hold_reasons: hold,
      vehicle_slugs: vehicleSlugs,
      media: destName,
    });

    if (!dryRun) {
      fs.mkdirSync(mediaRootProducts, { recursive: true });
      if (!fs.existsSync(destAbs)) fs.copyFileSync(row._abs, destAbs);
      if (sha256File(destAbs) !== row._sha) throw new Error(`post-copy sha ${destName}`);
      await writeDerivatives(destAbs);
      const ins = await Product.insertOne(setDoc);
      console.log("created_draft", String(ins.insertedId), slug, price);
    }
  }

  // publish flag cannot activate unverified molds
  if (publish) {
    plan.note =
      " --publish ignored for new parents: every catalogue row has model_specific_mold_verified=false";
  }

  const planPath = path.join(outDir, "plan-tpe47.json");
  const tablePath = path.join(outDir, "review-table-tpe47.json");
  const mdPath = path.join(outDir, "review-table-tpe47.md");
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
  fs.writeFileSync(tablePath, JSON.stringify(plan.review_table, null, 2));
  const md = [
    `# TPE Mats 47 Light — review table`,
    ``,
    `| ID | Title | Vehicle | Price PKR | Status | Disposition | Blockers |`,
    `|----|-------|---------|-----------|--------|-------------|----------|`,
    ...plan.review_table.map((r) => {
      const blockers = (r.blockers || []).join("; ").replace(/\|/g, "/");
      return `| ${r.catalogue_id} | ${String(r.title).replace(/\|/g, "/")} | ${r.vehicle} | ${
        r.price_pkr ?? "pending"
      } | ${r.status} | ${r.disposition} | ${blockers} |`;
    }),
    ``,
    `Summary: ${JSON.stringify(plan.summary)}`,
    ``,
    `Published new from this pack: **0** (mold not verified). Merges append images onto existing listings only.`,
  ].join("\n");
  fs.writeFileSync(mdPath, md);

  console.log(JSON.stringify(plan.summary, null, 2));
  console.log(`plan -> ${planPath}`);
  console.log(`review -> ${mdPath}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

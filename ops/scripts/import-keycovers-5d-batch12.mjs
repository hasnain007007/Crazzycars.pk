#!/usr/bin/env node
/**
 * CrazzyCars.pk — 5D Zinc-Leather Key Covers Batch 12
 *
 * Creates/updates model+colour parents for AVAILABLE catalogue rows only.
 * Default: draft + securityHold (no price/stock).
 * --publish: activate using related metal key-cover price tiers (or 1399/1799 default)
 *            and shared parent stock 25. Does not mutate Premium Metal SKUs.
 *
 * Usage (store container):
 *   node ... --handoff=/path --out=/path
 *   node ... --apply --media-root=/app/media
 *   node ... --apply --publish --media-root=/app/media
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

const LIVE_DB = "crazzycars_motorsports";
const BATCH = "CC-KEYCOVER-5D-12";
const COLOUR_AXIS = "Colour";

const FIT =
  "Studio visualisation of a 5D zinc-alloy frame key cover with leather-texture panels. Match your physical key outline and button layout before ordering. Keys are not included.";

/** Owner groups that must stay held even after images exist (fitment / grouping unresolved). */
const FITMENT_HOLD = new Set([
  "AION",
  "BYD",
  "Toyota Prado 3B",
  "Toyota Grande Old",
  "Toyota Aqua / Prius",
  "Honda Vezel / BR-V",
  "Jaecoo J7",
  "Jaecoo J7 / Chery Tiggo 7 / 8 / 9",
  "Haval H6 New", // generation vs Haval H6 unresolved
  "Hyundai Sonata Old",
  "Hyundai Sonata New",
  "Kia Sportage Old",
  "Kia Sportage New",
  "Honda Civic X", // 3B vs 4B ambiguous vs live metal SKUs
  "Toyota Yaris 1.3",
  "Toyota Yaris 1.5",
  "Toyota Yaris Hatchback",
]);

/** Related live Premium Metal Key Cover article numbers (reconciliation only — not merged). */
const RELATED_METAL = {
  "Changan Alsvin": ["CC-KC-CHANGANALSVIN"],
  "Changan Oshan X7": ["CC-KC-OSHANX7"],
  "Haval H6": ["CC-KC-HAVALH6"],
  "Haval H6 New": ["CC-KC-HAVALH6"],
  "Honda City 2018": ["CC-KC-HONDACITY20092021", "CC-KC-HONDACITY20092020"],
  "Honda City New": ["CC-KC-HONDACITY20223BUTTON"],
  "Honda City Old": ["CC-KC-HONDACITY20092021", "CC-KC-HONDACITY20092020"],
  "Honda Civic New": ["CC-KC-HONDACIVIC2022"],
  "Honda Civic X": ["CC-KC-HONDACIVIC3BUTTON", "CC-KC-HONDACIVIC4BUTTON"],
  "Honda Vezel / BR-V": ["CC-KC-HONDAVEZEL", "CC-KC-HONDABRV"],
  "Hyundai Sonata New": ["CC-KC-HYUNDAISONATA"],
  "Hyundai Sonata Old": ["CC-KC-HYUNDAISONATA"],
  "Hyundai Tucson Old": ["CC-KC-HYUNDAITUCSON"],
  "Kia Sportage New": ["CC-KC-KIASPORTAGEAWD"],
  "Kia Sportage Old": ["CC-KC-KIASPORTAGEALPHA"],
  "MG HS": ["CC-KC-MGHS"],
  "Suzuki Alto New": ["CC-KC-SUZUKIALTO"],
  "Suzuki Swift New": ["CC-KC-SUZUKISWIFT"],
  "Toyota Aqua / Prius": ["CC-KC-TOYOTAPRIUS"],
  "Toyota Fortuner 4B": ["CC-KC-TOYOTAFORTUNER4BUTTO"],
  "Toyota Grande New": ["CC-KC-TOYOTACOROLLAGRANDE"],
  "Toyota Prado 3B": ["CC-KC-TOYOTAPRADO"],
  "Toyota Yaris 1.3": ["CC-KC-TOYOTAYARIS"],
  "Toyota Yaris 1.5": ["CC-KC-TOYOTAYARIS"],
  "Jaecoo J7 / Chery Tiggo 7 / 8 / 9": ["CC-KC-CHERYTIGGO8PRO", "CC-KC-CHERYTIGGO4PRO"],
};

/** Premium metal tier models (1699/2199) when no related metal hit. */
const PREMIUM_GROUPS = new Set(["Toyota Fortuner 4B", "Toyota Prado 3B", "Hyundai Sonata New", "Hyundai Sonata Old"]);

const DEFAULT_TIER = { sale: 1399, regular: 1799, qty: 25 };
const PREMIUM_TIER = { sale: 1699, regular: 2199, qty: 25 };

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
function slugifyGroup(g) {
  return String(g || "")
    .toLowerCase()
    .replace(/\//g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function skuSlug(g) {
  return slugifyGroup(g).replace(/-/g, "").toUpperCase().slice(0, 18);
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
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return width === w && height === h;
}

function displayName(group) {
  // Preserve owner spelling; fix Jaecoo → JAECOO in public titles where needed
  return String(group || "")
    .replace(/\bJaecoo\b/g, "JAECOO")
    .replace(/\bJaecoo\b/gi, "JAECOO");
}

function productTitle(group) {
  return `${displayName(group)} 5D Zinc-Leather Key Cover`;
}

function whyBuy() {
  return `<h2>Why buy from CrazzyCars.pk?</h2>
<p>CrazzyCars.pk is a Gujranwala car accessories shop. Compare the pictured key outline and button layout with your own key before ordering — keys are not included with the cover. WhatsApp 03284010007 with a clear photo of your key if you want help matching. Cash on Delivery is available on eligible items. Delivery charges follow the current store shipping policy on crazzycars.pk.</p>`;
}

function buildLongDescription(group, colours, holdReasons) {
  const title = productTitle(group);
  const colourList = colours.join(", ");
  const holdNote = holdReasons.length
    ? `<p><strong>Fitment status:</strong> Held pending physical key-shape confirmation (${escapeHtml(
        holdReasons.join("; ")
      )}).</p>`
    : `<p>Confirm the cover matches your key shape and button layout before ordering.</p>`;
  return `<p>${escapeHtml(
    title
  )} — zinc-alloy frame with leather-texture panels. Studio visualisation for colour and shape reference only.</p>
<h2>How to match your key</h2>
<ul>
<li>Compare the pictured key silhouette with your physical key.</li>
<li>Check button count and icon layout.</li>
<li>Choose the colour that matches the stock you want: ${escapeHtml(colourList)}.</li>
<li>Keys are not included.</li>
</ul>
${holdNote}
<h2>About this listing</h2>
<p>Images are generated studio visualisations with a vehicle example. They are not photographs of verified CrazzyCars stock installations and do not prove year-by-year compatibility.</p>
${whyBuy()}`;
}

function resolvePublishPricing(group, relatedMetal, metalByArticle) {
  for (const a of relatedMetal) {
    const m = metalByArticle[a];
    const sale = Number(m?.pricing?.salePrice);
    const regular = Number(m?.pricing?.regularPrice);
    if (Number.isFinite(sale) && sale > 0 && Number.isFinite(regular) && regular > 0) {
      const qty = Number(m?.inventory?.quantity);
      return {
        sale,
        regular,
        qty: Number.isFinite(qty) && qty > 0 ? qty : DEFAULT_TIER.qty,
        source: `metal:${a}`,
      };
    }
  }
  if (PREMIUM_GROUPS.has(group)) return { ...PREMIUM_TIER, source: "premium_tier" };
  return { ...DEFAULT_TIER, source: "default_keycover_tier" };
}

function holdReasonsFor(group, rows) {
  const reasons = [];
  if (FITMENT_HOLD.has(group)) {
    reasons.push("owner-flagged fitment/grouping unresolved");
  }
  if (!rows.every((r) => r.fitment_verified === true)) {
    reasons.push("catalogue fitment_verified=false");
  }
  if (group === "AION" || group === "BYD") {
    reasons.push("brand-only owner label — exact model/key not verified");
  }
  if (/Vezel|BR-V|Aqua|Prius|Tiggo/i.test(group)) {
    reasons.push("shared owner group is not proof of identical fitment");
  }
  if (/Old|New/i.test(group)) {
    reasons.push("Old/New label does not establish exact year range");
  }
  if (/Prado 3B/i.test(group)) {
    reasons.push("Prado button-count / layout needs physical reconciliation");
  }
  if (/Grande Old/i.test(group)) {
    reasons.push("Grande Old open-frame visualisation unverified");
  }
  return [...new Set(reasons)];
}

async function main() {
  const handoff = arg("handoff");
  if (!handoff || !fs.existsSync(handoff)) {
    console.error("Missing --handoff=/path/to/CrazzyCars_5D_Key_Covers_Batch_12_All");
    process.exit(2);
  }
  const dryRun = !hasFlag("apply");
  const publish = hasFlag("publish");
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

  const catalogue = JSON.parse(fs.readFileSync(path.join(handoff, "IMAGE_CATALOGUE.json"), "utf8"));
  if (!Array.isArray(catalogue) || catalogue.length !== 118) {
    throw new Error(`Expected 118 catalogue rows, got ${catalogue?.length}`);
  }

  // Verify AVAILABLE images
  const available = [];
  const pending = [];
  for (const row of catalogue) {
    if (row.image_status === "PENDING") {
      pending.push(row);
      continue;
    }
    if (row.image_status !== "AVAILABLE") {
      throw new Error(`Unknown image_status ${row.image_status} for ${row.asset_id}`);
    }
    const abs = path.join(handoff, row.image_file);
    if (!fs.existsSync(abs)) throw new Error(`missing file ${row.image_file}`);
    const buf = fs.readFileSync(abs);
    const h = crypto.createHash("sha256").update(buf).digest("hex");
    if (row.sha256 && h !== row.sha256) throw new Error(`sha mismatch ${row.asset_id}`);
    if (!pngOk(buf, 1254, 1254)) throw new Error(`dims ${row.asset_id}`);
    available.push({ ...row, _abs: abs, _sha: h });
  }
  console.log(`SHA OK available=${available.length} pending=${pending.length}`);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (db.databaseName !== LIVE_DB) {
    console.error(`REFUSE connected ${db.databaseName}`);
    process.exit(2);
  }
  const Product = db.collection("products");
  const Category = db.collection("categories");

  const gadgets = await Category.findOne({ slug: "gadgets" });
  const keyCat = await Category.findOne({ slug: "key-covers-key-chains" });
  if (!gadgets || !keyCat) throw new Error("Missing gadgets / key-covers-key-chains categories");

  // Load related metal products for report (read-only)
  const metalArticles = [...new Set(Object.values(RELATED_METAL).flat())];
  const metalByArticle = {};
  for (const a of metalArticles) {
    const p = await Product.findOne(
      { articleNo: a },
      { projection: { name: 1, slug: 1, articleNo: 1, status: 1, pricing: 1, inventory: 1 } }
    );
    if (p) metalByArticle[a] = p;
  }

  const byGroup = new Map();
  for (const row of catalogue) {
    const g = row.owner_model_or_group;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(row);
  }

  const mediaRootProducts = path.join(mediaRoot, "products");
  const plan = {
    dry_run: dryRun,
    created_at: new Date().toISOString(),
    batch: BATCH,
    policy: {
      publish: publish
        ? "owner_requested_publish_using_metal_keycover_price_tiers"
        : "draft_until_publish_flag",
      metal_key_covers: "not_mutated",
      pending_images: "not_published_or_referenced",
    },
    publish,
    summary: {
      catalogue_rows: 118,
      available_images: available.length,
      pending_images: pending.length,
      groups: byGroup.size,
      draft_creates: 0,
      draft_updates: 0,
      published: 0,
      no_product_pending_only: 0,
    },
    products: [],
    rows: [], // all 118
  };

  const availByAsset = Object.fromEntries(available.map((r) => [r.asset_id, r]));

  for (const [group, rows] of [...byGroup.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const availRows = rows
      .filter((r) => r.image_status === "AVAILABLE")
      .map((r) => availByAsset[r.asset_id])
      .filter(Boolean);
    const pendRows = rows.filter((r) => r.image_status === "PENDING");
    const holdReasons = holdReasonsFor(group, rows);
    const slugBase = slugifyGroup(group);
    const slug = `${slugBase}-5d-zinc-leather-key-cover`;
    const importKey = `crazzycars-keycovers12:${slugBase}`;
    const articleNo = `CC-KC5D-${skuSlug(group)}`;
    const relatedMetal = RELATED_METAL[group] || [];

    // Row-level accounting
    for (const r of rows) {
      plan.rows.push({
        asset_id: r.asset_id,
        owner_model_or_group: group,
        colour: r.colour,
        image_status: r.image_status,
        disposition:
          r.image_status === "PENDING"
            ? "held_pending_image"
            : availRows.length
              ? publish
                ? "published_colour_option"
                : "draft_colour_option"
              : "held_no_available_image",
        product_slug: availRows.length ? slug : null,
        hold_reasons: holdReasons,
        related_metal_articleNos: relatedMetal,
      });
    }

    if (!availRows.length) {
      plan.summary.no_product_pending_only += 1;
      plan.products.push({
        action: "skip_no_available_image",
        group,
        slug,
        pending_colours: pendRows.map((r) => r.colour),
        hold_reasons: holdReasons,
        related_metal_articleNos: relatedMetal,
      });
      continue;
    }

    // Colour order: Black, Blue, Brown, Grey, Orange then others
    const colourOrder = ["Black", "Blue", "Brown", "Grey", "Orange"];
    const colours = [
      ...colourOrder.filter((c) => availRows.some((r) => r.colour === c)),
      ...availRows.map((r) => r.colour).filter((c) => !colourOrder.includes(c)),
    ].filter((c, i, a) => a.indexOf(c) === i);

    const staged = [];
    for (const r of availRows) {
      const destName = `kc5d-${r.asset_id}-${shortHash(r._sha)}.png`;
      const destAbs = path.join(mediaRootProducts, destName);
      const destUrl = `/media/products/${destName}`;
      staged.push({ row: r, destName, destAbs, destUrl });
    }

    const primary = staged.find((s) => s.row.colour === colours[0]) || staged[0];
    const mediaImages = staged.map((s, idx) => ({
      url: s.destUrl,
      publicId: "",
      isMain: s === primary,
      altText: s.row.alt_text || `${productTitle(group)} – ${s.row.colour}`,
      alt: s.row.alt_text || `${productTitle(group)} – ${s.row.colour}`,
      label: `${s.row.colour} visualisation`,
      imageName: s.row.title || productTitle(group),
      width: 1254,
      height: 1254,
    }));

    const pricingResolved = publish
      ? resolvePublishPricing(group, relatedMetal, metalByArticle)
      : { sale: 0, regular: 0, qty: 0, source: "draft" };
    const comboSale = publish ? pricingResolved.sale : 0;
    const comboRegular = publish ? pricingResolved.regular : 0;
    const parentQty = publish ? pricingResolved.qty : 0;

    const variationCombinations = staged.map((s) => ({
      options: [{ name: COLOUR_AXIS, value: s.row.colour }],
      priceDelta: 0,
      weightDelta: 0,
      price: comboSale,
      compareAtPrice: comboRegular,
      weight: 0,
      stock: parentQty,
      sku: `${articleNo}-${s.row.colour.replace(/\s+/g, "").toUpperCase()}`,
      image: s.destUrl,
    }));

    const name = productTitle(group);
    const shortDescription = `${name} with selectable colours (${colours.join(
      ", "
    )}). Studio visualisation — match your key shape and button layout before ordering. Keys not included.`;
    const metaTitle = `${name} | CrazzyCars.pk`;
    const metaDescription = `Shop ${displayName(
      group
    )} 5D zinc-leather key cover colours in Pakistan. Match key shape and buttons before order. CrazzyCars.pk.`;

    const existing =
      (await Product.findOne({ importKey })) ||
      (await Product.findOne({ articleNo })) ||
      (await Product.findOne({ slug }));

    const status = publish ? "active" : "draft";
    const securityHold = !publish;
    const securityHoldReason = publish
      ? ""
      : `Batch 12 key-cover hold: ${holdReasons.join("; ") || "awaiting price, stock and fitment"}`;

    const setDoc = {
      name,
      slug,
      articleNo,
      importKey,
      shortDescription,
      longDescription: buildLongDescription(group, colours, holdReasons),
      features: [
        FIT,
        `Colours available in this listing: ${colours.join(", ")}`,
        "Keys are not included",
        "Match key outline and button layout before ordering",
      ],
      specifications: [
        { label: "Product", value: "5D zinc-leather key cover" },
        { label: "Owner model / group", value: group },
        { label: "Colours (imaged)", value: colours.join(", ") },
        { label: "Fitment", value: FIT },
        { label: "Listing code", value: articleNo },
        { label: "Condition", value: "New" },
      ],
      pricing: publish
        ? {
            regularPrice: pricingResolved.regular,
            salePrice: pricingResolved.sale,
            costPerItem: 0,
            saleSchedule: { enabled: false },
          }
        : {
            regularPrice: 0,
            salePrice: null,
            costPerItem: 0,
            saleSchedule: { enabled: false },
          },
      inventory: {
        quantity: parentQty,
        trackInventory: true,
        allowBackorder: false,
        lowStockThreshold: 5,
        weight: 0,
        weightUnit: "g",
        sku: articleNo,
      },
      sharedFittingInventory: true,
      simpleVariations: [{ name: COLOUR_AXIS, enabled: true, tags: colours }],
      variationCombinations,
      media: { images: mediaImages, videos: existing?.media?.videos || [] },
      categories: existing?.categories?.length ? existing.categories : [gadgets._id, keyCat._id],
      primaryCategorySlug: "key-covers-key-chains",
      tags: Array.from(
        new Set([
          BATCH,
          importKey,
          "5d key cover",
          "zinc leather key cover",
          "car key cover pakistan",
          slugBase,
          ...colours.map((c) => c.toLowerCase()),
          displayName(group).toLowerCase(),
        ])
      ),
      isUniversal: false,
      isBulky: false,
      codEligible: true,
      codEnabled: true,
      vehicleCompatibility: {
        fitmentType: "specific",
        universalNote: FIT,
        vehicles: [],
        categories: [],
      },
      compatibleCars: [],
      metaTitle,
      metaDescription,
      seo: {
        metaTitle,
        metaDescription,
        metaKeywords: [displayName(group), "key cover", "Pakistan", "CrazzyCars.pk"],
        excludeFromMerchantFeed: !publish,
        excludeFromSitemap: !publish,
        excludeFromListings: !publish,
        robots: publish ? "" : "noindex,nofollow",
        omitProductSchemaImage: false,
      },
      status,
      securityHold,
      securityHoldReason,
      vendor: "CrazzyCars.pk",
      condition: "new",
      segment: "car",
      metadata: {
        batch_id: BATCH,
        owner_model_or_group: group,
        related_metal_articleNos: relatedMetal,
        hold_reasons: holdReasons,
        pending_colours: pendRows.map((r) => r.colour),
        available_colours: colours,
        asset_ids: availRows.map((r) => r.asset_id),
        image_kind: "AI studio visualisation; not physical-stock photography",
        pricing_source: pricingResolved.source,
        published_at: publish ? new Date().toISOString() : null,
      },
      updatedAt: new Date(),
    };

    const action = publish
      ? existing
        ? "publish_update"
        : "publish_create"
      : existing
        ? "update_draft"
        : "create_draft";
    if (publish) plan.summary.published += 1;
    else if (existing) plan.summary.draft_updates += 1;
    else plan.summary.draft_creates += 1;

    plan.products.push({
      action,
      group,
      slug,
      articleNo,
      importKey,
      status,
      securityHold,
      sale: comboSale,
      regular: comboRegular,
      qty: parentQty,
      pricing_source: pricingResolved.source,
      colours,
      pending_colours: pendRows.map((r) => r.colour),
      media: staged.map((s) => s.destName),
      hold_reasons: holdReasons,
      related_metal_articleNos: relatedMetal,
      related_metal_live: relatedMetal.map((a) => {
        const p = metalByArticle[a];
        return p
          ? {
              articleNo: a,
              slug: p.slug,
              sale: p.pricing?.salePrice,
              qty: p.inventory?.quantity,
              status: p.status,
              note: "metal key cover — not merged / not overwritten",
            }
          : { articleNo: a, missing: true };
      }),
      existingId: existing ? String(existing._id) : null,
    });

    if (dryRun) continue;

    fs.mkdirSync(mediaRootProducts, { recursive: true });
    for (const s of staged) {
      if (!fs.existsSync(s.destAbs)) fs.copyFileSync(s.row._abs, s.destAbs);
      if (sha256File(s.destAbs) !== s.row._sha) throw new Error(`post-copy sha ${s.destName}`);
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

    if (existing) {
      // Keep prior owner-edited price/qty when re-running without intending to reset
      if (!publish) {
        const keepPrice =
          Number(existing.pricing?.regularPrice) > 0 || Number(existing.pricing?.salePrice) > 0;
        const keepQty = Number(existing.inventory?.quantity) > 0;
        if (keepPrice) setDoc.pricing = existing.pricing;
        if (keepQty) {
          setDoc.inventory = {
            ...setDoc.inventory,
            quantity: existing.inventory.quantity,
            sku: existing.inventory?.sku || articleNo,
          };
        }
      } else if (
        Number(existing.pricing?.salePrice) > 0 &&
        Number(existing.pricing?.regularPrice) > 0 &&
        existing.status === "active"
      ) {
        // Re-publish: preserve already-live owner prices/stock if present
        setDoc.pricing = existing.pricing;
        if (Number(existing.inventory?.quantity) > 0) {
          setDoc.inventory = {
            ...setDoc.inventory,
            quantity: existing.inventory.quantity,
            sku: existing.inventory?.sku || articleNo,
          };
          for (const c of setDoc.variationCombinations) {
            c.price = Number(existing.pricing.salePrice);
            c.compareAtPrice = Number(existing.pricing.regularPrice);
            c.stock = Number(existing.inventory.quantity);
          }
        }
      }
      await Product.updateOne({ _id: existing._id }, { $set: setDoc });
      console.log(publish ? "published" : "updated_draft", String(existing._id), slug);
    } else {
      setDoc.createdAt = new Date();
      const ins = await Product.insertOne(setDoc);
      console.log(publish ? "published_new" : "created_draft", String(ins.insertedId), slug);
    }
  }

  // Sanity: 118 rows accounted
  if (plan.rows.length !== 118) throw new Error(`row accounting ${plan.rows.length}`);

  fs.writeFileSync(path.join(outDir, "plan.json"), JSON.stringify(plan, null, 2));
  fs.writeFileSync(
    path.join(outDir, "report.md"),
    buildMarkdownReport(plan)
  );

  console.log(
    JSON.stringify(
      {
        dryRun,
        ...plan.summary,
        products: plan.products.length,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

function buildMarkdownReport(plan) {
  const lines = [];
  lines.push(`# 5D Key Covers Batch 12 — import report`);
  lines.push("");
  lines.push(`Generated: ${plan.created_at}`);
  lines.push(`Dry-run: ${plan.dry_run}`);
  lines.push("");
  lines.push(`## Summary`);
  lines.push(`- Catalogue rows: **${plan.summary.catalogue_rows}**`);
  lines.push(`- AVAILABLE images: **${plan.summary.available_images}**`);
  lines.push(`- PENDING images: **${plan.summary.pending_images}**`);
  lines.push(`- Draft creates: **${plan.summary.draft_creates}**`);
  lines.push(`- Draft updates: **${plan.summary.draft_updates}**`);
  lines.push(`- Published: **${plan.summary.published}** (none — no verified price/stock/fitment)`);
  lines.push(`- Groups with no AVAILABLE image: **${plan.summary.no_product_pending_only}**`);
  lines.push("");
  lines.push(`## Policy`);
  lines.push(`- Existing Premium Metal Key Covers were **not** mutated.`);
  lines.push(`- PENDING rows were **not** referenced or fabricated.`);
  lines.push(`- All new 5D listings are **draft + securityHold** until price, stock and fitment are supplied.`);
  lines.push("");
  lines.push(`## Products`);
  for (const p of plan.products) {
    lines.push(`### ${p.group}`);
    lines.push(`- Action: \`${p.action}\``);
    if (p.slug) lines.push(`- Slug: \`${p.slug}\` · SKU \`${p.articleNo || ""}\``);
    if (p.colours) lines.push(`- Colours imaged: ${p.colours.join(", ")}`);
    if (p.pending_colours?.length) lines.push(`- Colours PENDING: ${p.pending_colours.join(", ")}`);
    if (p.hold_reasons?.length) lines.push(`- Hold: ${p.hold_reasons.join("; ")}`);
    if (p.related_metal_live?.length) {
      for (const m of p.related_metal_live) {
        if (m.missing) lines.push(`- Related metal ${m.articleNo}: missing`);
        else
          lines.push(
            `- Related metal ${m.articleNo} (\`${m.slug}\`): sale ${m.sale} qty ${m.qty} — not merged`
          );
      }
    }
    lines.push("");
  }
  lines.push(`## All 118 rows`);
  lines.push(`| asset_id | group | colour | status | disposition | product |`);
  lines.push(`|---|---|---|---|---|---|`);
  for (const r of plan.rows) {
    lines.push(
      `| ${r.asset_id} | ${r.owner_model_or_group} | ${r.colour} | ${r.image_status} | ${r.disposition} | ${r.product_slug || "—"} |`
    );
  }
  lines.push("");
  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

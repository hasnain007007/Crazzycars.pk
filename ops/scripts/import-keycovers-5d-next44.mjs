#!/usr/bin/env node
/**
 * CrazzyCars.pk — 5D Zinc-Leather Key Covers NEXT 44
 *
 * Imports exactly the 44 AVAILABLE cards that were PENDING in Batch 12.
 * Merges new colour options + media into existing model/colour parents.
 * Does not overwrite existing gallery/primary images or mutate Premium Metal SKUs.
 * New groups with no prior parent stay draft + securityHold (fitment unresolved).
 *
 * Usage (store container, DB crazzycars_motorsports only):
 *   node ... --handoff=/path --out=/path
 *   node ... --apply --media-root=/app/media --backup=/path/backup.json
 *   node ... --apply --publish --media-root=/app/media --backup=/path/backup.json
 *
 * --publish: activate colour merges onto already-active priced/stocked parents only.
 *            New parents and fitment-hold-only creates remain draft.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

const LIVE_DB = "crazzycars_motorsports";
const BATCH = "CC-KEYCOVER-5D-12-NEXT44";
const PRIOR_BATCH = "CC-KEYCOVER-5D-12";
const COLOUR_AXIS = "Colour";
const EXPECTED_ROWS = 44;

const FIT =
  "Studio visualisation of a 5D zinc-alloy frame key cover with leather-texture panels. Match your physical key outline and button layout before ordering. Keys are not included.";

/** Owner groups that must stay draft when newly created (fitment / grouping unresolved). */
const FITMENT_HOLD = new Set([
  "AION",
  "BYD",
  "Toyota Prado 3B",
  "Toyota Grande Old",
  "Toyota Aqua / Prius",
  "Honda Vezel / BR-V",
  "Jaecoo J7",
  "Jaecoo J7 / Chery Tiggo 7 / 8 / 9",
  "Haval H6 New",
  "Hyundai Sonata Old",
  "Hyundai Sonata New",
  "Kia Sportage Old",
  "Kia Sportage New",
  "Honda Civic X",
  "Honda City Old",
  "Toyota Yaris 1.3",
  "Toyota Yaris 1.5",
  "Toyota Yaris Hatchback",
]);

const RELATED_METAL = {
  "Changan Alsvin": ["CC-KC-CHANGANALSVIN"],
  "Changan Oshan X7": ["CC-KC-OSHANX7"],
  "Haval H6": ["CC-KC-HAVALH6"],
  "Haval H6 New": ["CC-KC-HAVALH6"],
  "Honda City New": ["CC-KC-HONDACITY20223BUTTON"],
  "Honda City Old": ["CC-KC-HONDACITY20092021", "CC-KC-HONDACITY20092020"],
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

const COLOUR_ORDER = ["Black", "Blue", "Brown", "Grey", "Orange"];
const DEFAULT_TIER = { sale: 2299, regular: 2999, qty: 100 };

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
  return buf.readUInt32BE(16) === w && buf.readUInt32BE(20) === h;
}
function displayName(group) {
  return String(group || "").replace(/\bJaecoo\b/gi, "JAECOO");
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
function holdReasonsFor(group, rows) {
  const reasons = [];
  if (FITMENT_HOLD.has(group)) reasons.push("owner-flagged fitment/grouping unresolved");
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
  if (/City Old/i.test(group)) {
    reasons.push("Honda City Old — first image only; reconcile vs City 2018/New metal SKUs before publish");
  }
  return [...new Set(reasons)];
}
function sortColours(colours) {
  const uniq = [...new Set(colours.filter(Boolean))];
  return [
    ...COLOUR_ORDER.filter((c) => uniq.includes(c)),
    ...uniq.filter((c) => !COLOUR_ORDER.includes(c)),
  ];
}
function colourFromCombo(c) {
  const opt = (c?.options || []).find((o) => /colour|color/i.test(o?.name || ""));
  return String(opt?.value || "").trim();
}
function existingColourSet(doc) {
  const tags =
    (doc?.simpleVariations || []).find((v) => /colour|color/i.test(v?.name || ""))?.tags || [];
  const fromCombos = (doc?.variationCombinations || []).map(colourFromCombo).filter(Boolean);
  return new Set([...tags, ...fromCombos].map(String));
}

async function main() {
  const handoff = arg("handoff");
  if (!handoff || !fs.existsSync(handoff)) {
    console.error("Missing --handoff=/path/to/CrazzyCars_Key_Covers_Next_44");
    process.exit(2);
  }
  const dryRun = !hasFlag("apply");
  const publish = hasFlag("publish");
  const mediaRoot = arg("media-root", process.env.MEDIA_ROOT || "/app/media");
  const outDir = arg("out", path.join(handoff, "import-out"));
  const backupPath = arg("backup", path.join(outDir, `backup-before-next44.json`));
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
  if (!Array.isArray(catalogue) || catalogue.length !== EXPECTED_ROWS) {
    throw new Error(`Expected ${EXPECTED_ROWS} catalogue rows, got ${catalogue?.length}`);
  }

  const available = [];
  for (const row of catalogue) {
    if (row.image_status !== "AVAILABLE") {
      throw new Error(`Next44 pack must be AVAILABLE-only; got ${row.image_status} for ${row.asset_id}`);
    }
    const abs = path.join(handoff, row.image_file);
    if (!fs.existsSync(abs)) throw new Error(`missing file ${row.image_file}`);
    const buf = fs.readFileSync(abs);
    const h = crypto.createHash("sha256").update(buf).digest("hex");
    if (row.sha256 && h !== row.sha256) throw new Error(`sha mismatch ${row.asset_id}`);
    if (!pngOk(buf, 1254, 1254)) throw new Error(`dims ${row.asset_id}`);
    if (Number(row.price_pkr) > 0 || Number(row.stock_quantity) > 0) {
      throw new Error(`Unexpected price/stock on ${row.asset_id} — pack must not invent values`);
    }
    available.push({ ...row, _abs: abs, _sha: h });
  }
  console.log(`SHA OK next44=${available.length}`);

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
  for (const row of available) {
    const g = row.owner_model_or_group;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(row);
  }

  const mediaRootProducts = path.join(mediaRoot, "products");

  // Pre-mutation backup of every parent this pack may touch
  const preBackupQuery = {
    $or: [
      {
        importKey: {
          $in: [...byGroup.keys()].map((g) => `crazzycars-keycovers12:${slugifyGroup(g)}`),
        },
      },
      {
        slug: {
          $in: [...byGroup.keys()].map((g) => `${slugifyGroup(g)}-5d-zinc-leather-key-cover`),
        },
      },
    ],
  };
  const preBackupDocs = await Product.find(preBackupQuery).toArray();
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  const preBackupFile = backupPath.replace(/\.json$/i, ".pre.json");
  fs.writeFileSync(
    preBackupFile,
    JSON.stringify(
      {
        created_at: new Date().toISOString(),
        phase: "pre",
        dry_run: dryRun,
        db: LIVE_DB,
        batch: BATCH,
        count: preBackupDocs.length,
        products: preBackupDocs,
      },
      null,
      2
    )
  );
  console.log(`pre-backup ${preBackupDocs.length} docs -> ${preBackupFile}`);

  const plan = {
    dry_run: dryRun,
    created_at: new Date().toISOString(),
    batch: BATCH,
    prior_batch: PRIOR_BATCH,
    publish,
    policy: {
      scope: "next44_only",
      metal_key_covers: "not_mutated",
      existing_primary_og: "retained",
      new_groups: "draft_until_price_stock_fitment",
      publish_merges:
        "only onto already-active parents that already have salePrice>0 and quantity>0",
    },
    summary: {
      catalogue_rows: EXPECTED_ROWS,
      groups: byGroup.size,
      colour_merges: 0,
      colour_skips_already_present: 0,
      draft_creates: 0,
      draft_updates: 0,
      published_merges: 0,
      held_creates: 0,
      held_fitment_existing_active: 0,
    },
    products: [],
    rows: [],
    backup_path: preBackupFile,
    backup_path_post: backupPath.replace(/\.json$/i, ".post.json"),
  };

  const affectedIds = [];

  for (const [group, rows] of [...byGroup.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const holdReasons = holdReasonsFor(group, rows);
    const slugBase = slugifyGroup(group);
    const slug = `${slugBase}-5d-zinc-leather-key-cover`;
    const importKey = `crazzycars-keycovers12:${slugBase}`;
    const articleNo = `CC-KC5D-${skuSlug(group)}`;
    const relatedMetal = RELATED_METAL[group] || [];
    const newColours = sortColours(rows.map((r) => r.colour));

    const existing =
      (await Product.findOne({ importKey })) ||
      (await Product.findOne({ articleNo })) ||
      (await Product.findOne({ slug }));

    if (existing) affectedIds.push(existing._id);

    const have = existing ? existingColourSet(existing) : new Set();
    const toAdd = rows.filter((r) => !have.has(r.colour));
    const already = rows.filter((r) => have.has(r.colour));
    plan.summary.colour_skips_already_present += already.length;

    const staged = [];
    for (const r of toAdd) {
      const destName = `kc5d-${r.asset_id}-${shortHash(r._sha)}.png`;
      staged.push({
        row: r,
        destName,
        destAbs: path.join(mediaRootProducts, destName),
        destUrl: `/media/products/${destName}`,
      });
    }

    // Row accounting — all 44
    for (const r of rows) {
      const isNewColour = toAdd.some((x) => x.asset_id === r.asset_id);
      let disposition;
      if (!isNewColour) disposition = "skip_colour_already_present";
      else if (!existing) {
        disposition =
          publish && !FITMENT_HOLD.has(group) ? "would_create_active" : "create_draft_new_parent";
      } else if (existing.status === "active" && Number(existing.pricing?.salePrice) > 0) {
        disposition = publish ? "merge_colour_on_active" : "merge_colour_keep_status";
      } else {
        disposition = "merge_colour_on_draft";
      }
      plan.rows.push({
        asset_id: r.asset_id,
        owner_model_or_group: group,
        colour: r.colour,
        image_status: r.image_status,
        disposition,
        product_slug: slug,
        hold_reasons: holdReasons,
        related_metal_articleNos: relatedMetal,
        existing_status: existing?.status || null,
        existing_sale: existing?.pricing?.salePrice ?? null,
        existing_qty: existing?.inventory?.quantity ?? null,
      });
    }

    if (!existing) {
      // New parent — always draft (no pack price/stock; fitment unresolved for City Old / J7-Tiggo)
      const forceHold = true;
      const colours = newColours;
      const mediaImages = staged.map((s, idx) => ({
        url: s.destUrl,
        publicId: "",
        isMain: idx === 0,
        altText: s.row.alt_text || `${productTitle(group)} – ${s.row.colour}`,
        alt: s.row.alt_text || `${productTitle(group)} – ${s.row.colour}`,
        label: `${s.row.colour} visualisation`,
        imageName: s.row.title || productTitle(group),
        width: 1254,
        height: 1254,
      }));
      const variationCombinations = staged.map((s) => ({
        options: [{ name: COLOUR_AXIS, value: s.row.colour }],
        priceDelta: 0,
        weightDelta: 0,
        price: 0,
        compareAtPrice: 0,
        weight: 0,
        stock: 0,
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
        pricing: { regularPrice: 0, salePrice: null, costPerItem: 0, saleSchedule: { enabled: false } },
        inventory: {
          quantity: 0,
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
        media: { images: mediaImages, videos: [] },
        categories: [gadgets._id, keyCat._id],
        primaryCategorySlug: "key-covers-key-chains",
        tags: Array.from(
          new Set([
            PRIOR_BATCH,
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
          excludeFromMerchantFeed: true,
          excludeFromSitemap: true,
          excludeFromListings: true,
          robots: "noindex,nofollow",
          omitProductSchemaImage: false,
        },
        status: "draft",
        securityHold: true,
        securityHoldReason: `Next44 key-cover hold: ${holdReasons.join("; ") || "awaiting price, stock and fitment"}`,
        vendor: "CrazzyCars.pk",
        condition: "new",
        segment: "car",
        metadata: {
          batch_id: BATCH,
          prior_batch_id: PRIOR_BATCH,
          owner_model_or_group: group,
          related_metal_articleNos: relatedMetal,
          hold_reasons: holdReasons,
          pending_colours: [],
          available_colours: colours,
          asset_ids: rows.map((r) => r.asset_id),
          image_kind: "AI studio visualisation; not physical-stock photography",
          pricing_source: "draft_no_pack_price",
          next44_created_at: new Date().toISOString(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      plan.summary.draft_creates += 1;
      plan.summary.held_creates += 1;
      plan.products.push({
        action: "create_draft_new_parent",
        group,
        slug,
        articleNo,
        importKey,
        status: "draft",
        securityHold: true,
        colours,
        media_added: staged.map((s) => s.destName),
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
        forceHold,
        existingId: null,
      });

      if (!dryRun) {
        fs.mkdirSync(mediaRootProducts, { recursive: true });
        for (const s of staged) {
          if (!fs.existsSync(s.destAbs)) fs.copyFileSync(s.row._abs, s.destAbs);
          if (sha256File(s.destAbs) !== s.row._sha) throw new Error(`post-copy sha ${s.destName}`);
          await writeDerivatives(s.destAbs);
        }
        const ins = await Product.insertOne(setDoc);
        console.log("created_draft", String(ins.insertedId), slug);
      }
      continue;
    }

    // Merge into existing parent
    if (!staged.length) {
      plan.products.push({
        action: "noop_colours_present",
        group,
        slug,
        articleNo,
        colours_already: already.map((r) => r.colour),
        hold_reasons: holdReasons,
        existingId: String(existing._id),
        status: existing.status,
      });
      continue;
    }

    const sale = Number(existing.pricing?.salePrice) || 0;
    const regular = Number(existing.pricing?.regularPrice) || 0;
    const qty = Number(existing.inventory?.quantity) || 0;
    const isActivePriced = existing.status === "active" && sale > 0 && qty > 0;
    const canPublishMerge = publish && isActivePriced;

    if (FITMENT_HOLD.has(group) && existing.status === "active") {
      plan.summary.held_fitment_existing_active += 1;
    }

    const prevImages = Array.isArray(existing.media?.images) ? [...existing.media.images] : [];
    const addedImages = staged.map((s) => ({
      url: s.destUrl,
      publicId: "",
      isMain: false, // never steal primary/OG
      altText: s.row.alt_text || `${productTitle(group)} – ${s.row.colour}`,
      alt: s.row.alt_text || `${productTitle(group)} – ${s.row.colour}`,
      label: `${s.row.colour} visualisation`,
      imageName: s.row.title || productTitle(group),
      width: 1254,
      height: 1254,
    }));
    // Dedupe by url
    const mediaImages = [...prevImages];
    for (const im of addedImages) {
      if (!mediaImages.some((x) => x.url === im.url)) mediaImages.push(im);
    }
    if (!mediaImages.some((x) => x.isMain) && mediaImages[0]) mediaImages[0].isMain = true;

    const prevCombos = Array.isArray(existing.variationCombinations)
      ? [...existing.variationCombinations]
      : [];
    const comboPrice = sale > 0 ? sale : 0;
    const comboRegular = regular > 0 ? regular : 0;
    const comboStock = qty > 0 ? qty : 0;
    for (const s of staged) {
      if (prevCombos.some((c) => colourFromCombo(c) === s.row.colour)) continue;
      prevCombos.push({
        options: [{ name: COLOUR_AXIS, value: s.row.colour }],
        priceDelta: 0,
        weightDelta: 0,
        price: comboPrice,
        compareAtPrice: comboRegular,
        weight: 0,
        stock: comboStock,
        sku: `${articleNo}-${s.row.colour.replace(/\s+/g, "").toUpperCase()}`,
        image: s.destUrl,
      });
    }

    const mergedColours = sortColours([
      ...[...have],
      ...staged.map((s) => s.row.colour),
    ]);

    const prevTags =
      (existing.simpleVariations || []).find((v) => /colour|color/i.test(v?.name || ""))?.tags ||
      [];
    const simpleVariations = [
      {
        name: COLOUR_AXIS,
        enabled: true,
        tags: sortColours([...prevTags, ...staged.map((s) => s.row.colour)]),
      },
      ...(existing.simpleVariations || []).filter((v) => !/colour|color/i.test(v?.name || "")),
    ];

    const prevAssetIds = Array.isArray(existing.metadata?.asset_ids)
      ? existing.metadata.asset_ids
      : [];
    const prevPending = Array.isArray(existing.metadata?.pending_colours)
      ? existing.metadata.pending_colours
      : [];
    const filled = new Set(staged.map((s) => s.row.colour));

    const setDoc = {
      simpleVariations,
      variationCombinations: prevCombos,
      media: { images: mediaImages, videos: existing.media?.videos || [] },
      longDescription: buildLongDescription(group, mergedColours, holdReasons),
      features: [
        FIT,
        `Colours available in this listing: ${mergedColours.join(", ")}`,
        "Keys are not included",
        "Match key outline and button layout before ordering",
      ],
      shortDescription: `${productTitle(group)} with selectable colours (${mergedColours.join(
        ", "
      )}). Studio visualisation — match your key shape and button layout before ordering. Keys not included.`,
      tags: Array.from(
        new Set([...(existing.tags || []), PRIOR_BATCH, BATCH, ...mergedColours.map((c) => c.toLowerCase())])
      ),
      "metadata.available_colours": mergedColours,
      "metadata.pending_colours": prevPending.filter((c) => !filled.has(c)),
      "metadata.asset_ids": Array.from(new Set([...prevAssetIds, ...rows.map((r) => r.asset_id)])),
      "metadata.hold_reasons": holdReasons,
      "metadata.next44_merged_at": new Date().toISOString(),
      "metadata.next44_colours_added": staged.map((s) => s.row.colour),
      updatedAt: new Date(),
    };

    // Specs colours line if present
    if (Array.isArray(existing.specifications)) {
      setDoc.specifications = existing.specifications.map((s) =>
        s?.label === "Colours (imaged)" ? { ...s, value: mergedColours.join(", ") } : s
      );
    }

    const action = canPublishMerge
      ? "merge_colour_on_active"
      : existing.status === "draft"
        ? "merge_colour_on_draft"
        : "merge_colour_keep_status";

    plan.summary.colour_merges += staged.length;
    if (action === "merge_colour_on_active") plan.summary.published_merges += 1;
    else plan.summary.draft_updates += 1;

    plan.products.push({
      action,
      group,
      slug,
      articleNo,
      importKey,
      status: existing.status,
      securityHold: Boolean(existing.securityHold),
      sale,
      regular,
      qty,
      colours_added: staged.map((s) => s.row.colour),
      colours_skipped: already.map((r) => r.colour),
      colours_after: mergedColours,
      media_added: staged.map((s) => s.destName),
      primary_retained: prevImages.find((i) => i.isMain)?.url || prevImages[0]?.url || null,
      hold_reasons: holdReasons,
      related_metal_articleNos: relatedMetal,
      existingId: String(existing._id),
      publish_eligible: isActivePriced,
    });

    if (!dryRun) {
      fs.mkdirSync(mediaRootProducts, { recursive: true });
      for (const s of staged) {
        if (!fs.existsSync(s.destAbs)) fs.copyFileSync(s.row._abs, s.destAbs);
        if (sha256File(s.destAbs) !== s.row._sha) throw new Error(`post-copy sha ${s.destName}`);
        await writeDerivatives(s.destAbs);
      }
      // Flatten dotted metadata keys for updateOne
      const flat = { ...setDoc };
      const metaPatch = {
        ...(existing.metadata || {}),
        available_colours: mergedColours,
        pending_colours: prevPending.filter((c) => !filled.has(c)),
        asset_ids: Array.from(new Set([...prevAssetIds, ...rows.map((r) => r.asset_id)])),
        hold_reasons: holdReasons,
        next44_merged_at: new Date().toISOString(),
        next44_colours_added: staged.map((s) => s.row.colour),
        batch_id_next44: BATCH,
      };
      delete flat["metadata.available_colours"];
      delete flat["metadata.pending_colours"];
      delete flat["metadata.asset_ids"];
      delete flat["metadata.hold_reasons"];
      delete flat["metadata.next44_merged_at"];
      delete flat["metadata.next44_colours_added"];
      flat.metadata = metaPatch;

      await Product.updateOne({ _id: existing._id }, { $set: flat });
      console.log(action, String(existing._id), slug, staged.map((s) => s.row.colour).join(","));
    }
  }

  if (plan.rows.length !== EXPECTED_ROWS) {
    throw new Error(`row accounting ${plan.rows.length} !== ${EXPECTED_ROWS}`);
  }

  // Post-state snapshot after apply (includes new draft parents)
  const postBackupDocs = await Product.find(preBackupQuery).toArray();
  const postBackupFile = plan.backup_path_post;
  fs.writeFileSync(
    postBackupFile,
    JSON.stringify(
      {
        created_at: new Date().toISOString(),
        phase: dryRun ? "dry-run-snapshot" : "post",
        dry_run: dryRun,
        db: LIVE_DB,
        batch: BATCH,
        count: postBackupDocs.length,
        products: postBackupDocs,
      },
      null,
      2
    )
  );

  fs.writeFileSync(path.join(outDir, "plan.json"), JSON.stringify(plan, null, 2));
  fs.writeFileSync(path.join(outDir, "report.md"), buildMarkdownReport(plan));

  console.log(
    JSON.stringify(
      {
        dryRun,
        publish,
        ...plan.summary,
        products: plan.products.length,
        rows: plan.rows.length,
        outDir,
        backupPath,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
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

function buildMarkdownReport(plan) {
  const lines = [];
  lines.push(`# 5D Key Covers NEXT 44 — import report`);
  lines.push("");
  lines.push(`Generated: ${plan.created_at}`);
  lines.push(`Dry-run: ${plan.dry_run}`);
  lines.push(`Publish flag: ${plan.publish}`);
  lines.push(`Batch: \`${plan.batch}\` (prior \`${plan.prior_batch}\`)`);
  lines.push("");
  lines.push(`## Summary`);
  lines.push(`- Catalogue rows (this pack): **${plan.summary.catalogue_rows}**`);
  lines.push(`- Groups touched: **${plan.summary.groups}**`);
  lines.push(`- Colour merges planned: **${plan.summary.colour_merges}**`);
  lines.push(`- Colours already present (skip): **${plan.summary.colour_skips_already_present}**`);
  lines.push(`- New draft parents: **${plan.summary.draft_creates}** (held: **${plan.summary.held_creates}**)`);
  lines.push(`- Draft/status-preserving updates: **${plan.summary.draft_updates}**`);
  lines.push(`- Active priced merges: **${plan.summary.published_merges}**`);
  lines.push(
    `- Existing active parents still on fitment-hold list: **${plan.summary.held_fitment_existing_active}**`
  );
  lines.push("");
  lines.push(`## Policy`);
  lines.push(`- Import scope: **only these 44** Next pack entries (Batch 12 PENDING fill).`);
  lines.push(`- Premium Metal Key Covers: **not mutated**.`);
  lines.push(`- Existing primary/OG images: **retained** (new colours append as non-main).`);
  lines.push(`- Pack prices/stock: **none supplied** — new parents stay draft.`);
  lines.push(`- Shared owner groups are **not** treated as universal fitment.`);
  lines.push("");
  lines.push(`## Products`);
  for (const p of plan.products) {
    lines.push(`### ${p.group}`);
    lines.push(`- Action: \`${p.action}\``);
    if (p.slug) lines.push(`- Slug: \`${p.slug}\` · SKU \`${p.articleNo || ""}\``);
    if (p.colours_added?.length) lines.push(`- Colours added: ${p.colours_added.join(", ")}`);
    if (p.colours_skipped?.length) lines.push(`- Colours skipped (already present): ${p.colours_skipped.join(", ")}`);
    if (p.colours_after) lines.push(`- Colours after: ${p.colours_after.join(", ")}`);
    if (p.colours) lines.push(`- Colours (new parent): ${p.colours.join(", ")}`);
    if (p.primary_retained) lines.push(`- Primary retained: \`${p.primary_retained}\``);
    if (p.sale != null) lines.push(`- Price/stock retained: sale ${p.sale} / regular ${p.regular} / qty ${p.qty}`);
    if (p.hold_reasons?.length) lines.push(`- Hold notes: ${p.hold_reasons.join("; ")}`);
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
  lines.push(`## All ${plan.summary.catalogue_rows} source rows`);
  lines.push(`| asset_id | group | colour | disposition | product | existing |`);
  lines.push(`|---|---|---|---|---|---|`);
  for (const r of plan.rows) {
    lines.push(
      `| ${r.asset_id} | ${r.owner_model_or_group} | ${r.colour} | ${r.disposition} | ${r.product_slug || "—"} | ${r.existing_status || "new"} sale=${r.existing_sale ?? "—"} qty=${r.existing_qty ?? "—"} |`
    );
  }
  lines.push("");
  lines.push(`## Rollback`);
  lines.push(`1. Restore product documents from \`${plan.backup_path}\`.`);
  lines.push(`2. Delete media files named \`kc5d-<asset_id>-*.png\` (+ \`-sm/-400/-800/-1200.webp\`) added by this batch if no longer referenced.`);
  lines.push(`3. Do **not** delete prior Batch 12 imagery.`);
  lines.push("");
  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

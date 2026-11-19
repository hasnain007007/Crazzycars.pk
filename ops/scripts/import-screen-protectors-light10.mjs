#!/usr/bin/env node
/**
 * CrazzyCars.pk — Rubber Infotainment Screen Protector Frames (Light 10)
 *
 * 10 model/colour AI visualisations. Creates model parents with Colour variants.
 * No pack prices/stock → new parents stay draft + securityHold.
 * Omoda and Tiggo 8 & 9 Pro stay draft until exact fitment is resolved.
 *
 * Usage (store container, DB crazzycars_motorsports only):
 *   node ... --handoff=/path --out=/path
 *   node ... --apply --media-root=/app/media
 *   node ... --apply --publish --media-root=/app/media   # still drafts without price/stock/fitment
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

const LIVE_DB = "crazzycars_motorsports";
const BATCH = "CC-SCREENPROT-LIGHT-10";
const COLOUR_AXIS = "Colour";
const EXPECTED_ROWS = 10;

const FIT_NOTE =
  "Rubber frame that sits around the infotainment screen perimeter. Not a tempered-glass film, replacement screen, or complete head unit. Studio visualisation — confirm screen shape and size against your vehicle before ordering.";

/** Always held as drafts until exact model / shared-fitment is resolved. */
const HARD_HOLD = new Set(["Omoda", "Tiggo 8 & 9 Pro"]);

/** Map catalogue model → vehicle slug(s) when present in cars catalogue. */
const VEHICLE_SLUGS = {
  "Deepal S05": ["deepal-s05-2024-present"],
  "Haval H6": ["haval-h6-2021-present"],
  "BYD Atto 2": ["byd-atto2-2025-present"],
  "BYD Atto 3": ["byd-atto3-2025-present"],
  "Jetour T2": ["jetour-t2-2024-present"],
  "Tank 500": [], // no vehicle page yet
  Omoda: [],
  "Tiggo 8 & 9 Pro": [], // do not invent shared fitment across Tiggo 8/9
};

const COLOUR_ORDER = ["Black", "Orange", "Grey", "Blue", "Brown"];

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
function slugifyModel(m) {
  return String(m || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function skuSlug(m) {
  return slugifyModel(m).replace(/-/g, "").toUpperCase().slice(0, 16);
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
function productTitle(model) {
  return `${model} Rubber Infotainment Screen Protector Frame`;
}
/** Avoid deleted redirect /haval-h6-rubber-infotainment-screen-protector */
function productSlug(model) {
  return `${slugifyModel(model)}-rubber-infotainment-screen-protector-frame`;
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
function holdReasonsFor(model, rows) {
  const reasons = [];
  if (HARD_HOLD.has(model)) {
    if (model === "Omoda") reasons.push("exact Omoda model unspecified — keep draft");
    if (model === "Tiggo 8 & 9 Pro") {
      reasons.push("supplier shared Tiggo 8 & 9 Pro grouping — common fitment not verified");
    }
  }
  if (!rows.every((r) => r.fitment_verified === true)) {
    reasons.push("catalogue fitment_verified=false — artwork is not physical-stock proof");
  }
  if (!(VEHICLE_SLUGS[model] || []).length) {
    reasons.push("no matching vehicle page slug mapped yet");
  }
  reasons.push("no pack price or stock supplied");
  return [...new Set(reasons)];
}
function whyBuy() {
  return `<h2>Why buy from CrazzyCars.pk?</h2>
<p>CrazzyCars.pk is a Gujranwala car accessories shop. Message WhatsApp 03284010007 with a clear photo of your infotainment screen (and a measurement of the visible glass if possible) so we can help confirm the frame shape before you order. Cash on Delivery is available on eligible items. Delivery charges follow the current store shipping policy on crazzycars.pk.</p>`;
}
function buildLongDescription(model, colours, holdReasons, vehicleSlugs) {
  const title = productTitle(model);
  const colourList = colours.join(", ");
  const vehNote = vehicleSlugs.length
    ? `<p>Listed against our car pages: ${vehicleSlugs
        .map((s) => `<a href="/cars/${escapeHtml(s)}">${escapeHtml(s)}</a>`)
        .join(", ")}. Still confirm the screen opening on your exact vehicle.</p>`
    : `<p>Vehicle page mapping is incomplete for this listing — confirm fitment with us before purchase.</p>`;
  const holdNote = holdReasons.length
    ? `<p><strong>Listing status:</strong> ${escapeHtml(holdReasons.join("; "))}.</p>`
    : "";
  return `<p>${escapeHtml(
    title
  )} — a coloured rubber trim frame designed to sit around the edge of the car’s infotainment screen. It is <strong>not</strong> a transparent tempered-glass film, not a replacement LCD, and not a full head unit.</p>
<h2>What is in the package</h2>
<ul>
<li>One rubber infotainment screen protector frame</li>
<li>Colour options in this listing: ${escapeHtml(colourList)}</li>
</ul>
<h2>How to match your screen</h2>
<ul>
<li>Compare the frame’s inner opening with your screen’s outer bezel shape (corners, width, height).</li>
<li>Do not guess size from the studio artwork — fitted dashboard views are illustrative only.</li>
<li>Choose the colour you want: ${escapeHtml(colourList)}.</li>
</ul>
<h2>Installation guidance</h2>
<ul>
<li>Clean the screen bezel so dust does not sit under the frame.</li>
<li>Align the frame around the screen perimeter; press evenly until it seats on the bezel.</li>
<li>Do not force a frame that is clearly smaller or a different shape than your screen opening.</li>
</ul>
${vehNote}
${holdNote}
<h2>About these images</h2>
<p>Images are AI studio visualisations with a vehicle reference. They are not photographs of verified CrazzyCars stock installations and do not prove millimetre-accurate fitment.</p>
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

async function main() {
  const handoff = arg("handoff");
  if (!handoff || !fs.existsSync(handoff)) {
    console.error("Missing --handoff=/path/to/pack (with CATALOGUE.json + images/)");
    process.exit(2);
  }
  const dryRun = !hasFlag("apply");
  const publish = hasFlag("publish");
  const mediaRoot = arg("media-root", process.env.MEDIA_ROOT || "/app/media");
  const outDir = arg("out", path.join(handoff, "import-out"));
  const backupPath = arg("backup", path.join(outDir, "backup-before-light10.json"));
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
    throw new Error(`Expected ${EXPECTED_ROWS} catalogue rows, got ${catalogue?.length}`);
  }

  const rows = [];
  for (const row of catalogue) {
    const abs = path.join(handoff, "images", row.file);
    if (!fs.existsSync(abs)) throw new Error(`missing ${row.file}`);
    const buf = fs.readFileSync(abs);
    const h = crypto.createHash("sha256").update(buf).digest("hex");
    if (row.sha256 && h !== row.sha256) throw new Error(`sha mismatch ${row.file}`);
    if (!pngOk(buf, 1254, 1254)) throw new Error(`dims ${row.file}`);
    rows.push({ ...row, _abs: abs, _sha: h, asset_id: row.file.replace(/\.png$/i, "") });
  }
  console.log(`SHA OK light10=${rows.length}`);

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
  const gadgets = await Category.findOne({ slug: "gadgets" });
  if (!interior || !gadgets) throw new Error("Missing interior / gadgets categories");

  const byModel = new Map();
  for (const r of rows) {
    if (!byModel.has(r.model)) byModel.set(r.model, []);
    byModel.get(r.model).push(r);
  }

  const preBackupQuery = {
    $or: [
      { importKey: { $in: [...byModel.keys()].map((m) => `crazzycars-screenprot-light10:${slugifyModel(m)}`) } },
      { slug: { $in: [...byModel.keys()].map((m) => productSlug(m)) } },
      { tags: BATCH },
    ],
  };
  const preDocs = await Product.find(preBackupQuery).toArray();
  const preBackupFile = backupPath.replace(/\.json$/i, ".pre.json");
  fs.mkdirSync(path.dirname(preBackupFile), { recursive: true });
  fs.writeFileSync(
    preBackupFile,
    JSON.stringify(
      { created_at: new Date().toISOString(), phase: "pre", dry_run: dryRun, db: LIVE_DB, batch: BATCH, count: preDocs.length, products: preDocs },
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
    publish,
    policy: {
      scope: "light10_only",
      prices_stock: "none_in_pack_all_new_draft",
      omoda_tiggo: "hard_hold_draft",
      deleted_haval_slug: "avoided_via_-frame_suffix",
    },
    summary: {
      catalogue_rows: EXPECTED_ROWS,
      models: byModel.size,
      draft_creates: 0,
      draft_updates: 0,
      colour_merges: 0,
      colour_skips: 0,
      published: 0,
      held: 0,
    },
    products: [],
    rows: [],
    backup_path: preBackupFile,
  };

  for (const [model, modelRows] of [...byModel.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const holdReasons = holdReasonsFor(model, modelRows);
    const slug = productSlug(model);
    const importKey = `crazzycars-screenprot-light10:${slugifyModel(model)}`;
    const articleNo = `CC-SPF-${skuSlug(model)}`;
    const vehicleSlugs = VEHICLE_SLUGS[model] || [];
    const coloursWanted = sortColours(modelRows.map((r) => r.colour));

    // Resolve vehicle ObjectIds if present
    const vehicleDocs = [];
    for (const vs of vehicleSlugs) {
      const v = await Vehicle.findOne({ slug: vs }, { projection: { _id: 1, slug: 1, name: 1, make: 1, model: 1 } });
      if (v) vehicleDocs.push(v);
    }

    const existing =
      (await Product.findOne({ importKey })) ||
      (await Product.findOne({ articleNo })) ||
      (await Product.findOne({ slug }));

    const have = existing ? existingColourSet(existing) : new Set();
    const toAdd = modelRows.filter((r) => !have.has(r.colour));
    const already = modelRows.filter((r) => have.has(r.colour));
    plan.summary.colour_skips += already.length;

    const staged = toAdd.map((r) => {
      const destName = `spf-${r.asset_id}-${shortHash(r._sha)}.png`;
      return {
        row: r,
        destName,
        destAbs: path.join(mediaRootProducts, destName),
        destUrl: `/media/products/${destName}`,
      };
    });

    // Always draft: no verified price/stock/fitment in this pack
    const forceDraft = true;
    const canPublish =
      publish &&
      !HARD_HOLD.has(model) &&
      !forceDraft &&
      existing &&
      existing.status === "active" &&
      Number(existing.pricing?.salePrice) > 0 &&
      Number(existing.inventory?.quantity) > 0;

    for (const r of modelRows) {
      const isNew = toAdd.some((x) => x.asset_id === r.asset_id);
      plan.rows.push({
        asset_id: r.asset_id,
        model,
        colour: r.colour,
        disposition: !isNew
          ? "skip_colour_already_present"
          : existing
            ? "merge_colour_on_draft"
            : "create_draft",
        product_slug: slug,
        hold_reasons: holdReasons,
        hard_hold: HARD_HOLD.has(model),
      });
    }

    if (!existing) {
      const colours = coloursWanted;
      const mediaImages = staged.map((s, idx) => ({
        url: s.destUrl,
        publicId: "",
        isMain: idx === 0,
        altText: `${productTitle(model)} – ${s.row.colour} rubber frame visualisation – CrazzyCars.pk`,
        alt: `${productTitle(model)} – ${s.row.colour}`,
        label: `${s.row.colour} visualisation`,
        imageName: productTitle(model),
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
      const name = productTitle(model);
      const shortDescription = `${name} in ${colours.join(
        ", "
      )}. Rubber perimeter frame for the infotainment screen — not a glass film. Studio visualisation; confirm screen shape and size before ordering.`;
      const metaTitle = `${name} | CrazzyCars.pk`;
      const metaDescription = `Shop ${model} rubber infotainment screen protector frame colours in Pakistan. Match your screen opening before order. CrazzyCars.pk Gujranwala.`;

      const setDoc = {
        name,
        slug,
        articleNo,
        importKey,
        shortDescription,
        longDescription: buildLongDescription(model, colours, holdReasons, vehicleSlugs),
        features: [
          FIT_NOTE,
          `Colours in this listing: ${colours.join(", ")}`,
          "Package: one rubber screen-perimeter frame",
          "Confirm screen shape/size before ordering — artwork is illustrative",
        ],
        specifications: [
          { label: "Product", value: "Rubber infotainment screen protector frame" },
          { label: "Material", value: "Rubber frame (perimeter trim)" },
          { label: "Vehicle model (owner label)", value: model },
          { label: "Colours (imaged)", value: colours.join(", ") },
          { label: "Package contents", value: "1 × rubber screen frame" },
          { label: "Not included", value: "Tempered glass film, replacement screen, head unit" },
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
        categories: [interior._id, gadgets._id],
        primaryCategorySlug: "interior",
        tags: Array.from(
          new Set([
            BATCH,
            importKey,
            "screen protector frame",
            "rubber screen frame",
            "infotainment screen protector",
            "car screen bezel",
            slugifyModel(model),
            ...colours.map((c) => c.toLowerCase()),
            model.toLowerCase(),
          ])
        ),
        isUniversal: false,
        isBulky: false,
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
        metaTitle,
        metaDescription,
        seo: {
          metaTitle,
          metaDescription,
          metaKeywords: [model, "screen protector frame", "Pakistan", "CrazzyCars.pk"],
          excludeFromMerchantFeed: true,
          excludeFromSitemap: true,
          excludeFromListings: true,
          robots: "noindex,nofollow",
          omitProductSchemaImage: false,
        },
        status: "draft",
        securityHold: true,
        securityHoldReason: `Screen protector Light10 hold: ${holdReasons.join("; ")}`,
        vendor: "CrazzyCars.pk",
        condition: "new",
        segment: "car",
        metadata: {
          batch_id: BATCH,
          owner_model: model,
          hold_reasons: holdReasons,
          hard_hold: HARD_HOLD.has(model),
          available_colours: colours,
          asset_ids: modelRows.map((r) => r.asset_id),
          image_kind: "AI studio visualisation; not physical-stock photography",
          vehicle_slugs: vehicleSlugs,
          pricing_source: "draft_no_pack_price",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      plan.summary.draft_creates += 1;
      plan.summary.held += 1;
      plan.products.push({
        action: "create_draft",
        model,
        slug,
        articleNo,
        importKey,
        status: "draft",
        securityHold: true,
        colours,
        media_added: staged.map((s) => s.destName),
        hold_reasons: holdReasons,
        hard_hold: HARD_HOLD.has(model),
        vehicle_slugs: vehicleSlugs,
        live_url: `https://crazzycars.pk/${slug}`,
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

    // Merge colours into existing parent (idempotent)
    if (!staged.length) {
      plan.products.push({
        action: "noop_colours_present",
        model,
        slug,
        colours_already: already.map((r) => r.colour),
        hold_reasons: holdReasons,
        existingId: String(existing._id),
        status: existing.status,
        live_url: `https://crazzycars.pk/${slug}`,
      });
      continue;
    }

    const prevImages = Array.isArray(existing.media?.images) ? [...existing.media.images] : [];
    const addedImages = staged.map((s) => ({
      url: s.destUrl,
      publicId: "",
      isMain: false,
      altText: `${productTitle(model)} – ${s.row.colour} rubber frame visualisation – CrazzyCars.pk`,
      alt: `${productTitle(model)} – ${s.row.colour}`,
      label: `${s.row.colour} visualisation`,
      imageName: productTitle(model),
      width: 1254,
      height: 1254,
    }));
    const mediaImages = [...prevImages];
    for (const im of addedImages) {
      if (!mediaImages.some((x) => x.url === im.url)) mediaImages.push(im);
    }
    if (!mediaImages.some((x) => x.isMain) && mediaImages[0]) mediaImages[0].isMain = true;

    const sale = Number(existing.pricing?.salePrice) || 0;
    const regular = Number(existing.pricing?.regularPrice) || 0;
    const qty = Number(existing.inventory?.quantity) || 0;
    const prevCombos = Array.isArray(existing.variationCombinations)
      ? [...existing.variationCombinations]
      : [];
    for (const s of staged) {
      if (prevCombos.some((c) => colourFromCombo(c) === s.row.colour)) continue;
      prevCombos.push({
        options: [{ name: COLOUR_AXIS, value: s.row.colour }],
        priceDelta: 0,
        weightDelta: 0,
        price: sale,
        compareAtPrice: regular,
        weight: 0,
        stock: qty,
        sku: `${articleNo}-${s.row.colour.replace(/\s+/g, "").toUpperCase()}`,
        image: s.destUrl,
      });
    }
    const mergedColours = sortColours([...have, ...staged.map((s) => s.row.colour)]);
    const prevTags =
      (existing.simpleVariations || []).find((v) => /colour|color/i.test(v?.name || ""))?.tags || [];
    const simpleVariations = [
      {
        name: COLOUR_AXIS,
        enabled: true,
        tags: sortColours([...prevTags, ...staged.map((s) => s.row.colour)]),
      },
      ...(existing.simpleVariations || []).filter((v) => !/colour|color/i.test(v?.name || "")),
    ];

    const metaPatch = {
      ...(existing.metadata || {}),
      available_colours: mergedColours,
      asset_ids: Array.from(
        new Set([...(existing.metadata?.asset_ids || []), ...modelRows.map((r) => r.asset_id)])
      ),
      hold_reasons: holdReasons,
      light10_merged_at: new Date().toISOString(),
      batch_id: BATCH,
    };

    const setDoc = {
      simpleVariations,
      variationCombinations: prevCombos,
      media: { images: mediaImages, videos: existing.media?.videos || [] },
      longDescription: buildLongDescription(model, mergedColours, holdReasons, vehicleSlugs),
      shortDescription: `${productTitle(model)} in ${mergedColours.join(
        ", "
      )}. Rubber perimeter frame for the infotainment screen — not a glass film. Studio visualisation; confirm screen shape and size before ordering.`,
      tags: Array.from(new Set([...(existing.tags || []), BATCH, ...mergedColours.map((c) => c.toLowerCase())])),
      metadata: metaPatch,
      updatedAt: new Date(),
    };
    // Never auto-activate without price/stock/fitment
    if (!canPublish) {
      setDoc.status = existing.status === "active" && sale > 0 && qty > 0 ? existing.status : "draft";
      if (setDoc.status === "draft") {
        setDoc.securityHold = true;
        setDoc.securityHoldReason = `Screen protector Light10 hold: ${holdReasons.join("; ")}`;
        setDoc.seo = {
          ...(existing.seo || {}),
          excludeFromMerchantFeed: true,
          excludeFromSitemap: true,
          excludeFromListings: true,
          robots: "noindex,nofollow",
        };
      }
    }

    plan.summary.colour_merges += staged.length;
    plan.summary.draft_updates += 1;
    plan.summary.held += 1;
    plan.products.push({
      action: "merge_colour_on_existing",
      model,
      slug,
      articleNo,
      status: setDoc.status || existing.status,
      colours_added: staged.map((s) => s.row.colour),
      colours_after: mergedColours,
      media_added: staged.map((s) => s.destName),
      primary_retained: prevImages.find((i) => i.isMain)?.url || null,
      hold_reasons: holdReasons,
      hard_hold: HARD_HOLD.has(model),
      existingId: String(existing._id),
      live_url: `https://crazzycars.pk/${slug}`,
    });

    if (!dryRun) {
      fs.mkdirSync(mediaRootProducts, { recursive: true });
      for (const s of staged) {
        if (!fs.existsSync(s.destAbs)) fs.copyFileSync(s.row._abs, s.destAbs);
        if (sha256File(s.destAbs) !== s.row._sha) throw new Error(`post-copy sha ${s.destName}`);
        await writeDerivatives(s.destAbs);
      }
      await Product.updateOne({ _id: existing._id }, { $set: setDoc });
      console.log("merged", String(existing._id), slug, staged.map((s) => s.row.colour).join(","));
    }
  }

  if (plan.rows.length !== EXPECTED_ROWS) {
    throw new Error(`row accounting ${plan.rows.length}`);
  }

  const postDocs = await Product.find(preBackupQuery).toArray();
  fs.writeFileSync(
    backupPath.replace(/\.json$/i, ".post.json"),
    JSON.stringify(
      {
        created_at: new Date().toISOString(),
        phase: dryRun ? "dry-run-snapshot" : "post",
        dry_run: dryRun,
        db: LIVE_DB,
        batch: BATCH,
        count: postDocs.length,
        products: postDocs,
      },
      null,
      2
    )
  );

  fs.writeFileSync(path.join(outDir, "plan.json"), JSON.stringify(plan, null, 2));
  fs.writeFileSync(path.join(outDir, "report.md"), buildMarkdownReport(plan));
  console.log(JSON.stringify({ dryRun, publish, ...plan.summary, products: plan.products.length, outDir }, null, 2));
  await mongoose.disconnect();
}

function buildMarkdownReport(plan) {
  const lines = [];
  lines.push(`# Rubber Screen Protector Frames — Light 10 import report`);
  lines.push("");
  lines.push(`Generated: ${plan.created_at}`);
  lines.push(`Dry-run: ${plan.dry_run} · Publish flag: ${plan.publish}`);
  lines.push(`Batch: \`${plan.batch}\``);
  lines.push("");
  lines.push(`## Summary`);
  lines.push(`- Catalogue rows: **${plan.summary.catalogue_rows}**`);
  lines.push(`- Models: **${plan.summary.models}**`);
  lines.push(`- Draft creates: **${plan.summary.draft_creates}**`);
  lines.push(`- Draft updates / merges: **${plan.summary.draft_updates}**`);
  lines.push(`- Colour merges: **${plan.summary.colour_merges}**`);
  lines.push(`- Colour skips: **${plan.summary.colour_skips}**`);
  lines.push(`- Published: **${plan.summary.published}**`);
  lines.push(`- Held: **${plan.summary.held}**`);
  lines.push("");
  lines.push(`## Policy`);
  lines.push(`- Products are **rubber perimeter frames**, not glass films.`);
  lines.push(`- Artwork is AI visualisation — not physical fitment proof.`);
  lines.push(`- No pack prices/stock → **all new listings draft + securityHold**.`);
  lines.push(`- **Omoda** and **Tiggo 8 & 9 Pro** hard-held until exact fitment is confirmed.`);
  lines.push(`- Haval slug uses \`-frame\` suffix to avoid deleted redirect \`/haval-h6-rubber-infotainment-screen-protector\`.`);
  lines.push("");
  lines.push(`## Products`);
  for (const p of plan.products) {
    lines.push(`### ${p.model}`);
    lines.push(`- Action: \`${p.action}\``);
    lines.push(`- Slug: \`${p.slug}\``);
    lines.push(`- URL: ${p.live_url}`);
    if (p.colours) lines.push(`- Colours: ${p.colours.join(", ")}`);
    if (p.colours_added) lines.push(`- Colours added: ${p.colours_added.join(", ")}`);
    if (p.hold_reasons?.length) lines.push(`- Hold: ${p.hold_reasons.join("; ")}`);
    if (p.hard_hold) lines.push(`- Hard hold: yes`);
    if (p.vehicle_slugs?.length) lines.push(`- Vehicles: ${p.vehicle_slugs.join(", ")}`);
    lines.push("");
  }
  lines.push(`## All 10 source rows`);
  lines.push(`| asset_id | model | colour | disposition | product |`);
  lines.push(`|---|---|---|---|---|`);
  for (const r of plan.rows) {
    lines.push(
      `| ${r.asset_id} | ${r.model} | ${r.colour} | ${r.disposition} | ${r.product_slug} |`
    );
  }
  lines.push("");
  lines.push(`## Rollback`);
  lines.push(`1. Restore products from \`${plan.backup_path}\` (pre snapshot).`);
  lines.push(`2. Delete draft products created by this batch if pre count was 0.`);
  lines.push(`3. Remove \`spf-<asset_id>-*\` media files added by this import.`);
  lines.push("");
  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

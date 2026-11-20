#!/usr/bin/env node
/**
 * CrazzyCars.pk — Complete Emblems / Bosch bulbs / styling refs + 4 blog drafts
 *
 * DRAFT ONLY. Pack supplies no prices/qty → salePrice null, securityHold, noindex.
 * Illustrative posters only. Do not invent prices from other batches.
 * references_original/ stay private (not storefront gallery).
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
const BATCH = "CC-COMPLETE-EMBLEMS-BOSCH-BLOGS";
const IMPORT_PREFIX = "crazzycars-complete-emb-bosch:";
const EXPECTED_PRODUCTS = 14;
const EXPECTED_BLOGS = 4;

const ARTICLE = {
  "01-kia-logo": "CC-EMB-KIA",
  "02-hyundai-logo": "CC-EMB-HYUNDAI",
  "03-suzuki-logo": "CC-EMB-SUZUKI",
  "04-mg-logo": "CC-EMB-MG",
  "05-honda-logo": "CC-EMB-HONDA",
  "06-toyota-logo": "CC-EMB-TOYOTA",
  "07-bosch-h11": "CC-BOSCH-LED-H11",
  "08-bosch-9005": "CC-BOSCH-LED-9005",
  "09-bosch-h4": "CC-BOSCH-LED-H4",
  "10-bosch-9006": "CC-BOSCH-LED-9006",
  "11-led-trunk-strip": "CC-LED-TRUNK-STRIP",
  "12-body-kit-reference": "CC-BODYKIT-REF",
  "13-civic-x-headlight-style": "CC-CIVICX-HL-REF",
  "14-honda-red-logo": "CC-EMB-HONDA-RED",
};

/** Prefer descriptive slugs; pack short slugs kept as metadata.pack_slug */
const STORE_SLUG = {
  "01-kia-logo": "kia-logo-emblems",
  "02-hyundai-logo": "hyundai-logo-emblems",
  "03-suzuki-logo": "suzuki-logo-emblems",
  "04-mg-logo": "mg-logo-emblems",
  "05-honda-logo": "honda-logo-emblems",
  "06-toyota-logo": "toyota-logo-emblems",
  "07-bosch-h11": "bosch-branded-led-bulbs-h11",
  "08-bosch-9005": "bosch-branded-led-bulbs-9005-hb3",
  "09-bosch-h4": "bosch-branded-led-bulbs-h4",
  "10-bosch-9006": "bosch-branded-led-bulbs-9006-hb4",
  "11-led-trunk-strip": "led-trunk-lip-strip",
  "12-body-kit-reference": "multi-piece-body-kit-reference",
  "13-civic-x-headlight-style": "honda-civic-x-headlight-style-reference",
  "14-honda-red-logo": "honda-red-on-black-logo-emblem",
};

const RELATED_EXISTING = {
  "05-honda-logo": ["honda-carbon-steering-monogram-logo-emblem"],
  "06-toyota-logo": ["toyota-corolla-2009-2026-carbon-steering-monogram-abs"],
  "14-honda-red-logo": ["honda-carbon-steering-monogram-logo-emblem"],
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
function inlineMd(s) {
  return escapeHtml(s)
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
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
    if (/^---\s*$/.test(line.trim())) continue;
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      flushList();
      out.push(`<h2>${inlineMd(h2[1])}</h2>`);
      continue;
    }
    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) {
      flushList();
      out.push(`<h3>${inlineMd(h3[1])}</h3>`);
      continue;
    }
    const li = line.match(/^[-*]\s+(.*)$/);
    if (li) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inlineMd(li[1])}</li>`);
      continue;
    }
    flushList();
    out.push(`<p>${inlineMd(line)}</p>`);
  }
  flushList();
  return out.join("\n");
}
function whyBuy(kind) {
  const tip =
    kind === "bulb"
      ? "Send clear photos of the lamp housing / original bulb base (and model year + trim) on WhatsApp 03284010007 so we can help match the fitting before you order."
      : kind === "emblem"
        ? "Send width/height measurements and a photo of the mounting area (not airbag-cover assumptions) on WhatsApp 03284010007 before ordering."
        : "Message WhatsApp 03284010007 with vehicle year/trim and clear photos so we can confirm the exact stock item.";
  return `<h2>Why buy from CrazzyCars.pk?</h2>
<p>CrazzyCars.pk is a Gujranwala car accessories shop. ${tip} Cash on Delivery is available on eligible priced items. Delivery charges follow the current store shipping policy on crazzycars.pk.</p>`;
}
function categorySlugsFor(kind) {
  if (kind === "emblem") return ["stickers-monograms-emblems", "exterior"];
  if (kind === "bulb") return ["led-headlights-bulbs", "led-lighting"];
  if (kind === "strip") return ["led-lighting", "exterior"];
  if (kind === "kit") return ["body-kits-extensions", "exterior"];
  if (kind === "headlight") return ["led-headlights-bulbs", "led-lighting"];
  return ["exterior"];
}
function holdReasons(row) {
  const base = [
    ...(row.publish_blockers || []),
    "selling price not supplied",
    "illustrative poster — not verified stock photography",
    "package quantity / availability unconfirmed",
  ];
  if (row.kind === "bulb") {
    base.push("manufacturer part number / authenticity unconfirmed");
    base.push("do not publish wattage/lumen/Kelvin/warranty claims without evidence");
    base.push("vehicle fitment not independently verified for this LED series");
  }
  if (row.kind === "emblem") {
    base.push("size / mounting / front-rear / steering application unconfirmed");
    base.push("carbon-look finish is not verified genuine carbon fibre");
  }
  if (row.id === "09-bosch-h4") base.push("H4 is owner-requested illustration — real H4 stock photo missing");
  if (row.kind === "kit" || row.kind === "headlight" || row.kind === "strip") {
    base.push("exact stock SKU / packing list / functions unconfirmed — reference listing only");
  }
  return [...new Set(base.map(String))];
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

function stripFrontMatter(md) {
  const s = String(md || "");
  if (!s.startsWith("---")) return s;
  const end = s.indexOf("\n---", 3);
  if (end < 0) return s;
  return s.slice(end + 4).replace(/^\s+/, "");
}

async function main() {
  const handoff = arg("handoff");
  if (!handoff || !fs.existsSync(handoff)) {
    console.error("Missing --handoff=/path");
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
  if (!Array.isArray(products) || products.length !== EXPECTED_PRODUCTS) {
    throw new Error(`Expected ${EXPECTED_PRODUCTS} products, got ${products?.length}`);
  }
  const blogIndex = JSON.parse(fs.readFileSync(path.join(handoff, "BLOG_INDEX.json"), "utf8"));
  if (!Array.isArray(blogIndex) || blogIndex.length !== EXPECTED_BLOGS) {
    throw new Error(`Expected ${EXPECTED_BLOGS} blogs, got ${blogIndex?.length}`);
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
    if (row.selling_price_pkr != null && Number(row.selling_price_pkr) > 0) {
      throw new Error(`${row.id}: pack must not invent selling_price_pkr`);
    }
    if (row.compare_at_price_pkr != null && Number(row.compare_at_price_pkr) > 0) {
      throw new Error(`${row.id}: pack must not invent compare_at_price_pkr`);
    }
    rows.push({ ...row, _abs: abs, _sha: h, _asset: path.basename(row.image, ".png") });
  }
  console.log(`SHA OK products=${rows.length}`);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (db.databaseName !== LIVE_DB) {
    console.error(`REFUSE connected ${db.databaseName}`);
    process.exit(2);
  }
  const Product = db.collection("products");
  const Category = db.collection("categories");
  const BlogPost = db.collection("blogposts");

  const catCache = {};
  async function catsFor(kind) {
    const slugs = categorySlugsFor(kind);
    const ids = [];
    for (const slug of slugs) {
      if (!catCache[slug]) {
        const c = await Category.findOne({ slug });
        if (!c) throw new Error(`Missing category ${slug}`);
        catCache[slug] = c;
      }
      ids.push(catCache[slug]._id);
    }
    return { ids, primary: slugs[0] };
  }

  const importKeys = rows.map((r) => `${IMPORT_PREFIX}${r.id}`);
  const articleNos = rows.map((r) => ARTICLE[r.id]);
  const storeSlugs = rows.map((r) => STORE_SLUG[r.id]);
  const preDocs = await Product.find({
    $or: [{ importKey: { $in: importKeys } }, { articleNo: { $in: articleNos } }, { slug: { $in: storeSlugs } }],
  }).toArray();
  const blogSlugs = blogIndex.map((b) => b.slug);
  const preBlogs = await BlogPost.find({ slug: { $in: blogSlugs } }).toArray();
  const preBackup = path.join(outDir, "backup-before-emblems-bosch.pre.json");
  fs.writeFileSync(
    preBackup,
    JSON.stringify(
      {
        created_at: new Date().toISOString(),
        phase: "pre",
        dry_run: dryRun,
        db: LIVE_DB,
        batch: BATCH,
        products: preDocs,
        blogs: preBlogs,
      },
      null,
      2
    )
  );
  console.log(`pre-backup products=${preDocs.length} blogs=${preBlogs.length}`);

  const mediaProducts = path.join(mediaRoot, "products");
  const mediaBlogs = path.join(mediaRoot, "blogs");
  const mediaPrivate = path.join(mediaRoot, "_private", "complete-pack-refs");

  const plan = {
    dry_run: dryRun,
    created_at: new Date().toISOString(),
    batch: BATCH,
    policy: {
      status: "draft_only",
      price: "null_until_owner_confirms",
      blogs: "draft_only",
      references_original: "private_only",
      currency: "PKR",
    },
    summary: {
      product_creates: 0,
      product_updates: 0,
      blog_creates: 0,
      blog_updates: 0,
      published: 0,
      related_existing_noted: 0,
    },
    review_table: [],
    blog_table: [],
    related_existing: [],
    backup_path: preBackup,
  };

  // Private reference photos (never attached to public galleries)
  const refsDir = path.join(handoff, "references_original");
  if (fs.existsSync(refsDir) && !dryRun) {
    fs.mkdirSync(mediaPrivate, { recursive: true });
    for (const name of fs.readdirSync(refsDir)) {
      const src = path.join(refsDir, name);
      if (!fs.statSync(src).isFile()) continue;
      const dest = path.join(mediaPrivate, name.replace(/\s+/g, "-"));
      if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
    }
  }

  for (const row of rows) {
    const articleNo = ARTICLE[row.id];
    const slug = STORE_SLUG[row.id];
    if (!articleNo || !slug) throw new Error(`mapping missing for ${row.id}`);
    const importKey = `${IMPORT_PREFIX}${row.id}`;
    const hold = holdReasons(row);
    const { ids: categoryIds, primary: primaryCategorySlug } = await catsFor(row.kind);

    const relatedSlugs = RELATED_EXISTING[row.id] || [];
    const relatedDocs = [];
    for (const rs of relatedSlugs) {
      const ex = await Product.findOne(
        { slug: rs },
        { projection: { _id: 1, slug: 1, name: 1, articleNo: 1, status: 1, "pricing.salePrice": 1 } }
      );
      if (ex) {
        relatedDocs.push(ex);
        plan.related_existing.push({
          catalogue_id: row.id,
          related_slug: ex.slug,
          related_sku: ex.articleNo,
          related_status: ex.status,
          related_sale: ex.pricing?.salePrice ?? null,
          disposition: "note_only_do_not_merge",
        });
        plan.summary.related_existing_noted += 1;
      }
    }

    // Never merge into priced active steering monograms / unrelated spoilers
    const existing =
      (await Product.findOne({ importKey })) ||
      (await Product.findOne({ articleNo })) ||
      (await Product.findOne({ slug }));

    if (
      existing &&
      existing.status === "active" &&
      Number(existing.pricing?.salePrice) > 0 &&
      !String(existing.importKey || "").startsWith(IMPORT_PREFIX)
    ) {
      plan.review_table.push({
        catalogue_id: row.id,
        product_id: String(existing._id),
        sku: existing.articleNo,
        title: existing.name,
        kind: row.kind,
        draft_state: existing.status,
        price_state: existing.pricing?.salePrice ?? null,
        disposition: "skip_existing_active_priced",
        unresolved: hold,
        live_url: `https://crazzycars.pk/${existing.slug}`,
      });
      continue;
    }

    const destName = `embbosch-${row._asset}-${shortHash(row._sha)}.png`;
    const destAbs = path.join(mediaProducts, destName);
    const destUrl = `/media/products/${destName}`;
    const alt = row.image_alt || `${row.title} — illustrative preview — CrazzyCars.pk`;
    const longHtml = `${mdToHtml(row.description)}\n${whyBuy(row.kind)}
<p><strong>Draft blockers:</strong> ${escapeHtml(hold.join("; "))}.</p>`;

    const faqs = Array.isArray(row.faqs)
      ? row.faqs.map((f) => ({ question: f.question, answer: f.answer }))
      : [];

    const setDoc = {
      name: row.title,
      slug,
      articleNo,
      importKey,
      shortDescription: row.short_description || "",
      longDescription: longHtml,
      features: [
        row.kind === "emblem"
          ? "Carbon-look logo emblem accessory — finish is visual style, not verified genuine carbon fibre"
          : row.kind === "bulb"
            ? "Bosch-branded LED bulb listing — authenticity and electrical claims pending verification"
            : "Styling / lighting reference listing — exact stock identity pending confirmation",
        "Illustrative catalogue poster — not verified stock photography",
        "Price, quantity and package contents unconfirmed",
        row.fitment_section || "Confirm fitment against the physical item before ordering",
      ],
      specifications: [
        { label: "Product type", value: row.kind },
        { label: "Currency", value: "PKR" },
        { label: "Sale price (PKR)", value: "Pending confirmation" },
        { label: "Package quantity", value: "Unconfirmed" },
        { label: "Listing code", value: articleNo },
        { label: "Condition", value: "New" },
        { label: "Image status", value: "AI illustration — not verified stock photo" },
        ...(row.socket_requested
          ? [{ label: "Requested fitting", value: String(row.socket_requested) }]
          : []),
        ...(row.standard_base_reference
          ? [{ label: "Base reference", value: String(row.standard_base_reference) }]
          : []),
      ],
      pricing: {
        regularPrice: 0,
        salePrice: null,
        costPerItem: 0,
        saleSchedule: { enabled: false },
      },
      inventory: {
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
            label: "Illustrative catalogue poster",
            imageName: row.title,
            width: 0,
            height: 0,
          },
        ],
        videos: [],
      },
      categories: categoryIds,
      primaryCategorySlug,
      tags: Array.from(
        new Set([BATCH, importKey, row.kind, ...(row.tags || []), row.title, "CrazzyCars.pk"])
      ),
      isUniversal: row.kind === "bulb" || row.kind === "strip",
      isBulky: row.kind === "kit",
      codEligible: false,
      codEnabled: false,
      vehicleCompatibility: {
        fitmentType: "unverified",
        universalNote:
          row.fitment_section ||
          "Artwork vehicle is image context only — not verified compatibility. Confirm the physical part before ordering.",
        vehicles: [],
        categories: [],
      },
      compatibleCars: [],
      compatibleVehicles: [],
      primaryCarSlug: "",
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
      securityHoldReason: `${BATCH} hold: ${hold.join("; ")}`,
      vendor: "CrazzyCars.pk",
      condition: "new",
      segment: "car",
      metadata: {
        batch_id: BATCH,
        catalogue_id: row.id,
        pack_reference: row.reference,
        pack_slug: row.slug,
        sha256: row._sha,
        kind: row.kind,
        hold_reasons: hold,
        publish_blockers: row.publish_blockers || [],
        unconfirmed_fields: [
          "selling price",
          "stock quantity",
          "package quantity",
          "availability",
          "photo-to-stock match",
        ],
        pricing_source: "pending_owner",
        currency: "PKR",
        image_is_stock_photo: false,
        vehicle_in_artwork: row.vehicle_in_artwork || "",
        related_existing_slugs: relatedDocs.map((d) => d.slug),
        source_photos: row.source_photos || [],
        manufacturer_authenticity: row.manufacturer_authenticity,
        socket_requested: row.socket_requested,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Keep product FAQs in metadata for admin review (schema may not have top-level faqs)
    if (faqs.length) setDoc.metadata.faqs = faqs;

    const action = existing ? "draft_update" : "create_draft";
    if (existing) plan.summary.product_updates += 1;
    else plan.summary.product_creates += 1;

    plan.review_table.push({
      catalogue_id: row.id,
      product_id: existing ? String(existing._id) : null,
      sku: articleNo,
      title: row.title,
      kind: row.kind,
      family_strategy: row.proposed_group || "create_draft",
      image: destUrl,
      draft_state: "draft",
      price_state: "unset",
      stock_state: "unset",
      fitment_evidence: "none_public",
      disposition: action,
      related_existing: relatedDocs.map((d) => d.slug),
      unresolved: hold,
      live_url: `https://crazzycars.pk/${slug}`,
    });

    if (!dryRun) {
      fs.mkdirSync(mediaProducts, { recursive: true });
      if (!fs.existsSync(destAbs)) fs.copyFileSync(row._abs, destAbs);
      if (sha256File(destAbs) !== row._sha) throw new Error(`post-copy sha ${destName}`);
      await writeDerivatives(destAbs);
      if (existing) {
        await Product.updateOne(
          { _id: existing._id },
          { $set: { ...setDoc, createdAt: existing.createdAt || setDoc.createdAt } }
        );
        console.log("draft_update", slug, String(existing._id));
      } else {
        const ins = await Product.insertOne(setDoc);
        console.log("created_draft", String(ins.insertedId), slug);
      }
    }
  }

  // --- Blogs (draft only) ---
  for (const b of blogIndex) {
    const mdPath = path.join(handoff, b.file);
    if (!fs.existsSync(mdPath)) throw new Error(`missing blog ${b.file}`);
    const md = fs.readFileSync(mdPath, "utf8");
    const html = mdToHtml(stripFrontMatter(md));
    const wordCount = String(md)
      .replace(/<[^>]*>/g, " ")
      .split(/\s+/)
      .filter(Boolean).length;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    let featuredUrl = "";
    let featuredAlt = b.title;
    if (b.suggested_cover_image) {
      const coverAbs = path.join(handoff, b.suggested_cover_image);
      if (fs.existsSync(coverAbs)) {
        const base = path.basename(b.suggested_cover_image, ".png");
        const destName = `blog-${base}-${shortHash(sha256File(coverAbs))}.png`;
        const destAbs = path.join(mediaBlogs, destName);
        featuredUrl = `/media/blogs/${destName}`;
        if (!dryRun) {
          fs.mkdirSync(mediaBlogs, { recursive: true });
          if (!fs.existsSync(destAbs)) fs.copyFileSync(coverAbs, destAbs);
          await writeDerivatives(destAbs);
        }
      }
    }

    const existingBlog = await BlogPost.findOne({ slug: b.slug });
    // Strip unresolved product links — only keep absolute crazzycars.pk paths that exist later; for drafts, leave relative product slugs out of relatedProducts
    const blogDoc = {
      title: b.title,
      slug: b.slug,
      excerpt: b.meta_description || "",
      content: html,
      featuredImage: {
        url: featuredUrl,
        publicId: "",
        altText: featuredAlt,
      },
      author: { name: "CrazzyCars.pk", avatar: "", bio: "" },
      categories: ["Buying Guides"],
      tags: ["CrazzyCars.pk", "fitment", "draft"],
      status: "draft",
      views: existingBlog?.views || 0,
      contentUpdatedAt: new Date(),
      readTime,
      seo: {
        metaTitle: b.meta_title || b.title,
        metaDescription: b.meta_description || "",
        metaKeywords: ["CrazzyCars.pk", "car accessories Pakistan"],
      },
      allowComments: true,
      isFeatured: false,
      relatedProducts: [],
      updatedAt: new Date(),
    };

    const action = existingBlog ? "blog_draft_update" : "blog_draft_create";
    if (existingBlog) plan.summary.blog_updates += 1;
    else plan.summary.blog_creates += 1;

    plan.blog_table.push({
      slug: b.slug,
      title: b.title,
      status: "draft",
      disposition: action,
      cover: featuredUrl || null,
      live_url: `https://crazzycars.pk/blogs/${b.slug}`,
    });

    if (!dryRun) {
      if (existingBlog) {
        await BlogPost.updateOne(
          { _id: existingBlog._id },
          { $set: { ...blogDoc, createdAt: existingBlog.createdAt || new Date() } }
        );
        console.log("blog_update", b.slug, String(existingBlog._id));
      } else {
        const ins = await BlogPost.insertOne({ ...blogDoc, createdAt: new Date() });
        console.log("blog_create", b.slug, String(ins.insertedId));
      }
    }
  }

  const planPath = path.join(outDir, "plan-emblems-bosch-blogs.json");
  const mdOut = path.join(outDir, "review-emblems-bosch-blogs.md");
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
  fs.writeFileSync(
    mdOut,
    [
      `# Emblems / Bosch / styling + blogs — review`,
      ``,
      `Batch \`${BATCH}\` · dry_run=${dryRun}`,
      ``,
      `## Products`,
      `| ID | SKU | Title | Kind | Price | Disposition |`,
      `|----|-----|-------|------|-------|-------------|`,
      ...plan.review_table.map(
        (r) =>
          `| ${r.catalogue_id} | ${r.sku} | ${r.title} | ${r.kind} | ${r.price_state} | ${r.disposition} |`
      ),
      ``,
      `## Blogs`,
      `| Slug | Status | Disposition |`,
      `|------|--------|-------------|`,
      ...plan.blog_table.map((r) => `| ${r.slug} | ${r.status} | ${r.disposition} |`),
      ``,
      `## Related existing (not merged)`,
      ...plan.related_existing.map(
        (r) => `- ${r.catalogue_id} → ${r.related_slug} (${r.related_sku}, sale ${r.related_sale})`
      ),
      ``,
      `Summary: ${JSON.stringify(plan.summary)}`,
      ``,
      `Published from this pack: **0**.`,
    ].join("\n")
  );
  console.log(JSON.stringify(plan.summary));
  console.log("wrote", planPath, mdOut);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

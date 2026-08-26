/**
 * Seed Product SEO (StoreCraft nested seo.* + top-level aliases).
 *
 * Pattern A — model-specific: compress title ≤60, unique description from product copy
 * Pattern B — universal / rich tags: pick best 8 tags as keywords
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-product-seo.mjs --dry-run
 *   node --env-file=.env.local scripts/seed-product-seo.mjs --force
 *   node --env-file=.env.local scripts/seed-product-seo.mjs
 *
 * Flags:
 *   --dry-run   Print first 10 proposed rows; do not write
 *   --force     Overwrite products that already have seo.metaTitle
 */
import mongoose from "mongoose";
import Product from "../lib/models/Product.model.js";

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const BRAND_SUFFIX = " | Homefy.pk";
const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const BATCH = 50;

const BRAND_TAG_SKIP = new Set([
  "homefy",
  "crazzy cars",
  "homefy.pk",
  "crazzy cars pk",
  "cash on delivery",
  "cod",
  "cod nationwide",
]);

const STYLE_CUES = [
  "aggressive",
  "clean",
  "sporty",
  "distinctive",
  "unique",
  "wide",
  "subtle",
  "legendary",
  "sharper",
  "premium",
  "race",
  "racing",
  "modern",
  "bold",
  "elegant",
  "minimal",
  "plug and play",
  "plug-and-play",
  "app-controlled",
  "app controlled",
  "universal fit",
  "universal fitment",
];

const MAKES = [
  "toyota",
  "honda",
  "suzuki",
  "hyundai",
  "kia",
  "changan",
  "chery",
  "haval",
  "mg",
  "byd",
  "daihatsu",
  "nissan",
  "mitsubishi",
  "proton",
];

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanBaseTitle(raw) {
  return String(raw || "")
    .replace(/\|\s*Homefy\.pk/gi, "")
    .replace(/\|\s*Homefy\.pk/gi, "")
    .replace(/\bPakistan\b/gi, "")
    .replace(/\bEid Deal\b/gi, "")
    .replace(/\s*\|\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function fitTitle(main) {
  const budget = 60 - BRAND_SUFFIX.length; // 43
  let m = cleanBaseTitle(main);
  if (m.length <= budget) return m + BRAND_SUFFIX;

  // Drop filler words (keep make/model/style codes)
  m = m
    .replace(/\b(Complete|Premium|Legendary|Style|Sports Set|Piece|Pieces|PCS|Pc|Pair|Set of \d+|Set)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (m.length <= budget) return m + BRAND_SUFFIX;

  // Material → parenthetical
  m = m
    .replace(/\bFibreglass\b/gi, "(Fibreglass)")
    .replace(/\bFiberglass\b/gi, "(Fiberglass)")
    .replace(/\bABS Plastic\b/gi, "(ABS)")
    .replace(/\bABS\b/gi, "(ABS)")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (m.length <= budget) return m + BRAND_SUFFIX;

  // Drop year range if still too long (keep style/variant)
  const withoutYears = m.replace(/\b(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}\b/g, "").replace(/\s{2,}/g, " ").trim();
  if (withoutYears.length >= 12 && withoutYears.length <= budget) return withoutYears + BRAND_SUFFIX;

  // Word-boundary trim
  let cut = m.slice(0, budget);
  const sp = cut.lastIndexOf(" ");
  if (sp > budget * 0.55) cut = cut.slice(0, sp);
  return cut.trimEnd() + BRAND_SUFFIX;
}

function fitDescription(text) {
  let d = String(text || "").replace(/\s+/g, " ").trim();
  if (d.length > 160) {
    d = d.slice(0, 157).replace(/\s+\S*$/, "").trimEnd();
    if (!/[.!?]$/.test(d)) d += ".";
  }
  // Pad short ones lightly toward 140 if possible (caller should provide enough)
  return d;
}

function plainDesc(product) {
  return stripHtml(
    product.shortDescription || product.longDescription || product.description || ""
  );
}

function extractStyleDetail(desc, name) {
  const text = String(desc || "").replace(/\s+/g, " ").trim();
  if (!text) {
    const style = name.match(/\b(D\d+|TRD|Modulo|Yofer|Ativus|Sports|Mugen)\b/i);
    return style ? `${style[0]} design with a sporty stance` : "built for Pakistani roads";
  }

  const lower = text.toLowerCase();
  for (const cue of STYLE_CUES) {
    const idx = lower.indexOf(cue);
    if (idx === -1) continue;
    // Expand to nearest word boundaries, keep ~70–100 chars of readable phrase
    let start = idx;
    while (start > 0 && !/\s/.test(text[start - 1])) start -= 1;
    while (start > 0 && /[a-zA-Z0-9]/.test(text[start - 1])) start -= 1;
    let end = Math.min(text.length, idx + cue.length + 55);
    while (end < text.length && !/\s/.test(text[end])) end += 1;
    let phrase = text.slice(start, end).replace(/^[^a-zA-Z0-9]+/, "").trim();
    phrase = phrase.replace(/[,:;]\s*$/, "").trim();
    if (phrase.length >= 18 && phrase.length <= 110) return phrase;
  }

  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 25);
  // Prefer a sentence that is NOT just repeating the product name
  const nameLc = String(name || "").toLowerCase().slice(0, 40);
  for (const s of sentences.slice(0, 4)) {
    if (s.toLowerCase().startsWith(nameLc)) continue;
    return s.slice(0, 100).replace(/\s+\S*$/, "").trim();
  }
  if (sentences[1]) return sentences[1].slice(0, 100).replace(/\s+\S*$/, "").trim();

  const style = name.match(/\b(D\d+|TRD|Modulo|Yofer|Ativus|Sports|Mugen)\b/i);
  return style ? `${style[0]} design with a sporty stance` : "quality fitment for daily Pakistani roads";
}

function buildDescription(product, pattern, parsed, detail) {
  const name = String(product.name || "");
  const fitBits = [cap(parsed.make), parsed.model, parsed.years].filter(Boolean).join(" ");
  const styleLabel = parsed.style && !/^body kit$/i.test(parsed.style) ? parsed.style : "";
  const partLabel = parsed.part || "car accessory";
  const material = /\bfibreg?lass\b/i.test(name)
    ? "Fibreglass"
    : /\bABS\b/i.test(name)
      ? "ABS plastic"
      : "";

  let lead;
  if (pattern === "A" && fitBits) {
    lead = styleLabel
      ? `${styleLabel} ${partLabel} for ${fitBits}`
      : `${partLabel} for ${fitBits}`;
  } else {
    lead = cleanBaseTitle(name).slice(0, 72);
  }

  const detailClean = String(detail || "")
    .replace(/\s+/g, " ")
    .replace(/^[—\-–]\s*/, "")
    .trim();
  const mid = detailClean ? ` — ${detailClean}` : "";
  const mat = material ? ` ${material}.` : "";
  const cta = " Cash on Delivery nationwide.";

  let out = `${lead}${mid}.${mat}${cta}`.replace(/\.\s*\./g, ".").replace(/\s{2,}/g, " ").trim();
  // Soft-fix truncated mid-word before hard length cut
  if (out.length > 160) {
    out = out.slice(0, 157).replace(/\s+\S*$/, "").trim();
    if (!/[.!?]$/.test(out)) out += ".";
  }
  if (out.length < 140) {
    const extra = material
      ? " Direct-fit install."
      : " Easy bolt-on fitment.";
    if (out.length + extra.length <= 160) {
      out = out.replace(/\s*Cash on Delivery nationwide\./i, `${extra} Cash on Delivery nationwide.`);
    }
  }
  return fitDescription(out);
}

function cap(s) {
  const t = String(s || "").trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function detectPattern(product) {
  const name = String(product.name || "").toLowerCase();
  const fit = String(product.vehicleCompatibility?.fitmentType || "").toLowerCase();
  const isUniv =
    product.isUniversal === true ||
    fit === "universal" ||
    /\buniversal\b/.test(name);
  const hasMake = MAKES.some((m) => name.includes(m));
  const yearRange = /\b(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}\b/.test(name);
  if (isUniv && !yearRange) return "B";
  if (hasMake || yearRange || (product.compatibleCars || []).length) return "A";
  if ((product.tags || []).length >= 12) return "B";
  return hasMake ? "A" : "B";
}

function parseMakeModelYears(name) {
  const cleaned = cleanBaseTitle(name);
  let make = "";
  let rest = cleaned;
  for (const m of MAKES) {
    const rx = new RegExp(`^${m}\\b`, "i");
    if (rx.test(cleaned)) {
      make = m;
      rest = cleaned.replace(rx, "").trim();
      break;
    }
  }
  const yearMatch = cleaned.match(/\b((?:19|20)\d{2})\s*[-–]\s*((?:19|20)\d{2})\b/);
  const years = yearMatch ? `${yearMatch[1]}-${yearMatch[2]}` : "";
  // Model = first 1–3 tokens of rest until year or known part words
  const tokens = rest.split(/\s+/);
  const modelTokens = [];
  for (const t of tokens) {
    if (/^(19|20)\d{2}/.test(t)) break;
    if (/^(body|kit|carbon|led|floor|mirror|grille|spoiler|splitter)/i.test(t)) break;
    modelTokens.push(t);
    if (modelTokens.length >= 3) break;
  }
  const model = modelTokens.join(" ").trim();
  const style =
    cleaned.match(/\b(D\d+|TRD|Modulo|Yofer|Ativus|Mugen|Sports)\b/i)?.[0] || "";
  const part =
    cleaned.match(
      /\b(Body Kit|Mirror Covers?|Louvers?|Floor Mats?|Dashboard Mats?|Grille|Spoiler|Splitter|Steering Wheel Cover|Gear Knob|LED|Underglow|Trunk Lip Spoiler|Side Mirror)\b/i
    )?.[0] || "";
  return { make, model, years, style, part };
}

function pickTagsAsKeywords(tags, limit = 8) {
  const out = [];
  const seen = new Set();
  for (const raw of tags || []) {
    const k = String(raw || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    if (!k || BRAND_TAG_SKIP.has(k) || seen.has(k)) continue;
    // Prefer multi-word search phrases
    seen.add(k);
    out.push(k);
    if (out.length >= limit) break;
  }
  // Prefer sorting by: longer phrases first among selected — already sequential; boost by re-sort
  return out
    .sort((a, b) => {
      const as = a.split(" ").length;
      const bs = b.split(" ").length;
      if (bs !== as) return bs - as;
      return b.length - a.length;
    })
    .slice(0, limit);
}

function buildPatternAKeywords(product, parsed) {
  const { make, model, years, style, part } = parsed;
  const list = [];
  if (make && model) list.push(`${make} ${model}`);
  if (model && part) list.push(`${model} ${part}`.toLowerCase());
  if (model && style) list.push(`${model} ${style}`.toLowerCase());
  if (model && years) list.push(`${model} ${years.replace("-", " ")}`.toLowerCase());
  if (part) list.push(`${part} pakistan`.toLowerCase());
  if (part) list.push(`car ${part} online`.toLowerCase());
  list.push("car accessories pakistan");
  // Fill from tags
  for (const t of pickTagsAsKeywords(product.tags || [], 10)) {
    if (list.length >= 10) break;
    if (!list.includes(t)) list.push(t);
  }
  return [...new Set(list.map((k) => k.toLowerCase().trim()).filter(Boolean))].slice(0, 10);
}

function buildSeo(product) {
  const name = String(product.name || "").trim();
  const pattern = detectPattern(product);
  const parsed = parseMakeModelYears(name);
  const desc = plainDesc(product);
  const detail = extractStyleDetail(desc, name);

  const seoTitle = fitTitle(name);
  const seoDescription = buildDescription(product, pattern, parsed, detail);

  const seoKeywords =
    pattern === "B"
      ? pickTagsAsKeywords(product.tags || [], 8)
      : buildPatternAKeywords(product, parsed);

  const keywords =
    seoKeywords.length >= 6
      ? seoKeywords
      : buildPatternAKeywords(product, parsed);

  return {
    pattern,
    metaTitle: seoTitle,
    metaDescription: seoDescription,
    metaKeywords: keywords
      .map((k) => k.toLowerCase().trim())
      .filter((k) => k && !BRAND_TAG_SKIP.has(k) && !k.includes("crazzy"))
      .slice(0, 10),
  };
}

function hasExistingSeo(product) {
  return Boolean(String(product.seo?.metaTitle || product.metaTitle || "").trim());
}

async function run() {
  if (!MONGO_URI) {
    console.error("Set MONGO_URI or MONGODB_URI in .env.local first.");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log(
    `Connected${DRY_RUN ? " (DRY RUN — first 10 only, no writes)" : ""}${FORCE ? " [--force overwrite]" : ""}`
  );

  const cursor = Product.find({})
    .select(
      "name slug shortDescription longDescription description tags productType articleNo inventory.sku variants seo metaTitle metaDescription isUniversal vehicleCompatibility compatibleCars status"
    )
    .sort({ updatedAt: -1 })
    .lean()
    .cursor();

  let examined = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const dryRows = [];
  const flagSkuNull = [];
  const flagTypeNN = [];
  let batch = [];

  const flushBatch = async () => {
    if (!batch.length || DRY_RUN) {
      batch = [];
      return;
    }
    const ops = batch.map((row) => ({
      updateOne: {
        filter: { _id: row._id },
        update: {
          $set: {
            "seo.metaTitle": row.metaTitle,
            "seo.metaDescription": row.metaDescription,
            "seo.metaKeywords": row.metaKeywords,
            metaTitle: row.metaTitle,
            metaDescription: row.metaDescription,
          },
        },
      },
    }));
    try {
      const res = await Product.bulkWrite(ops, { ordered: false });
      updated += res.modifiedCount + res.upsertedCount;
    } catch (err) {
      errors += 1;
      console.error("batch error:", err.message);
    }
    console.log(`  … progress: updated~${updated} skipped=${skipped} examined=${examined}`);
    batch = [];
  };

  for await (const product of cursor) {
    examined += 1;

    const sku = product.inventory?.sku;
    const variantNull = Array.isArray(product.variants)
      ? product.variants.some((v) => v && (v.sku == null || v.sku === ""))
      : false;
    if (sku == null || sku === "" || variantNull) {
      flagSkuNull.push(product.slug || String(product._id));
    }
    if (String(product.productType || "").trim().toUpperCase() === "NN") {
      flagTypeNN.push(product.slug || String(product._id));
    }

    const proposed = buildSeo(product);
    const exists = hasExistingSeo(product);
    const wouldSkip = exists && !FORCE;

    if (DRY_RUN && dryRows.length < 10) {
      dryRows.push({
        handle: product.slug,
        pattern: proposed.pattern,
        oldTitle: String(product.seo?.metaTitle || product.metaTitle || "").trim(),
        newSeoTitle: proposed.metaTitle,
        newSeoDescription: proposed.metaDescription,
        keywords: proposed.metaKeywords.join("; "),
        titleLen: proposed.metaTitle.length,
        descLen: proposed.metaDescription.length,
        wouldSkip,
      });
    }

    if (DRY_RUN) continue;

    if (wouldSkip) {
      skipped += 1;
      continue;
    }

    batch.push({
      _id: product._id,
      metaTitle: proposed.metaTitle,
      metaDescription: proposed.metaDescription,
      metaKeywords: proposed.metaKeywords,
    });

    if (batch.length >= BATCH) await flushBatch();
  }

  await flushBatch();

  if (DRY_RUN) {
    console.log("\nhandle\tpattern\twouldSkip\ttitleLen\tdescLen\toldTitle\tnewSeoTitle\tnewSeoDescription\tkeywords");
    for (const r of dryRows) {
      console.log(
        [
          r.handle,
          r.pattern,
          r.wouldSkip,
          r.titleLen,
          r.descLen,
          JSON.stringify(r.oldTitle),
          JSON.stringify(r.newSeoTitle),
          JSON.stringify(r.newSeoDescription),
          r.keywords,
        ].join("\t")
      );
    }
  }

  console.log("\n—— Summary ——");
  console.log(`Examined: ${examined}`);
  if (DRY_RUN) {
    console.log(`Dry-run sample: ${dryRows.length} (first 10)`);
    console.log(
      `Note: ${dryRows.filter((r) => r.wouldSkip).length}/${dryRows.length} of sample would be SKIPPED without --force (already have seo.metaTitle).`
    );
    console.log("Re-run without --dry-run, add --force to overwrite existing SEO.");
  } else {
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (existing SEO): ${skipped}`);
    console.log(`Errors: ${errors}`);
  }
  console.log(`Flagged sku null/empty: ${flagSkuNull.length}`);
  if (flagSkuNull.length) {
    console.log("  sample:", flagSkuNull.slice(0, 15).join(", "));
  }
  console.log(`Flagged productType=NN: ${flagTypeNN.length}`);
  if (flagTypeNN.length) {
    console.log("  ", flagTypeNN.join(", "));
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("seed-product-seo failed:", err);
  process.exit(1);
});

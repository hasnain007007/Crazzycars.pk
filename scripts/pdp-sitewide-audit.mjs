/**
 * Read-only sitewide PDP audit — aggregate stats across active catalog.
 * Run inside store container (has MONGODB_URI → sialkot_motorsports).
 *
 *   docker exec <store> node /tmp/pdp-sitewide-audit.mjs
 */
import { MongoClient, ObjectId } from "mongodb";
import { readFileSync } from "fs";

const TITLE_MAX = 60;
const TITLE_SUFFIX = " | CrazzyCars";
const TITLE_BUDGET = TITLE_MAX - TITLE_SUFFIX.length; // 48

function stripTrailingBrand(value) {
  let title = String(value || "").trim();
  const trailingBrand = /\s*[|\u2013\u2014-]\s*(?:CrazzyCars(?:\.pk)?|Crazzycars\.pk)\s*$/i;
  for (let i = 0; i < 3; i += 1) {
    const stripped = title.replace(trailingBrand, "").replace(/[\s|\u2013\u2014-]+$/g, "").trim();
    if (stripped === title) break;
    title = stripped;
  }
  return title;
}

function truncateAtWord(value, maxLength) {
  const title = String(value || "").trim();
  if (title.length <= maxLength) return title;
  const withinLimit = title.slice(0, maxLength);
  const lastSpace = withinLimit.lastIndexOf(" ");
  const truncated = (lastSpace > 0 ? withinLimit.slice(0, lastSpace) : withinLimit)
    .replace(/[\s|\u2013\u2014,;:-]+$/g, "")
    .trim();
  return truncated || withinLimit.trim();
}

function buildRenderedTitle(name, metaTitle) {
  const source = String(metaTitle || "").trim() || String(name || "").trim();
  const unbranded = stripTrailingBrand(source);
  return `${truncateAtWord(unbranded, TITLE_BUDGET)}${TITLE_SUFFIX}`;
}

function stripHtml(s) {
  return String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function resolveMetaTitle(p) {
  return String(p?.seo?.metaTitle || p?.metaTitle || "").trim();
}

function resolveMetaDesc(p) {
  return String(p?.seo?.metaDescription || p?.metaDescription || "").trim();
}

function resolvePrice(p) {
  const sale = Number(p?.pricing?.salePrice);
  const regular = Number(p?.pricing?.regularPrice);
  if (Number.isFinite(sale) && sale > 0) return sale;
  if (Number.isFinite(regular) && regular > 0) return regular;
  return null;
}

function resolveCompare(p) {
  const sale = Number(p?.pricing?.salePrice);
  const regular = Number(p?.pricing?.regularPrice);
  const compareAt = Number(p?.pricing?.compareAtPrice ?? p?.compareAtPrice);
  // Storefront "compare" is typically regular when sale is set
  if (Number.isFinite(sale) && sale > 0 && Number.isFinite(regular) && regular > sale) {
    return regular;
  }
  if (Number.isFinite(compareAt) && compareAt > 0) return compareAt;
  return null;
}

function resolveSku(p) {
  return String(p?.articleNo || p?.inventory?.sku || p?.sku || "").trim();
}

function imageAlts(p) {
  const imgs = Array.isArray(p?.media?.images) ? p.media.images : [];
  return imgs.map((im, i) => {
    if (typeof im === "string") return { i, alt: "", url: im };
    return {
      i,
      alt: String(im?.altText || im?.alt || "").trim(),
      url: String(im?.url || ""),
    };
  });
}

const GENERIC_ALT = /^(image|img|photo|product|product photo|picture|untitled|n\/a|na|-|–|—)$/i;

function hasBadAlt(p) {
  const alts = imageAlts(p);
  if (!alts.length) return { bad: true, reason: "no_images" };
  for (const a of alts) {
    if (!a.alt) return { bad: true, reason: "empty_alt" };
    if (GENERIC_ALT.test(a.alt)) return { bad: true, reason: "generic_alt" };
  }
  return { bad: false };
}

function vcRows(p) {
  const fromVc = Array.isArray(p?.vehicleCompatibility?.vehicles)
    ? p.vehicleCompatibility.vehicles
    : [];
  const fromCars = Array.isArray(p?.compatibleCars) ? p.compatibleCars : [];
  const fromVehicles = Array.isArray(p?.compatibleVehicles) ? p.compatibleVehicles : [];
  // Prefer structured VC table; fall back to compatibleCars
  if (fromVc.length) return fromVc;
  if (fromCars.length) return fromCars;
  // ObjectIds only — count as linked but not table-populated for display
  return [];
}

function isUniversal(p) {
  return Boolean(
    p?.isUniversal ||
      String(p?.vehicleCompatibility?.fitmentType || "").toLowerCase() === "universal"
  );
}

function suspiciousVc(p) {
  const rows = vcRows(p);
  const flags = [];
  const name = String(p?.name || "");
  const yearInName = [...name.matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]));
  for (const v of rows) {
    const make = String(v?.make || "").trim();
    const model = String(v?.model || "").trim();
    const yf = Number(v?.yearFrom) || null;
    const yt = Number(v?.yearTo) || null;
    if (yf && yt && yt < yf) flags.push(`inverted_years:${make} ${model} ${yf}-${yt}`);
    if (yf && yt && yt - yf >= 20) flags.push(`wide_span:${make} ${model} ${yf}-${yt} (${yt - yf}y)`);
    if (yf && (yf < 1990 || yf > 2027)) flags.push(`implausible_from:${make} ${model} ${yf}`);
    if (yt && (yt < 1990 || yt > 2030)) flags.push(`implausible_to:${make} ${model} ${yt}`);
    // Title names one make, VC another (classic CC-EXT-107 pattern)
    const nameLower = name.toLowerCase();
    if (make && model) {
      const otherMakes = ["toyota", "honda", "suzuki", "hyundai", "kia", "changan", "mg", "haval"];
      const titleMake = otherMakes.find((m) => nameLower.includes(m));
      if (titleMake && make.toLowerCase() !== titleMake && !nameLower.includes(make.toLowerCase())) {
        flags.push(`title_make_mismatch:title~${titleMake} vc=${make} ${model}`);
      }
    }
    // Year band in title vs VC far apart
    if (yearInName.length >= 2 && yf && yt) {
      const tMin = Math.min(...yearInName);
      const tMax = Math.max(...yearInName);
      if (tMax - tMin <= 15 && (yf > tMax + 2 || yt < tMin - 2 || Math.abs(yf - tMin) > 4 || Math.abs(yt - tMax) > 4)) {
        flags.push(`title_year_vs_vc:title ${tMin}-${tMax} vc ${yf}-${yt}`);
      }
    }
  }
  // Title has specific make/model years but VC empty and not universal
  if (!rows.length && !isUniversal(p)) {
    if (/\b(toyota|honda|suzuki|hyundai|kia)\b/i.test(name) && yearInName.length) {
      flags.push("title_specific_but_vc_empty");
    }
  }
  return [...new Set(flags)];
}

function stockSignal(p) {
  const combos = Array.isArray(p?.variationCombinations) ? p.variationCombinations : [];
  const hasComboStock = combos.some((c) => c && Object.prototype.hasOwnProperty.call(c, "stock"));
  if (hasComboStock) {
    const total = combos.reduce((s, c) => s + Math.max(0, Number(c.stock) || 0), 0);
    return { hasSignal: true, qty: total, via: "combos" };
  }
  const qty = Number(p?.inventory?.quantity ?? p?.stock ?? p?.quantity);
  if (Number.isFinite(qty)) return { hasSignal: true, qty, via: "inventory" };
  return { hasSignal: false, qty: null, via: "none" };
}

function normalizeBoilerplate(desc, name) {
  let d = String(desc || "").trim();
  if (!d) return "";
  // Collapse product name so template identity can be compared
  if (name) {
    const n = String(name).trim();
    d = d.split(n).join("{NAME}");
    // Also try unbranded short name without years
    const short = n.replace(/\b(19|20)\d{2}\b/g, "").replace(/\s+/g, " ").trim();
    if (short.length > 8) d = d.split(short).join("{NAME}");
  }
  return d
    .replace(/\s+/g, " ")
    .replace(/Rs\.?\s*[\d,]+/gi, "{PRICE}")
    .replace(/\b(19|20)\d{2}\b/g, "{YEAR}")
    .trim()
    .toLowerCase();
}

function loadFaqSkuSet() {
  try {
    const text = readFileSync("/app/lib/seo/keywordStrategyFaqs.js", "utf8");
    const m = text.match(/const PRODUCT_FAQ_BY_SKU = \{([\s\S]*?)\n\};/);
    if (!m) return new Set();
    const keys = [...m[1].matchAll(/^\s*["']?(CC-[A-Z0-9-]+)["']?\s*:/gm)].map((x) => x[1]);
    return new Set(keys);
  } catch {
    return new Set();
  }
}

function isCarbonish(p, categorySlugs) {
  const blob = [
    p.name,
    p.slug,
    ...(Array.isArray(p.tags) ? p.tags : []),
    ...categorySlugs,
  ]
    .join(" ")
    .toLowerCase();
  return /carbon/.test(blob);
}

function hasMaterialDisclosure(p) {
  const blob = [
    p.shortDescription,
    p.longDescription,
    p.description,
    p.metaDescription,
    p.seo?.metaDescription,
    ...(Array.isArray(p.features) ? p.features.map((f) => (typeof f === "string" ? f : f?.text || f?.title || "")) : []),
  ]
    .join(" ")
    .toLowerCase();
  return (
    /\babs\b/.test(blob) ||
    /not (woven |real )?carbon/.test(blob) ||
    /carbon[- ]?(fiber[- ]?)?(style|look|texture|finish)/.test(blob) ||
    /aftermarket/.test(blob) ||
    /not (oem|genuine|original)/.test(blob) ||
    /plastic with a carbon/.test(blob)
  );
}

function pct(n, d) {
  if (!d) return "0.0%";
  return `${((100 * n) / d).toFixed(1)}%`;
}

async function main() {
  const faqSkus = loadFaqSkuSet();
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const products = await db
    .collection("products")
    .find({ status: "active", securityHold: { $ne: true } })
    .project({
      name: 1,
      slug: 1,
      articleNo: 1,
      seo: 1,
      metaTitle: 1,
      metaDescription: 1,
      shortDescription: 1,
      longDescription: 1,
      description: 1,
      features: 1,
      tags: 1,
      pricing: 1,
      compareAtPrice: 1,
      media: 1,
      inventory: 1,
      stock: 1,
      quantity: 1,
      variationCombinations: 1,
      isUniversal: 1,
      vehicleCompatibility: 1,
      compatibleCars: 1,
      compatibleVehicles: 1,
      recommendedProducts: 1,
      categories: 1,
      brand: 1,
      vendor: 1,
      reviewCount: 1,
      averageRating: 1,
      gtin: 1,
      barcode: 1,
    })
    .toArray();

  // Category slug map
  const catIds = [
    ...new Set(
      products.flatMap((p) =>
        (p.categories || []).map((c) => String(c?._id || c)).filter((id) => ObjectId.isValid(id))
      )
    ),
  ].map((id) => new ObjectId(id));
  const cats = catIds.length
    ? await db
        .collection("categories")
        .find({ _id: { $in: catIds } })
        .project({ name: 1, slug: 1 })
        .toArray()
    : [];
  const catById = new Map(cats.map((c) => [String(c._id), c]));

  // Reviews footprint
  const reviewAgg = await db
    .collection("reviews")
    .aggregate([
      {
        $group: {
          _id: { product: "$product", source: "$source", status: "$status" },
          n: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const reviewsByProduct = new Map();
  let customerApprovedProducts = 0;
  const sourceTotals = {};
  for (const row of reviewAgg) {
    const pid = String(row._id.product || "");
    const source = String(row._id.source || "unknown").toLowerCase();
    const status = String(row._id.status || "approved").toLowerCase();
    sourceTotals[source] = (sourceTotals[source] || 0) + row.n;
    if (!reviewsByProduct.has(pid)) reviewsByProduct.set(pid, { total: 0, customerApproved: 0, bySource: {} });
    const slot = reviewsByProduct.get(pid);
    slot.total += row.n;
    slot.bySource[source] = (slot.bySource[source] || 0) + row.n;
    if (source === "customer" && status === "approved") slot.customerApproved += row.n;
  }
  for (const slot of reviewsByProduct.values()) {
    if (slot.customerApproved > 0) customerApprovedProducts += 1;
  }

  const N = products.length;
  const stats = {
    totalActive: N,
    metaTitleMissing: 0,
    metaTitleStoredOver60: 0,
    metaTitleRenderedOver60: 0, // should be ~0 if builder works
    metaDescMissing: 0,
    h1MissingName: 0,
    badAlt: 0,
    badAltReasons: {},
    noFaq: 0,
    withFaq: 0,
    schemaMissingPrice: 0,
    schemaMissingSku: 0,
    schemaMissingBrand: 0, // brand always defaulted in code
    schemaWouldEmitAggregate: 0, // should be 0 if fix works
    schemaMissingAvailability: 0,
    vcEmptyNonUniversal: 0,
    vcEmptyUniversal: 0,
    vcPopulated: 0,
    suspiciousVc: 0,
    noStockSignal: 0,
    staleCompare: 0,
    noRecommended: 0,
    hasRecommended: 0,
    carbonish: 0,
    carbonMissingDisclosure: 0,
    productsWithAnyReviews: 0,
    productsWithCustomerReviews: 0,
    productsWithSeedOnlyReviews: 0,
  };

  const titleMap = new Map(); // rendered title → [sku]
  const storedTitleMap = new Map();
  const descMap = new Map(); // exact desc → [sku]
  const boilerMap = new Map(); // normalized → [sku]
  const suspiciousList = [];
  const staleCompareList = [];
  const missingMetaTitle = [];
  const missingMetaDesc = [];
  const noFaqSamples = [];
  const badAltSamples = [];
  const noRelatedSamples = [];
  const carbonGapSamples = [];

  for (const p of products) {
    const sku = resolveSku(p) || p.slug;
    const name = String(p.name || "").trim();
    const storedTitle = resolveMetaTitle(p);
    const renderedTitle = buildRenderedTitle(name, storedTitle);
    const metaDesc = resolveMetaDesc(p);
    const catSlugs = (p.categories || [])
      .map((c) => {
        const id = String(c?._id || c);
        return catById.get(id)?.slug || "";
      })
      .filter(Boolean);

    // Meta title
    if (!storedTitle) {
      stats.metaTitleMissing += 1;
      if (missingMetaTitle.length < 15) missingMetaTitle.push({ sku, name, slug: p.slug });
    }
    if (storedTitle && storedTitle.length > TITLE_MAX) stats.metaTitleStoredOver60 += 1;
    if (renderedTitle.length > TITLE_MAX) stats.metaTitleRenderedOver60 += 1;

    if (!titleMap.has(renderedTitle)) titleMap.set(renderedTitle, []);
    titleMap.get(renderedTitle).push(sku);
    if (storedTitle) {
      if (!storedTitleMap.has(storedTitle)) storedTitleMap.set(storedTitle, []);
      storedTitleMap.get(storedTitle).push(sku);
    }

    // Meta desc
    if (!metaDesc) {
      stats.metaDescMissing += 1;
      if (missingMetaDesc.length < 15) missingMetaDesc.push({ sku, name, slug: p.slug });
    } else {
      if (!descMap.has(metaDesc)) descMap.set(metaDesc, []);
      descMap.get(metaDesc).push(sku);
      const boiler = normalizeBoilerplate(metaDesc, name);
      if (!boilerMap.has(boiler)) boilerMap.set(boiler, []);
      boilerMap.get(boiler).push(sku);
    }

    // H1 = name on PDP template
    if (!name) stats.h1MissingName += 1;

    // Alt
    const alt = hasBadAlt(p);
    if (alt.bad) {
      stats.badAlt += 1;
      stats.badAltReasons[alt.reason] = (stats.badAltReasons[alt.reason] || 0) + 1;
      if (badAltSamples.length < 12) badAltSamples.push({ sku, name, reason: alt.reason, slug: p.slug });
    }

    // FAQ
    if (faqSkus.has(String(p.articleNo || "").trim())) {
      stats.withFaq += 1;
    } else {
      stats.noFaq += 1;
      if (noFaqSamples.length < 12) noFaqSamples.push({ sku, name, slug: p.slug });
    }

    // Schema fields (mirrors productJsonLd inputs)
    const price = resolvePrice(p);
    if (price == null) stats.schemaMissingPrice += 1;
    if (!resolveSku(p)) stats.schemaMissingSku += 1;
    // brand always defaults in code — count products with empty brand field
    if (!String(p.brand || p.vendor || "").trim()) stats.schemaMissingBrand += 1;
    const stock = stockSignal(p);
    // availability is always emitted when offers exist (InStock/OutOfStock/Backorder)
    if (price != null && !stock.hasSignal && !(p.inventory?.allowBackorder || p.allowBackorder)) {
      // still emits; track no stock signal separately
    }
    if (!stock.hasSignal) stats.noStockSignal += 1;

    const rev = reviewsByProduct.get(String(p._id));
    if (rev?.total) {
      stats.productsWithAnyReviews += 1;
      if (rev.customerApproved > 0) {
        stats.productsWithCustomerReviews += 1;
        stats.schemaWouldEmitAggregate += 1;
      } else {
        stats.productsWithSeedOnlyReviews += 1;
      }
    }

    // VC
    const rows = vcRows(p);
    const uni = isUniversal(p);
    if (rows.length) stats.vcPopulated += 1;
    else if (uni) stats.vcEmptyUniversal += 1;
    else stats.vcEmptyNonUniversal += 1;

    const sus = suspiciousVc(p);
    if (sus.length) {
      stats.suspiciousVc += 1;
      if (suspiciousList.length < 80) {
        suspiciousList.push({ sku, name, slug: p.slug, flags: sus, rows: rows.length, uni });
      }
    }

    // Stale compare
    const sale = Number(p?.pricing?.salePrice) || 0;
    const regular = Number(p?.pricing?.regularPrice) || 0;
    const compareAt = Number(p?.pricing?.compareAtPrice ?? p?.compareAtPrice) || 0;
    const effectivePrice = sale > 0 ? sale : regular;
    // Bug: compare/regular <= sale/price when a discount is implied
    let stale = false;
    if (sale > 0 && regular > 0 && regular <= sale) stale = true;
    if (compareAt > 0 && effectivePrice > 0 && compareAt <= effectivePrice) stale = true;
    if (stale) {
      stats.staleCompare += 1;
      if (staleCompareList.length < 40) {
        staleCompareList.push({ sku, name, sale, regular, compareAt, slug: p.slug });
      }
    }

    // Related
    const recs = Array.isArray(p.recommendedProducts) ? p.recommendedProducts : [];
    if (recs.length) stats.hasRecommended += 1;
    else {
      stats.noRecommended += 1;
      if (noRelatedSamples.length < 10) noRelatedSamples.push({ sku, name, slug: p.slug, cats: catSlugs });
    }

    // Material honesty
    if (isCarbonish(p, catSlugs)) {
      stats.carbonish += 1;
      if (!hasMaterialDisclosure(p) && !faqSkus.has(String(p.articleNo || "").trim())) {
        // FAQ may carry disclosure even if body doesn't
        stats.carbonMissingDisclosure += 1;
        if (carbonGapSamples.length < 20) {
          carbonGapSamples.push({ sku, name, slug: p.slug, cats: catSlugs });
        }
      } else if (!hasMaterialDisclosure(p)) {
        // has FAQ — still count body gap separately? User asked for missing disclosure.
        // Count as missing on-page disclosure if body lacks it (FAQ alone is partial).
        if (!hasMaterialDisclosure(p)) {
          /* already handled if no FAQ; if FAQ exists, note as faq_only */
        }
      }
    }
  }

  // Recompute carbon missing including those with FAQ-only (body still missing)
  let carbonBodyMissing = 0;
  let carbonFaqOnly = 0;
  for (const p of products) {
    const catSlugs = (p.categories || [])
      .map((c) => catById.get(String(c?._id || c))?.slug || "")
      .filter(Boolean);
    if (!isCarbonish(p, catSlugs)) continue;
    const body = hasMaterialDisclosure(p);
    const faq = faqSkus.has(String(p.articleNo || "").trim());
    if (!body && !faq) carbonBodyMissing += 1; // already in stats
    if (!body && faq) carbonFaqOnly += 1;
  }

  const dupRenderedTitles = [...titleMap.entries()].filter(([, skus]) => skus.length >= 2);
  const dupStoredTitles = [...storedTitleMap.entries()].filter(([, skus]) => skus.length >= 2);
  const productsInDupRendered = dupRenderedTitles.reduce((s, [, skus]) => s + skus.length, 0);
  const productsInDupStored = dupStoredTitles.reduce((s, [, skus]) => s + skus.length, 0);

  const dupExactDesc = [...descMap.entries()].filter(([, skus]) => skus.length >= 2);
  const productsInDupDesc = dupExactDesc.reduce((s, [, skus]) => s + skus.length, 0);

  // Boilerplate: same normalized template used by 3+ products
  const boilerTemplates = [...boilerMap.entries()]
    .filter(([, skus]) => skus.length >= 3)
    .sort((a, b) => b[1].length - a[1].length);
  const productsInBoiler = new Set(boilerTemplates.flatMap(([, skus]) => skus)).size;

  // Related: fallback is category-based — "empty" only if category also empty.
  // Approximate: no curated + category has <2 other active products → likely empty/thin
  const catProductCounts = new Map();
  for (const p of products) {
    for (const c of p.categories || []) {
      const id = String(c?._id || c);
      catProductCounts.set(id, (catProductCounts.get(id) || 0) + 1);
    }
  }
  let relatedLikelyEmpty = 0;
  let relatedCategoryFallback = 0;
  for (const p of products) {
    const recs = Array.isArray(p.recommendedProducts) ? p.recommendedProducts : [];
    if (recs.length) continue;
    relatedCategoryFallback += 1;
    const catIdsP = (p.categories || []).map((c) => String(c?._id || c));
    const maxSiblings = Math.max(0, ...catIdsP.map((id) => (catProductCounts.get(id) || 1) - 1));
    if (maxSiblings <= 0) relatedLikelyEmpty += 1;
  }

  const out = {
    generatedAt: new Date().toISOString(),
    catalog: {
      totalDocuments: await db.collection("products").countDocuments({}),
      activeNoHold: N,
      faqSkuKeysInCode: faqSkus.size,
    },
    metaTitle: {
      missing: stats.metaTitleMissing,
      missingPct: pct(stats.metaTitleMissing, N),
      storedOver60: stats.metaTitleStoredOver60,
      storedOver60Pct: pct(stats.metaTitleStoredOver60, N),
      renderedOver60: stats.metaTitleRenderedOver60,
      renderedOver60Pct: pct(stats.metaTitleRenderedOver60, N),
      duplicateRenderedGroups: dupRenderedTitles.length,
      productsInDuplicateRenderedTitles: productsInDupRendered,
      productsInDuplicateRenderedTitlesPct: pct(productsInDupRendered, N),
      duplicateStoredGroups: dupStoredTitles.length,
      productsInDuplicateStoredTitles: productsInDupStored,
      topDuplicateRendered: dupRenderedTitles
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 8)
        .map(([title, skus]) => ({ title, count: skus.length, skus: skus.slice(0, 6) })),
    },
    metaDescription: {
      missing: stats.metaDescMissing,
      missingPct: pct(stats.metaDescMissing, N),
      exactDuplicateGroups: dupExactDesc.length,
      productsInExactDuplicates: productsInDupDesc,
      productsInExactDuplicatesPct: pct(productsInDupDesc, N),
      boilerplateTemplateGroups3plus: boilerTemplates.length,
      productsInBoilerplateTemplates: productsInBoiler,
      productsInBoilerplateTemplatesPct: pct(productsInBoiler, N),
      topBoilerplate: boilerTemplates.slice(0, 8).map(([tmpl, skus]) => ({
        template: tmpl.slice(0, 140),
        count: skus.length,
        skus: skus.slice(0, 5),
      })),
      topExactDupes: dupExactDesc
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 5)
        .map(([d, skus]) => ({ desc: d.slice(0, 120), count: skus.length, skus: skus.slice(0, 5) })),
    },
    h1: {
      note: "PDP template uses product.name as H1; no separate H1 field",
      missingName: stats.h1MissingName,
      missingNamePct: pct(stats.h1MissingName, N),
      mismatchVsName: 0,
      mismatchNote: "No alternate H1 source — mismatch N/A (0)",
    },
    imageAlt: {
      productsWithBadAlt: stats.badAlt,
      productsWithBadAltPct: pct(stats.badAlt, N),
      reasons: stats.badAltReasons,
      samples: badAltSamples,
    },
    faq: {
      note: "Product FAQPage is code-keyed by articleNo in keywordStrategyFaqs.js (not blog-only, but far from catalog-wide)",
      withFaq: stats.withFaq,
      withFaqPct: pct(stats.withFaq, N),
      zeroFaq: stats.noFaq,
      zeroFaqPct: pct(stats.noFaq, N),
      faqKeysInCode: faqSkus.size,
    },
    jsonLd: {
      missingPrice: stats.schemaMissingPrice,
      missingPricePct: pct(stats.schemaMissingPrice, N),
      missingSkuArticleNo: stats.schemaMissingSku,
      missingSkuPct: pct(stats.schemaMissingSku, N),
      emptyBrandFieldDefaultsInCode: stats.schemaMissingBrand,
      emptyBrandFieldPct: pct(stats.schemaMissingBrand, N),
      wouldEmitAggregateRating: stats.schemaWouldEmitAggregate,
      wouldEmitAggregateRatingPct: pct(stats.schemaWouldEmitAggregate, N),
      aggregateSuppressionNote:
        "productJsonLd only emits aggregateRating/review for source=customer+approved. Live review sources are import/manual only → suppression should be catalog-wide.",
      reviewSourceTotals: sourceTotals,
    },
    vehicleCompatibility: {
      populated: stats.vcPopulated,
      populatedPct: pct(stats.vcPopulated, N),
      emptyUniversal: stats.vcEmptyUniversal,
      emptyUniversalPct: pct(stats.vcEmptyUniversal, N),
      emptyNonUniversal: stats.vcEmptyNonUniversal,
      emptyNonUniversalPct: pct(stats.vcEmptyNonUniversal, N),
      suspiciousCount: stats.suspiciousVc,
      suspiciousPct: pct(stats.suspiciousVc, N),
      suspiciousCandidates: suspiciousList,
    },
    stock: {
      noStockSignal: stats.noStockSignal,
      noStockSignalPct: pct(stats.noStockSignal, N),
      note: "PDP always renders a stock label from inventory/combos/backorder; 'no signal' = no numeric qty and no combo stock fields",
    },
    priceDiscount: {
      staleCompare: stats.staleCompare,
      staleComparePct: pct(stats.staleCompare, N),
      samples: staleCompareList,
    },
    related: {
      curatedRecommended: stats.hasRecommended,
      curatedRecommendedPct: pct(stats.hasRecommended, N),
      fallbackToCategory: relatedCategoryFallback,
      fallbackToCategoryPct: pct(relatedCategoryFallback, N),
      likelyEmptyNoCategorySiblings: relatedLikelyEmpty,
      likelyEmptyPct: pct(relatedLikelyEmpty, N),
      note: "Template falls back to newest in same category — not vehicle-compatible. 'Irrelevant' ≈ category fallback without fitment match (not measured as empty).",
    },
    materialDisclosure: {
      carbonishProducts: stats.carbonish,
      carbonishPct: pct(stats.carbonish, N),
      missingBodyAndFaq: carbonBodyMissing,
      missingBodyAndFaqPct: pct(carbonBodyMissing, stats.carbonish || 1),
      bodyMissingButFaqPresent: carbonFaqOnly,
      bodyMissingButFaqPresentPct: pct(carbonFaqOnly, stats.carbonish || 1),
      samplesMissingBoth: carbonGapSamples,
    },
    reviews: {
      productsWithAnyReviews: stats.productsWithAnyReviews,
      productsWithAnyReviewsPct: pct(stats.productsWithAnyReviews, N),
      productsWithCustomerApproved: stats.productsWithCustomerReviews,
      productsWithSeedOrImportOnly: stats.productsWithSeedOnlyReviews,
      sourceTotals,
      note: "Seeded corpus (manual+import) covers nearly all active products; customer-sourced count is the schema-safe set.",
    },
    samples: {
      missingMetaTitle,
      missingMetaDesc,
      noFaq: noFaqSamples,
    },
  };

  console.log(JSON.stringify(out, null, 2));
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

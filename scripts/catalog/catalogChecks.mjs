/**
 * Catalog data checks (pure — no DB). Shared by check-catalog.mjs (read-only report)
 * and fix-catalog-2026-10.mjs (plan + apply).
 *
 * Input: lean products (name, slug, articleNo, status, pricing, media.images, categories,
 * vehicleCompatibility, compatibleCars), Car Catalog makes, categories.
 */
import { catalogModelsByMake, normalizeFitmentModel } from "../../storecraft-admin/lib/fitmentModelNormalize.js";

const CURRENT_YEAR = new Date().getFullYear();
const lower = (s) => String(s || "").trim().toLowerCase();

export function skuOf(p) {
  return String(p.articleNo || p.inventory?.sku || p.slug || p._id);
}

export function mainImageUrl(p) {
  const imgs = p.media?.images || [];
  const main = imgs.find((i) => i?.isMain) || imgs[0];
  return String(main?.url || "").trim();
}

/** "/media/products/toyota-aqua-splitter-2-04518dd4fc.webp" → "toyota-aqua-splitter" */
export function imageStem(url) {
  const file = decodeURIComponent(String(url).split("?")[0].split("/").pop() || "");
  return file
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/-[0-9a-f]{8,}$/i, "")
    .replace(/-nologo$/i, "")
    .replace(/-\d{1,2}$/i, "")
    .toLowerCase();
}

const STOP = new Set(["and", "with", "for", "the", "of", "in", "pcs", "pc", "set", "pair", "new", "style", "premium"]);
function tokens(s) {
  return lower(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** Share of the image filename's words that appear in the product slug (0–1). */
export function imageSlugOverlap(url, slug) {
  const fileTokens = tokens(imageStem(url));
  if (!fileTokens.length) return 1;
  const slugTokens = new Set(tokens(slug));
  return fileTokens.filter((t) => slugTokens.has(t)).length / fileTokens.length;
}

/** Car model names to look for in titles, longest first ("Corolla Cross" before "Corolla"). */
export function knownModelNames(catalogMakes, products = []) {
  const names = new Set();
  for (const mk of catalogMakes || []) for (const m of mk.models || []) if (m.name) names.add(String(m.name).trim());
  for (const p of products) {
    for (const r of p.vehicleCompatibility?.vehicles || []) {
      const m = String(r.model || "").trim();
      // Only plain model names (no years / generation codes) from existing rows.
      if (/^[A-Za-z][A-Za-z -]{1,20}$/.test(m) && !/gen|reborn|rebirth|classic/i.test(m)) names.add(m);
    }
  }
  return [...names].sort((a, b) => b.length - a.length);
}

function titleModels(title, modelNames) {
  let rest = ` ${lower(title)} `;
  const found = [];
  for (const name of modelNames) {
    const rx = new RegExp(`[^a-z0-9]${lower(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^a-z0-9]`);
    if (rx.test(rest)) {
      found.push(name);
      rest = rest.replace(rx, " ");
    }
  }
  return found;
}

function titleYears(title) {
  return [...String(title).matchAll(/\b(19[89]\d|20[0-4]\d)\b/g)].map((m) => Number(m[1]));
}

/** Fitment rows with model names normalised (generation codes → catalog model). */
export function normalisedRows(p, byMake) {
  return (p.vehicleCompatibility?.vehicles || []).map((r) => {
    const res = normalizeFitmentModel(r, byMake.get(lower(r.make)) || []);
    return res.changed ? { ...r, model: res.model } : r;
  });
}

/**
 * @returns {Array<{ sku, slug, name, type, detail, confidence }>}
 */
export function runCatalogChecks({ products, catalogMakes, categories = [] }) {
  const issues = [];
  const byMake = catalogModelsByMake(catalogMakes);
  const modelNames = knownModelNames(catalogMakes, products);
  const live = products.filter((p) => p.status === "active");
  const add = (p, type, detail, confidence = "high") =>
    issues.push({ sku: skuOf(p), slug: p.slug, name: p.name, type, detail, confidence });

  // Same main image file on several products.
  const byImage = new Map();
  for (const p of live) {
    const url = mainImageUrl(p);
    if (!url) continue;
    const key = url.split("?")[0];
    if (!byImage.has(key)) byImage.set(key, []);
    byImage.get(key).push(p);
  }

  for (const p of live) {
    const url = mainImageUrl(p);
    if (!url) add(p, "image_missing", "No product image");
    else if (/placeholder/i.test(url)) add(p, "image_placeholder", `Main image is a placeholder (${imageStem(url)})`);
    else {
      const overlap = imageSlugOverlap(url, p.slug);
      if (overlap < 0.5) {
        add(p, "image_name_mismatch", `Image file "${imageStem(url)}" shares ${Math.round(overlap * 100)}% of its words with the slug`, "medium");
      }
      const shared = byImage.get(url.split("?")[0]) || [];
      if (shared.length > 1) {
        add(p, "image_shared", `Same main image as: ${shared.filter((x) => x !== p).map(skuOf).join(", ")}`);
      }
    }

    const regular = Number(p.pricing?.regularPrice);
    const sale = Number(p.pricing?.salePrice);
    if (Number.isFinite(regular) && !Number.isInteger(regular)) add(p, "price_decimals", `regularPrice ${regular}`);
    if (Number.isFinite(sale) && sale > 0 && !Number.isInteger(sale)) add(p, "price_decimals", `salePrice ${sale}`);
    if (sale > 0 && sale >= regular) add(p, "price_sale_not_lower", `salePrice ${sale} ≥ regularPrice ${regular}`);
    if (sale > 0 && sale < regular && regular - sale < Math.max(10, regular * 0.01)) {
      add(p, "price_tiny_discount", `Sale ${sale} vs regular ${regular} (Rs ${regular - sale} off)`, "medium");
    }
    if (sale > 0 && sale < regular && (regular - sale) / regular > 0.5) {
      add(p, "price_big_discount", `${Math.round(((regular - sale) / regular) * 100)}% off (${sale} vs ${regular})`, "low");
    }

    if (!(p.categories || []).length) add(p, "category_missing", "No category assigned");

    const fitType = p.vehicleCompatibility?.fitmentType || (p.isUniversal ? "universal" : "specific");
    const rows = normalisedRows(p, byMake);
    for (const r of p.vehicleCompatibility?.vehicles || []) {
      const res = normalizeFitmentModel(r, byMake.get(lower(r.make)) || []);
      if (res.changed) add(p, "fitment_model_is_generation", `${r.make} "${r.model}" → model "${res.model}", generation "${res.generation}"`, "medium");
    }
    if (fitType === "specific" && rows.length) {
      const mentioned = titleModels(p.name, modelNames);
      const rowModels = rows.map((r) => lower(r.model));
      const missing = mentioned.filter(
        (m) => !rowModels.some((rm) => rm === lower(m) || rm.startsWith(`${lower(m)} `) || lower(m).startsWith(`${rm} `))
      );
      if (mentioned.length && missing.length === mentioned.length) {
        add(p, "title_fitment_mismatch", `Title says ${missing.join("/")} but fitment is ${rows.map((r) => `${r.make} ${r.model} ${r.yearFrom ?? ""}-${r.yearTo ?? ""}`).join("; ")}`);
      }
      const years = titleYears(p.name);
      if (years.length) {
        const lo = Math.min(...rows.map((r) => Number(r.yearFrom) || 0));
        const hi = Math.max(...rows.map((r) => Number(r.yearTo) || CURRENT_YEAR));
        // ±1 year is normal naming (local model year vs catalog year); only flag real gaps.
        const out = years.filter((y) => y < lo - 1 || y > hi + 1);
        if (out.length) add(p, "title_year_mismatch", `Title years ${years.join("-")} outside fitment ${lo}-${hi}`, "medium");
      }
      if (/\buniversal\b/i.test(p.name)) add(p, "title_says_universal", "Title says Universal but fitment is a specific car list", "low");
    }
  }

  void categories;
  return issues;
}

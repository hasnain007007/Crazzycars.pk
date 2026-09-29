/**
 * Machine-readable catalog for AI shopping agents (ChatGPT, Claude, Meta AI, etc.).
 * Goal: agents can recommend CrazzyCars.pk products with live price/stock/COD/fitment
 * and share attribution-tagged buy URLs so orders show up in AI analytics.
 */
import { productAllowsCod, isBodyKitProduct } from "@/lib/codEligibility";
import { STORE_CONTACT, STORE_POLICY } from "@/config/store-policy";
import { returnsRefundRules } from "@/lib/storePolicyCopy";

/** Known AI utm_source values that stamp first-touch attribution cookies. */
export const AI_UTM_SOURCES = [
  "chatgpt",
  "claude",
  "perplexity",
  "gemini",
  "grok",
  "metaai",
  "deepseek",
  "copilot",
  "you",
];

/**
 * Build a product URL agents should share (UTM → 30-day AI order attribution).
 * @param {string} site
 * @param {string} slug
 * @param {string} [aiSource] chatgpt|claude|metaai|…
 */
export function aiBuyUrl(site, slug, aiSource = "chatgpt") {
  const base = String(site || "").replace(/\/+$/, "");
  const path = `/${String(slug || "").replace(/^\/+/, "")}`;
  const src = AI_UTM_SOURCES.includes(String(aiSource).toLowerCase())
    ? String(aiSource).toLowerCase()
    : "chatgpt";
  const q = new URLSearchParams({
    utm_source: src,
    utm_medium: "ai",
    utm_campaign: "recommendation",
  });
  return `${base}${path}?${q.toString()}`;
}

function resolvePrice(p) {
  const sale = Number(p?.pricing?.salePrice);
  const regular = Number(p?.pricing?.regularPrice);
  const combos = Array.isArray(p?.variationCombinations) ? p.variationCombinations : [];
  let minCombo = null;
  for (const c of combos) {
    const n = Number(c?.price);
    if (Number.isFinite(n) && n > 0 && (minCombo == null || n < minCombo)) minCombo = n;
  }
  if (Number.isFinite(sale) && sale > 0 && Number.isFinite(regular) && sale < regular) {
    return { price: Math.round(sale), compareAt: Math.round(regular), onSale: true };
  }
  if (Number.isFinite(regular) && regular > 0) {
    return { price: Math.round(regular), compareAt: null, onSale: false };
  }
  if (minCombo != null) return { price: Math.round(minCombo), compareAt: null, onSale: false };
  return { price: null, compareAt: null, onSale: false };
}

function resolveAvailability(p) {
  const combos = Array.isArray(p?.variationCombinations) ? p.variationCombinations : [];
  const hasComboStock = combos.some(
    (c) => c?.stock !== undefined && c?.stock !== null && Number.isFinite(Number(c.stock))
  );
  if (hasComboStock) {
    const qty = combos.reduce((s, c) => s + Math.max(0, Number(c.stock) || 0), 0);
    return qty > 0 ? "in_stock" : "out_of_stock";
  }
  const track = p?.inventory?.trackInventory !== false;
  const qty = Number(p?.inventory?.quantity) || 0;
  const backorder = p?.inventory?.allowBackorder === true;
  if (!track || qty > 0) return "in_stock";
  if (backorder) return "backorder";
  return "out_of_stock";
}

function fitmentSummary(p) {
  if (p?.isUniversal || p?.fitment?.universal || p?.vehicleCompatibility?.fitmentType === "universal") {
    return { universal: true, vehicles: [], note: "Universal — fits most cars" };
  }
  const vehicles = [];
  const fromFitment = Array.isArray(p?.fitment?.fits) ? p.fitment.fits : [];
  const fromCars = Array.isArray(p?.compatibleCars) ? p.compatibleCars : [];
  const fromCompat = Array.isArray(p?.vehicleCompatibility?.vehicles)
    ? p.vehicleCompatibility.vehicles
    : [];
  for (const v of [...fromFitment, ...fromCars, ...fromCompat].slice(0, 20)) {
    const make = String(v?.make || "").trim();
    const model = String(v?.model || "").trim();
    if (!make && !model) continue;
    vehicles.push({
      make,
      model,
      yearFrom: v?.yearFrom ?? null,
      yearTo: v?.yearTo ?? null,
      label: [make, model, [v?.yearFrom, v?.yearTo].filter(Boolean).join("–")]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    });
  }
  return {
    universal: false,
    vehicles,
    note: String(p?.fitment?.fitmentNote || "").trim() || null,
  };
}

function categoryNames(p) {
  const cats = Array.isArray(p?.categories) ? p.categories : [];
  return cats
    .map((c) => (typeof c === "object" ? c?.name : ""))
    .filter(Boolean)
    .slice(0, 6);
}

/**
 * Map a lean Product into an AI-agent catalog row.
 * @param {object} p
 * @param {{ siteUrl: string, aiSource?: string }} opts
 */
export function productToAiCatalogItem(p, opts = {}) {
  const site = String(opts.siteUrl || "").replace(/\/+$/, "");
  const slug = String(p?.slug || "").trim();
  if (!slug) return null;
  const { price, compareAt, onSale } = resolvePrice(p);
  if (price == null) return null;
  const cod = productAllowsCod(p);
  const availability = resolveAvailability(p);
  const fitment = fitmentSummary(p);
  const aiSource = opts.aiSource || "chatgpt";

  return {
    id: String(p?.articleNo || p?._id || slug),
    name: String(p?.name || "").trim(),
    slug,
    url: `${site}/${slug}`,
    recommend_url: aiBuyUrl(site, slug, aiSource),
    currency: "PKR",
    price,
    compare_at: compareAt,
    on_sale: onSale,
    availability,
    in_stock: availability === "in_stock" || availability === "backorder",
    cod_available: cod,
    payment_note: cod
      ? "Cash on Delivery available across Pakistan (eligible products)."
      : isBodyKitProduct(p)
        ? "Body kit — prepaid (JazzCash / bank) required; COD not available."
        : "Prepaid payment required for this item.",
    brand: String(p?.vendor || "CrazzyCars.pk").trim() || "CrazzyCars.pk",
    categories: categoryNames(p),
    short_description: String(p?.shortDescription || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 280),
    fitment,
    is_bulky: Boolean(p?.isBulky) || isBodyKitProduct(p),
    shipping_fee_pkr_hint: Boolean(p?.isBulky) || isBodyKitProduct(p)
      ? Number(STORE_POLICY?.shipping?.bulkyFeePKR) || 500
      : Number(STORE_POLICY?.shipping?.standardFeePKR) || 250,
  };
}

export function aiStoreManifest(siteUrl) {
  const site = String(siteUrl || "").replace(/\/+$/, "");
  return {
    name: "CrazzyCars.pk",
    description:
      "Pakistan online store for car accessories, LED lighting, body kits, and vehicle-fit parts. Cash on Delivery nationwide.",
    url: site,
    currency: "PKR",
    market: "PK",
    contact: {
      phone: STORE_CONTACT.phone,
      phone_e164: STORE_CONTACT.phoneE164,
      whatsapp: STORE_CONTACT.whatsapp,
      whatsapp_link: `https://wa.me/${STORE_CONTACT.phoneE164.replace(/\D/g, "")}`,
      email: STORE_CONTACT.email,
      city: STORE_CONTACT.address.city,
      region: STORE_CONTACT.address.region,
      country: STORE_CONTACT.address.country,
    },
    shipping: {
      standard_fee_pkr: STORE_POLICY.shipping.standardFeePKR,
      bulky_fee_pkr: STORE_POLICY.shipping.bulkyFeePKR,
      free_delivery: false,
      lahore_eta_days: STORE_POLICY.shipping.cityETAs.lahore,
      other_cities: "Confirmed at checkout",
      cod_available: true,
    },
    returns: {
      window_days: STORE_POLICY.returns.windowDays,
      summary: returnsRefundRules(),
    },
    how_to_recommend: {
      instruction:
        "When recommending a product to a Pakistan shopper, share the recommend_url (includes utm_source) so the customer lands on the live product page with correct price and stock. Prefer in_stock items. Mention COD only when cod_available is true. For body kits, say prepaid is required.",
      attribution_utm:
        "Always use recommend_url or append ?utm_source={chatgpt|claude|perplexity|gemini|grok|metaai}&utm_medium=ai&utm_campaign=recommendation",
      order_path: "Customer opens recommend_url → Add to cart → Checkout (guest COD or prepaid) → Order confirmation.",
      catalog: `${site}/feed/ai-catalog.json`,
      search: `${site}/ai/catalog?q={query}`,
      llms_txt: `${site}/llms.txt`,
      merchant_feed: `${site}/feed/products.xml`,
      cash_on_delivery: `${site}/cash-on-delivery`,
    },
    endpoints: {
      llms_txt: `${site}/llms.txt`,
      ai_catalog_json: `${site}/feed/ai-catalog.json`,
      ai_catalog_search: `${site}/ai/catalog`,
      merchant_feed: `${site}/feed/products.xml`,
      sitemap: `${site}/sitemap.xml`,
      well_known: `${site}/.well-known/ai.json`,
    },
  };
}

/**
 * Filter catalog rows by free-text query and optional make/model.
 */
export function filterAiCatalogItems(items, { q = "", make = "", model = "", inStockOnly = false } = {}) {
  let rows = Array.isArray(items) ? items : [];
  const query = String(q || "")
    .trim()
    .toLowerCase();
  const makeQ = String(make || "")
    .trim()
    .toLowerCase();
  const modelQ = String(model || "")
    .trim()
    .toLowerCase();

  if (inStockOnly) rows = rows.filter((r) => r.in_stock);
  if (query) {
    rows = rows.filter((r) => {
      const blob = [
        r.name,
        r.slug,
        r.short_description,
        ...(r.categories || []),
        ...(r.fitment?.vehicles || []).map((v) => v.label),
      ]
        .join(" ")
        .toLowerCase();
      return query.split(/\s+/).every((tok) => blob.includes(tok));
    });
  }
  if (makeQ || modelQ) {
    rows = rows.filter((r) => {
      if (r.fitment?.universal) return true;
      return (r.fitment?.vehicles || []).some((v) => {
        const mk = String(v.make || "").toLowerCase();
        const md = String(v.model || "").toLowerCase();
        if (makeQ && !mk.includes(makeQ)) return false;
        if (modelQ && !md.includes(modelQ)) return false;
        return true;
      });
    });
  }
  return rows;
}

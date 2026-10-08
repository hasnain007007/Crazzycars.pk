/**
 * SEO helpers — JSON-LD structured data for Google / AI shopping citation.
 */
import { getSiteUrl } from "../siteUrl.js";
import {
  buildOfferShippingDetails,
  buildOrganizationReturnPolicy,
} from "../schema/merchantReturnPolicy.mjs";
import { resolveProductImageUrls } from "../productImages.js";
import { productAllowsCod } from "../codEligibility.js";
import {
  fitmentVehiclesForSchema,
  resolveFitment,
  specAdditionalProperties,
  specsFromProduct,
} from "../product-specs.mjs";

function site() {
  return getSiteUrl();
}

function absoluteProductUrl(path) {
  const SITE = site();
  const p = path?.startsWith("/") ? path : `/${path || ""}`;
  return `${SITE}${p}`;
}

function absoluteImageUrls(images, siteUrl) {
  const SITE = siteUrl || site();
  const list = Array.isArray(images) ? images : [];
  const out = [];
  for (const item of list) {
    const raw = String(typeof item === "string" ? item : item?.url || "").trim();
    if (!raw) continue;
    if (/res\.cloudinary\.com|dquier8fv/i.test(raw)) continue;
    let href = raw;
    if (href.startsWith("//")) href = `https:${href}`;
    else if (href.startsWith("/")) href = `${SITE}${href}`;
    else if (!/^https?:\/\//i.test(href)) continue;
    if (!out.includes(href)) out.push(href);
  }
  return out;
}

/** @deprecated prefer resolveProductImageUrls — kept for callers passing a bare URL list */
export { absoluteImageUrls as absolutizeImageUrlList };

function conditionUrl(condition) {
  const c = String(condition || "new").toLowerCase();
  if (c === "used") return "https://schema.org/UsedCondition";
  if (c === "refurbished") return "https://schema.org/RefurbishedCondition";
  return "https://schema.org/NewCondition";
}

function availabilityUrl({ stock, trackInventory, allowBackorder, hasComboStock, anyComboInStock }) {
  const track = trackInventory !== false;
  if (allowBackorder === true) {
    return "https://schema.org/InStock";
  }
  if (hasComboStock) {
    return anyComboInStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  }
  const qty = Number(stock) || 0;
  if (!track || qty > 0) {
    return "https://schema.org/InStock";
  }
  return "https://schema.org/OutOfStock";
}

/** First positive price from serialized or raw product shapes (skip salePrice: 0). */
function resolveOfferPrice(p) {
  const candidates = [
    p?.price,
    p?.salePrice,
    p?.regularPrice,
    p?.compareAt,
    p?.pricing?.salePrice,
    p?.pricing?.regularPrice,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  // Variation matrix / combo fallback (raw catalog docs).
  const combos = Array.isArray(p?.variationCombinations) ? p.variationCombinations : [];
  let minCombo = null;
  for (const c of combos) {
    const n = Number(c?.price);
    if (Number.isFinite(n) && n > 0 && (minCombo == null || n < minCombo)) minCombo = n;
  }
  if (minCombo != null) return minCombo;
  const variants = Array.isArray(p?.variants) ? p.variants : [];
  for (const v of variants) {
    const n = Number(v?.price);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function productHasRichResultSignal(node) {
  if (!node || typeof node !== "object") return false;
  if (node.offers && Number(node.offers.price) > 0) return true;
  if (node.aggregateRating && Number(node.aggregateRating.reviewCount) > 0) return true;
  if (Array.isArray(node.review) && node.review.length > 0) return true;
  return false;
}

/** Plain-text product description — prefer long body text for AEO (never empty). */
function resolveProductDescription(p, slug = "") {
  const name = String(p?.name || slug || "Product").trim();
  const candidates = [
    p?.longDescription,
    p?.descriptionHtml,
    p?.description,
    p?.shortDescription,
    p?.metaDescription,
    p?.seo?.metaDescription,
  ];
  let raw = "";
  for (const c of candidates) {
    const plain = String(c || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\*\*/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (plain.length > 40) {
      raw = plain;
      break;
    }
    if (!raw && plain) raw = plain;
  }
  return (
    raw ||
    `${name} — shop online at CrazzyCars.pk with Cash on Delivery across Pakistan.`
  ).slice(0, 5000);
}

/** Always emit sku so merchant listings have a stable identifier with brand. */
function resolveProductSku(p, slug = "") {
  const sku = String(p?.sku || p?.articleNo || p?.inventory?.sku || "").trim();
  if (sku) return sku;
  const fromSlug = String(slug || p?.slug || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return fromSlug || "CC-PRODUCT";
}

function resolvePriceValidUntil(p) {
  if (p?.priceValidUntil) return String(p.priceValidUntil).slice(0, 10);
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

/** Offer.validFrom — clears GSC merchant "Missing field validFrom (optional)". */
function resolveOfferValidFrom(p) {
  if (p?.validFrom) return String(p.validFrom).slice(0, 10);
  const fromDoc = p?.updatedAt || p?.createdAt || p?.publishedAt;
  if (fromDoc) {
    const d = new Date(fromDoc);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function applyGtinMpn(node, p) {
  const gtin = String(p?.gtin || p?.ean || "").replace(/\D/g, "");
  if (gtin.length >= 8) {
    if (gtin.length === 13) node.gtin13 = gtin;
    else if (gtin.length === 12) node.gtin12 = gtin;
    else if (gtin.length === 14) node.gtin14 = gtin;
    else node.gtin = gtin;
  }
  // Prefer real MPN; otherwise reuse SKU/article so Merchant listings always have
  // brand + an identifier (clears GSC "No global identifier provided").
  const mpn = String(
    p?.mpn || p?.partNumber || p?.sku || p?.articleNo || p?.inventory?.sku || node?.sku || ""
  ).trim();
  if (mpn) node.mpn = mpn.slice(0, 70);
}

/**
 * Shared Offer block for PDP + collection ItemList Products.
 * Shipping fee follows product.isBulky. No CreditCard. No per-Offer return policy
 * (Organization-level policy only — avoids ~40 FreeReturn copies on category pages).
 */
function buildMerchantOffer({
  url,
  price,
  stockMeta,
  condition,
  siteUrl,
  includeSeller = false,
  priceValidUntil,
  validFrom,
  product = null,
} = {}) {
  const SITE = siteUrl || site();
  const offer = {
    "@type": "Offer",
    url,
    priceCurrency: "PKR",
    price: Number(price).toFixed(2),
    validFrom: validFrom || resolveOfferValidFrom(),
    priceValidUntil: priceValidUntil || resolvePriceValidUntil(),
    itemCondition: conditionUrl(condition),
    availability: availabilityUrl(stockMeta || {}),
    shippingDetails: buildOfferShippingDetails(product),
  };
  if (includeSeller) {
    offer.seller = {
      "@type": "Organization",
      "@id": `${SITE}/#org`,
      name: "CrazzyCars.pk",
      url: SITE,
      telephone: "+92-328-4010007",
    };
  }
  return offer;
}

function resolveStockMeta(p) {
  const combos = Array.isArray(p?.variationCombinations) ? p.variationCombinations : [];
  const hasComboStock = combos.some(
    (c) => c?.stock !== undefined && c?.stock !== null && Number.isFinite(Number(c.stock))
  );
  const anyComboInStock = hasComboStock ? combos.some((c) => Number(c.stock) > 0) : false;
  const stock = hasComboStock
    ? combos.reduce((sum, c) => sum + Math.max(0, Number(c.stock) || 0), 0)
    : Number(p?.stock ?? p?.inventory?.quantity ?? p?.quantity ?? 0);
  return {
    stock,
    trackInventory: p?.trackInventory ?? p?.inventory?.trackInventory,
    allowBackorder: p?.allowBackorder ?? p?.inventory?.allowBackorder,
    hasComboStock,
    anyComboInStock,
  };
}

/**
 * Schema.org review/aggregateRating may only use genuine customer-sourced reviews.
 * Genuine = approved + non-empty orderId + not isSeed (and source customer when set).
 * Seeded/manual/import corpus must not appear in Google structured data.
 */
export function isGenuineReview(r) {
  if (!r || typeof r !== "object") return false;
  if (r.isSeed === true) return false;
  const status = String(r.status || "approved").trim().toLowerCase();
  if (status !== "approved") return false;
  const orderId = String(r.orderId || "").trim();
  if (!orderId) return false;
  const source = String(r.source || "").trim().toLowerCase();
  // Legacy rows may lack source; require customer when source is present.
  if (source && source !== "customer") return false;
  const email = String(r?.reviewer?.email || r?.email || "").toLowerCase();
  if (email.endsWith("@seed-top100-bestsellers-v1.local") || email.endsWith("@crazzycars.local")) {
    return false;
  }
  return true;
}

/** @deprecated use isGenuineReview */
function isCustomerSourcedReview(r) {
  return isGenuineReview(r);
}

/** Genuine approved rows only (for JSON-LD + on-page). */
export function customerReviewsForSchema(reviews) {
  return (Array.isArray(reviews) ? reviews : []).filter(isGenuineReview);
}

/** Map stored Review docs into schema.org Review nodes for Product JSON-LD. */
function mapReviewsToJsonLd(reviews, limit = 8) {
  const rows = customerReviewsForSchema(reviews);
  return rows.slice(0, Math.max(0, limit)).map((r) => {
    const authorName =
      String(r?.reviewer?.name || r?.author || r?.name || "Customer").trim() || "Customer";
    const body = String(r?.body || r?.reviewBody || "").trim();
    const title = String(r?.title || r?.name || "").trim();
    const rating = Number(r?.rating || r?.reviewRating?.ratingValue) || 5;
    const published = r?.createdAt || r?.datePublished || r?.publishedAt;
    const node = {
      "@type": "Review",
      author: { "@type": "Person", name: authorName },
      reviewRating: {
        "@type": "Rating",
        ratingValue: String(Math.min(5, Math.max(1, rating))),
        bestRating: "5",
        worstRating: "1",
      },
    };
    if (title) node.name = title.slice(0, 200);
    if (body) node.reviewBody = body.slice(0, 5000);
    if (published) {
      const d = new Date(published);
      if (!Number.isNaN(d.getTime())) node.datePublished = d.toISOString().slice(0, 10);
    }
    return node;
  });
}

/** Aggregate from customer-sourced rows only — never Product.reviewCount (includes seed). */
function aggregateFromCustomerReviews(reviews) {
  const rows = customerReviewsForSchema(reviews);
  if (!rows.length) return null;
  const sum = rows.reduce((s, r) => s + (Number(r?.rating) || 0), 0);
  const avg = sum / rows.length;
  if (!(avg > 0)) return null;
  return {
    ratingValue: Math.round(avg * 10) / 10,
    reviewCount: rows.length,
  };
}

/**
 * Build a Google-valid Product node for ItemList, or null if incomplete.
 * Bare Product (name/url only) triggers GSC: "Either offers, review, or aggregateRating…".
 */
function buildCollectionProductNode(p) {
  const slug = String(p?.slug || "").trim();
  if (!slug) return null;
  const SITE = site();
  const path = p.urlPath || `/${slug}`;
  const itemUrl = absoluteProductUrl(path);
  const priceNum = resolveOfferPrice(p);
  // Never put review markup on category ItemList Product nodes.
  if (priceNum == null) return null;

  const productNode = {
    "@type": "Product",
    "@id": `${itemUrl}#product`,
    name: p.name || slug,
    url: itemUrl,
    brand: { "@type": "Brand", name: String(p.brand || p.vendor || "CrazzyCars.pk").trim() || "CrazzyCars.pk" },
    description: resolveProductDescription(p, slug),
    sku: resolveProductSku(p, slug),
  };
  applyGtinMpn(productNode, p);
  // Ensure mpn even when applyGtinMpn had no article fields on lean listing docs.
  if (!productNode.mpn && productNode.sku) productNode.mpn = productNode.sku;

  if (priceNum != null) {
    productNode.offers = buildMerchantOffer({
      url: itemUrl,
      price: priceNum,
      stockMeta: resolveStockMeta(p),
      condition: p.condition,
      siteUrl: SITE,
      priceValidUntil: resolvePriceValidUntil(p),
      validFrom: resolveOfferValidFrom(p),
      product: p,
    });
  }

  // Reviews intentionally omitted on collection ItemList entries.

  if (!productHasRichResultSignal(productNode)) return null;

  const imgCandidates = [
    typeof p.image === "string" ? p.image : "",
    Array.isArray(p.images) ? p.images[0] : "",
    p.media?.images?.find((i) => i?.isMain)?.url,
    p.media?.images?.[0]?.url,
  ];
  const imgs = absoluteImageUrls(imgCandidates, SITE);
  if (imgs.length) productNode.image = imgs[0];

  return productNode;
}

/** True when Google Product / merchant listing rich results can accept this node. */
export function isCompleteProductJsonLd(ld) {
  if (!ld || ld["@type"] !== "Product") return false;
  const name = String(ld.name || "").trim();
  const images = Array.isArray(ld.image) ? ld.image.filter(Boolean) : ld.image ? [ld.image] : [];
  const price = Number(ld.offers?.price);
  return Boolean(name && images.length && Number.isFinite(price) && price > 0);
}

/** Product schema — every product page */
export function productJsonLd(p) {
  const SITE = site();
  const price = resolveOfferPrice(p);
  const slug = String(p?.slug || "").trim();

  // Prefer full product media resolution (handles media.images / images / image).
  const fromProduct = resolveProductImageUrls(p, { siteUrl: SITE });
  const fromList = absoluteImageUrls(
    Array.isArray(p.images) ? p.images : p.media?.images || [],
    SITE
  );
  const images = fromProduct.length ? fromProduct : fromList;
  const path = p.urlPath || `/${slug}`;
  const url = absoluteProductUrl(path);
  const categoryName =
    p.category ||
    (Array.isArray(p.categories) ? p.categories.map((c) => c?.name).filter(Boolean).join(" > ") : "") ||
    undefined;

  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: p.name,
    url,
    description: resolveProductDescription(p, slug),
    sku: resolveProductSku(p, slug),
    brand: { "@type": "Brand", name: String(p.brand || p.vendor || "CrazzyCars.pk").trim() || "CrazzyCars.pk" },
  };

  // Google Product rich results require image — omit the field when empty (never emit []).
  if (images.length) ld.image = images;

  if (price != null) {
    ld.offers = buildMerchantOffer({
      url,
      price,
      stockMeta: resolveStockMeta(p),
      condition: p.condition,
      siteUrl: SITE,
      includeSeller: true,
      priceValidUntil: resolvePriceValidUntil(p),
      validFrom: resolveOfferValidFrom(p),
      product: p,
    });
  }

  applyGtinMpn(ld, p);
  if (!ld.mpn && ld.sku) ld.mpn = ld.sku;
  if (categoryName) ld.category = categoryName;

  // Vehicle fitment — PropertyValue + structured Car nodes when available.
  const fitmentProps = [];
  const vehicles =
    (Array.isArray(p.compatibleCars) && p.compatibleCars.length
      ? p.compatibleCars
      : Array.isArray(p.vehicleCompatibility?.vehicles)
        ? p.vehicleCompatibility.vehicles
        : Array.isArray(p.compatibleVehicles)
          ? p.compatibleVehicles
          : []) || [];
  for (const v of vehicles.slice(0, 12)) {
    const make = String(v?.make || "").trim();
    const model = String(v?.model || "").trim();
    if (!make && !model) continue;
    const years =
      v?.yearFrom || v?.yearTo
        ? ` ${[v.yearFrom, v.yearTo].filter(Boolean).join("–")}`
        : "";
    fitmentProps.push({
      "@type": "PropertyValue",
      name: "Vehicle Fitment",
      value: `${make} ${model}${years}`.replace(/\s+/g, " ").trim(),
    });
  }
  if (p.isUniversal || p.vehicleCompatibility?.fitmentType === "universal" || p.fitment?.universal) {
    fitmentProps.push({
      "@type": "PropertyValue",
      name: "Vehicle Fitment",
      value: "Universal — fits most cars",
    });
  }
  fitmentProps.push({
    "@type": "PropertyValue",
    name: "Cash on Delivery",
    value: productAllowsCod(p) ? "Available nationwide (Pakistan)" : "Not available — prepaid only",
  });
  const specProps = specAdditionalProperties(specsFromProduct(p));
  const allProps = [...fitmentProps, ...specProps].slice(0, 24);
  if (allProps.length) {
    ld.additionalProperty = allProps;
  }
  // Prefer stored fitment; otherwise resolve from VC / compatibleVehicles / compatibleCars.
  const spareFor = fitmentVehiclesForSchema(resolveFitment(p));
  if (spareFor.length) {
    ld.isAccessoryOrSparePartFor = spareFor.slice(0, 12);
  }

  // Customer-sourced approved reviews only — ignore Product aggregates (seed/manual/import).
  const reviewRows = Array.isArray(p.reviews) ? p.reviews : [];
  const reviewLd = mapReviewsToJsonLd(reviewRows, 8);
  const schemaAgg = aggregateFromCustomerReviews(reviewRows);
  if (reviewLd.length && schemaAgg) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: String(schemaAgg.ratingValue),
      reviewCount: String(schemaAgg.reviewCount),
      bestRating: "5",
      worstRating: "1",
    };
    ld.review = reviewLd;
  }

  return ld;
}

/** BreadcrumbList — items: [{ name, url }] where url is path starting with / */
export function breadcrumbJsonLd(items) {
  const SITE = site();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: (items || []).map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE}${it.url?.startsWith("/") ? it.url : `/${it.url || ""}`}`,
    })),
  };
}

/**
 * CollectionPage — category / collection pages.
 * `products` should be the products actually rendered on the page (SSR first page).
 * `numberOfItems` uses the full membership count when provided.
 *
 * Nested Product nodes MUST include offers (or review / aggregateRating) or Google
 * Rich Results marks them invalid: "Either offers, review, or aggregateRating…".
 */
export function collectionPageJsonLd({
  name,
  description,
  url,
  products = [],
  numberOfItems,
  breadcrumb,
  isPartOfName,
} = {}) {
  const SITE = site();
  const pageUrl = url?.startsWith("http")
    ? url
    : `${SITE}${url?.startsWith("/") ? url : `/${url || ""}`}`;

  const list = (Array.isArray(products) ? products : [])
    .map((p, i) => {
      const slug = String(p?.slug || "").trim();
      if (!slug) return null;
      const path = p.urlPath || `/${slug}`;
      const itemUrl = absoluteProductUrl(path);
      // URL-only ItemList entries — no nested Offer/shipping blobs on category pages.
      return {
        "@type": "ListItem",
        position: i + 1,
        url: itemUrl,
        name: p.name || slug,
      };
    })
    .filter(Boolean);

  const total =
    Number.isFinite(Number(numberOfItems)) && Number(numberOfItems) >= 0
      ? Number(numberOfItems)
      : list.length;

  const ld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#collection`,
    name: name || undefined,
    description: description || undefined,
    url: pageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: isPartOfName || "CrazzyCars.pk",
      url: SITE,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: total,
      itemListElement: list,
    },
  };

  if (breadcrumb) {
    ld.breadcrumb = breadcrumb["@type"]
      ? breadcrumb
      : breadcrumbJsonLd(breadcrumb);
  }

  return ld;
}

/** AutoPartsStore — root layout once */
export function organizationJsonLd(overrides = {}) {
  const SITE = site();
  const orgId = `${SITE}/#org`;
  return {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    "@id": orgId,
    name: overrides.name || "CrazzyCars.pk",
    url: SITE,
    logo: {
      "@type": "ImageObject",
      url: overrides.logo || `${SITE}/logo.png`,
    },
    image: overrides.image || overrides.ogImage || `${SITE}/og-image.jpg`,
    email: overrides.email || "info@crazzycars.pk",
    telephone: overrides.telephone || "+92-328-4010007",
    hasMerchantReturnPolicy: buildOrganizationReturnPolicy(SITE),
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: "+92-328-4010007",
        availableLanguage: ["en", "ur"],
        areaServed: "PK",
      },
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        telephone: "+92-328-4010007",
        url: "https://wa.me/923284010007",
        availableLanguage: ["en", "ur"],
        areaServed: "PK",
      },
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Gujranwala",
      addressRegion: "Punjab",
      addressCountry: "PK",
      ...(overrides.streetAddress ? { streetAddress: overrides.streetAddress } : {}),
    },
    sameAs: overrides.sameAs || [
      "https://www.facebook.com/crazzycars.pk",
      "https://www.instagram.com/crazzycars.pk",
      "https://www.tiktok.com/@crazzycars.pk",
    ],
  };
}

/** WebSite + SearchAction */
export function websiteJsonLd(overrides = {}) {
  const SITE = site();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: overrides.name || "CrazzyCars.pk",
    url: SITE,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE}/shop?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Homepage hub graph — categories + shop-by-car + trust pages already linked in UI.
 * @param {{
 *   name?: string,
 *   description?: string,
 *   items?: { name: string, url: string }[],
 * }} opts
 */
export function homeHubCollectionJsonLd(opts = {}) {
  const SITE = site();
  const items = (Array.isArray(opts.items) ? opts.items : [])
    .filter((it) => it?.name && it?.url)
    .slice(0, 40);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE}/#homepage`,
    name: opts.name || "CrazzyCars.pk — Car Accessories Pakistan",
    url: `${SITE}/`,
    description:
      opts.description ||
      "Buy car accessories online in Pakistan — shop by category or vehicle. Cash on Delivery on eligible items.",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: it.name,
        url: it.url.startsWith("http") ? it.url : `${SITE}${it.url.startsWith("/") ? it.url : `/${it.url}`}`,
      })),
    },
  };
}

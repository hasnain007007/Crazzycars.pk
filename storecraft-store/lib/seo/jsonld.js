/**
 * SEO helpers — JSON-LD structured data for Google / AI shopping citation.
 */
import { getSiteUrl } from "../siteUrl.js";
import {
  buildMerchantReturnPolicies,
  buildOfferShippingDetails,
} from "../schema/merchantReturnPolicy.mjs";
import { resolveProductImageUrls } from "../productImages.js";

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

/** Plain-text product description — never empty (Google treats "" as missing). */
function resolveProductDescription(p, slug = "") {
  const name = String(p?.name || slug || "Product").trim();
  const raw = String(
    p?.metaDescription ||
      p?.seo?.metaDescription ||
      p?.shortDescription ||
      p?.description ||
      p?.longDescription ||
      ""
  )
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
 * Always includes shippingDetails + hasMerchantReturnPolicy (GSC merchant warnings).
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
    shippingDetails: buildOfferShippingDetails(),
    hasMerchantReturnPolicy: buildMerchantReturnPolicies(SITE),
  };
  if (includeSeller) {
    offer.seller = {
      "@type": "Organization",
      name: "CrazzyCars.pk",
      url: SITE,
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

/** Map stored Review docs into schema.org Review nodes for Product JSON-LD. */
function mapReviewsToJsonLd(reviews, limit = 8) {
  const rows = Array.isArray(reviews) ? reviews : [];
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
  const ratingValue = Number(p.ratingValue || p.averageRating || p.ratingAverage || p.rating) || 0;
  const reviewCount = Number(p.reviewCount || p.numReviews || p.totalReviews) || 0;
  const hasRating = ratingValue > 0 && reviewCount > 0;
  if (priceNum == null && !hasRating) return null;

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
    });
  }

  if (hasRating) {
    // Only emit aggregateRating when we also have Review nodes — otherwise GSC
    // reports optional "Missing field review" on every listing Product.
    const reviewLd = mapReviewsToJsonLd(p.reviews, 2);
    if (reviewLd.length) {
      productNode.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: String(ratingValue),
        reviewCount: String(reviewCount),
        bestRating: "5",
        worstRating: "1",
      };
      productNode.review = reviewLd;
    }
  }

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
    });
  }

  applyGtinMpn(ld, p);
  if (!ld.mpn && ld.sku) ld.mpn = ld.sku;
  if (categoryName) ld.category = categoryName;

  // Vehicle fitment — helps AI shopping agents match make/model recommendations.
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
  if (p.isUniversal || p.vehicleCompatibility?.fitmentType === "universal") {
    fitmentProps.push({
      "@type": "PropertyValue",
      name: "Vehicle Fitment",
      value: "Universal — fits most cars",
    });
  }
  if (fitmentProps.length) {
    ld.additionalProperty = fitmentProps;
  }

  const ratingValue = Number(p.ratingValue || p.averageRating || p.rating) || 0;
  const reviewCount = Number(p.reviewCount || p.numReviews) || 0;
  const reviewRows = Array.isArray(p.reviews) ? p.reviews : [];
  const reviewLd = mapReviewsToJsonLd(reviewRows, 8);
  // Emit ratings only with real Review nodes (avoids GSC optional "Missing field review").
  if (reviewLd.length && ratingValue > 0 && reviewCount > 0) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: String(ratingValue),
      reviewCount: String(Math.max(reviewCount, reviewLd.length)),
      bestRating: "5",
      worstRating: "1",
    };
    ld.review = reviewLd;
  } else if (reviewLd.length) {
    ld.review = reviewLd;
    const avg =
      reviewRows.reduce((s, r) => s + (Number(r?.rating) || 0), 0) / reviewLd.length;
    if (avg > 0) {
      ld.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: String(Math.round(avg * 10) / 10),
        reviewCount: String(reviewLd.length),
        bestRating: "5",
        worstRating: "1",
      };
    }
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
      const listItem = {
        "@type": "ListItem",
        position: i + 1,
        url: itemUrl,
        name: p.name || slug,
      };
      // Only attach Product when Google-complete — never emit bare name/url Product.
      const productNode = buildCollectionProductNode(p);
      if (productNode) listItem.item = productNode;
      return listItem;
    })
    .filter(Boolean)
    // Safety net: if anything incomplete slipped through, drop the Product item.
    .map((li) => {
      if (li?.item?.["@type"] === "Product" && !productHasRichResultSignal(li.item)) {
        const { item, ...rest } = li;
        return rest;
      }
      return li;
    });

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
  return {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    name: overrides.name || "CrazzyCars.pk",
    url: SITE,
    logo: overrides.logo || `${SITE}/og-image.jpg`,
    email: overrides.email || "info@crazzycars.pk",
    telephone: overrides.telephone || "+92-328-4010007",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Gujranwala",
      addressRegion: "Punjab",
      addressCountry: "PK",
      ...(overrides.streetAddress ? { streetAddress: overrides.streetAddress } : {}),
    },
    sameAs: overrides.sameAs || [
      "https://www.facebook.com/share/1EDTxnjBzS/",
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

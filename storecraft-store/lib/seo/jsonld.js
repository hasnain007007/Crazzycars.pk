/**
 * SEO helpers — JSON-LD structured data for Google / AI shopping citation.
 */
import { getSiteUrl } from "@/lib/siteUrl";

function site() {
  return getSiteUrl();
}

function absoluteProductUrl(path) {
  const SITE = site();
  const p = path?.startsWith("/") ? path : `/${path || ""}`;
  return `${SITE}${p}`;
}

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
    p?.pricing?.salePrice,
    p?.pricing?.regularPrice,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** Product schema — every product page */
export function productJsonLd(p) {
  const SITE = site();
  const price = resolveOfferPrice(p) ?? 0;
  const combos = Array.isArray(p.variationCombinations) ? p.variationCombinations : [];
  const hasComboStock = combos.some(
    (c) => c?.stock !== undefined && c?.stock !== null && Number.isFinite(Number(c.stock))
  );
  const anyComboInStock = hasComboStock
    ? combos.some((c) => Number(c.stock) > 0)
    : false;
  const stock = hasComboStock
    ? combos.reduce((sum, c) => sum + Math.max(0, Number(c.stock) || 0), 0)
    : Number(p.stock ?? p.inventory?.quantity ?? 0);

  const images = Array.isArray(p.images)
    ? p.images
    : p.media?.images?.map((i) => i.url).filter(Boolean) || [];
  const path = p.urlPath || `/${p.slug}`;
  const url = absoluteProductUrl(path);
  const sku = p.sku || p.articleNo || p.inventory?.sku || undefined;
  const gtin = String(p.gtin || p.ean || "").replace(/\D/g, "");
  const mpn = String(p.mpn || p.partNumber || "").trim() || undefined;
  const categoryName =
    p.category ||
    (Array.isArray(p.categories) ? p.categories.map((c) => c?.name).filter(Boolean).join(" > ") : "") ||
    undefined;

  const priceNum = Number(price);
  const priceValidUntil = (() => {
    if (p.priceValidUntil) return String(p.priceValidUntil).slice(0, 10);
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: p.name,
    url,
    image: images,
    description: p.metaDescription || p.seo?.metaDescription || p.shortDescription || "",
    sku: sku || undefined,
    brand: { "@type": "Brand", name: p.brand || "Homefy.pk" },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "PKR",
      price: Number.isFinite(priceNum) ? priceNum.toFixed(2) : String(price),
      priceValidUntil,
      availability: availabilityUrl({
        stock,
        trackInventory: p.trackInventory ?? p.inventory?.trackInventory,
        allowBackorder: p.allowBackorder ?? p.inventory?.allowBackorder,
        hasComboStock,
        anyComboInStock,
      }),
      itemCondition: conditionUrl(p.condition),
      seller: {
        "@type": "Organization",
        name: "Homefy.pk",
        url: SITE,
      },
    },
  };

  if (gtin.length >= 8) {
    if (gtin.length === 13) ld.gtin13 = gtin;
    else if (gtin.length === 12) ld.gtin12 = gtin;
    else if (gtin.length === 14) ld.gtin14 = gtin;
    else ld.gtin = gtin;
  }
  if (mpn) ld.mpn = mpn;
  if (categoryName) ld.category = categoryName;

  const ratingValue = Number(p.ratingValue || p.averageRating || p.rating) || 0;
  const reviewCount = Number(p.reviewCount || p.numReviews) || 0;
  if (ratingValue > 0 && reviewCount > 0) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: String(ratingValue),
      reviewCount: String(reviewCount),
      bestRating: "5",
      worstRating: "1",
    };
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
      const priceNum = resolveOfferPrice(p);
      const combos = Array.isArray(p.variationCombinations) ? p.variationCombinations : [];
      const hasComboStock = combos.some(
        (c) => c?.stock !== undefined && c?.stock !== null && Number.isFinite(Number(c.stock))
      );
      const anyComboInStock = hasComboStock
        ? combos.some((c) => Number(c.stock) > 0)
        : false;
      const stock = hasComboStock
        ? combos.reduce((sum, c) => sum + Math.max(0, Number(c.stock) || 0), 0)
        : Number(p.stock ?? p.inventory?.quantity ?? 0);
      const productNode = {
        "@type": "Product",
        "@id": `${itemUrl}#product`,
        name: p.name || slug,
        url: itemUrl,
      };
      const ratingValue = Number(p.ratingValue || p.averageRating || p.rating) || 0;
      const reviewCount = Number(p.reviewCount || p.numReviews || p.totalReviews) || 0;
      // Google Product rich results require offers | review | aggregateRating.
      // Never emit a bare Product node — that is the "1 critical issue" in GSC.
      if (priceNum != null) {
        productNode.offers = {
          "@type": "Offer",
          url: itemUrl,
          priceCurrency: "PKR",
          price: priceNum.toFixed(2),
          availability: availabilityUrl({
            stock,
            trackInventory: p.trackInventory ?? p.inventory?.trackInventory,
            allowBackorder: p.allowBackorder ?? p.inventory?.allowBackorder,
            hasComboStock,
            anyComboInStock,
          }),
        };
      }
      if (ratingValue > 0 && reviewCount > 0) {
        productNode.aggregateRating = {
          "@type": "AggregateRating",
          ratingValue: String(ratingValue),
          reviewCount: String(reviewCount),
          bestRating: "5",
          worstRating: "1",
        };
      }
      const listItem = {
        "@type": "ListItem",
        position: i + 1,
        url: itemUrl,
        name: p.name || slug,
      };
      if (productNode.offers || productNode.aggregateRating) {
        const img =
          (typeof p.image === "string" && p.image) ||
          p.images?.[0] ||
          p.media?.images?.find((i) => i?.isMain)?.url ||
          p.media?.images?.[0]?.url ||
          null;
        if (img) productNode.image = img;
        listItem.item = productNode;
      }
      return listItem;
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
      name: isPartOfName || "Homefy.pk",
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
    name: overrides.name || "Homefy.pk",
    url: SITE,
    logo: overrides.logo || `${SITE}/og-image.jpg`,
    email: overrides.email || "info@homefy.pk",
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
      "https://www.instagram.com/homefy.pk",
      "https://www.tiktok.com/@homefy.pk",
    ],
  };
}

/** WebSite + SearchAction */
export function websiteJsonLd(overrides = {}) {
  const SITE = site();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: overrides.name || "Homefy.pk",
    url: SITE,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE}/shop?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

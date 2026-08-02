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

function availabilityUrl({ stock, trackInventory, allowBackorder }) {
  const track = trackInventory !== false;
  const qty = Number(stock) || 0;
  if (!track || qty > 0 || allowBackorder === true) {
    return "https://schema.org/InStock";
  }
  return "https://schema.org/OutOfStock";
}

/** Product schema — every product page */
export function productJsonLd(p) {
  const SITE = site();
  const price = p.salePrice ?? p.price ?? p.pricing?.salePrice ?? p.pricing?.regularPrice ?? 0;
  const stock = Number(p.stock ?? p.inventory?.quantity ?? 0);
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
    brand: { "@type": "Brand", name: p.brand || "CrazzyCars.pk" },
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
      }),
      itemCondition: conditionUrl(p.condition),
      seller: {
        "@type": "Organization",
        name: "CrazzyCars.pk",
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
      return {
        "@type": "ListItem",
        position: i + 1,
        url: itemUrl,
        name: p.name || slug,
        item: {
          "@type": "Product",
          "@id": `${itemUrl}#product`,
          name: p.name || slug,
          url: itemUrl,
        },
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

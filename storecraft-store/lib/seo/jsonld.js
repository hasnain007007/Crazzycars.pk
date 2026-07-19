/**
 * SEO helpers — JSON-LD structured data for Google rich results.
 * Adapted from crazzycars-vehicles/seo/jsonld.js for ESM + getSiteUrl().
 */
import { getSiteUrl } from "@/lib/siteUrl";

function site() {
  return getSiteUrl();
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

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    image: images,
    description: p.metaDescription || p.seo?.metaDescription || p.shortDescription || "",
    sku: p.sku || p.inventory?.sku || undefined,
    brand: { "@type": "Brand", name: p.brand || "CrazzyCars.pk" },
    offers: {
      "@type": "Offer",
      url: `${SITE}${path.startsWith("/") ? path : `/${path}`}`,
      priceCurrency: "PKR",
      price: String(price),
      availability:
        stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(p.ratingValue || p.averageRating || p.rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: String(p.ratingValue || p.averageRating || p.rating),
            reviewCount: String(p.reviewCount || p.numReviews || 1),
          },
        }
      : {}),
  };
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

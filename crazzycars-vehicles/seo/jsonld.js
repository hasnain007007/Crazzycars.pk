/**
 * SEO helpers — JSON-LD structured data for Google rich results.
 * Use these in your Next.js pages (inject via <script type="application/ld+json">).
 * Rich results = product price/stock/stars showing directly in Google.
 */

const SITE = "https://crazzycars.pk"; // change to final domain when live

/** Product schema — put on every product page */
function productJsonLd(p) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    image: p.images || [],
    description: p.metaDescription || p.shortDescription || "",
    sku: p.sku || undefined,
    brand: { "@type": "Brand", name: p.brand || "CrazzyCars.pk" },
    offers: {
      "@type": "Offer",
      url: `${SITE}/products/${p.slug}`,
      priceCurrency: "PKR",
      price: String(p.salePrice ?? p.price),
      availability:
        p.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(p.ratingValue
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: String(p.ratingValue),
            reviewCount: String(p.reviewCount || 1),
          },
        }
      : {}),
  };
}

/** BreadcrumbList — Home > Exterior > Splitters > Product */
function breadcrumbJsonLd(items) {
  // items: [{ name: "Home", url: "/" }, { name: "Exterior", url: "/categories/exterior" }, ...]
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE}${it.url}`,
    })),
  };
}

/** Organization + LocalBusiness — put in the root layout once */
function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    name: "CrazzyCars.pk",
    url: SITE,
    logo: `${SITE}/logo.png`,
    email: "info@crazzycars.pk",
    telephone: "+92-328-4010007",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Gujranwala",
      addressRegion: "Punjab",
      addressCountry: "PK",
    },
    sameAs: [
      "https://www.facebook.com/share/1EDTxnjBzS/",
      "https://www.instagram.com/crazzycars.pk",
      "https://www.tiktok.com/@crazzycars.pk",
    ],
  };
}

/** WebSite + SearchAction — enables the Google sitelinks search box */
function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CrazzyCars.pk",
    url: SITE,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

module.exports = { productJsonLd, breadcrumbJsonLd, organizationJsonLd, websiteJsonLd, SITE };

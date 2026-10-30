import Link from "next/link";
import { RememberMyCar } from "@/components/store/MyCar";
import { notFound, permanentRedirect } from "next/navigation";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { buildVehiclePageProductFilter } from "@/lib/productVehicleQuery";
import { aggregateOfferLd, getProductPriceExtent, priceRangeSentence } from "@/lib/seo/categoryPriceExtent";
import {
  loadProductsForVehicle,
  loadVehicleBySlug,
  serializeVehicleProduct,
} from "@/lib/vehiclePageData";
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/seo/jsonld";
import { buildBrandedAbsoluteTitle } from "@/lib/seo/brandedTitle";
import { ProductListingSection } from "@/components/store/ProductListingSection";
import { listingHref, listingMetadata, parseListingSearchParams } from "@/lib/listingQuery";
import { withSafeMetadata } from "@/lib/safeMetadata";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { sortProductsClient } from "@/lib/productListing";
import { mediaImageUrl } from "@/lib/carCatalogCopy";
import { alsoKnownAsLine, vehicleMetaDescription } from "@/lib/seo/generationAliases";
import { buildVehicleKeywordFaqs, faqPageJsonLd } from "@/lib/seo/keywordStrategyFaqs";
import {
  getPageSeoOverride,
  VEHICLE_DESCRIPTION_HTML,
  VEHICLE_FAQ_OVERRIDES,
} from "@/lib/seo/gscAudit2026-10.mjs";
import { sanitizeCategoryHtml } from "@/lib/sanitizeHtml";
import { resolveDeletedPath } from "@/lib/deletedUrlRedirects.mjs";
import { BRAND_NAME, stripLegacyBrand, withBrandTitleSuffix } from "@/lib/brand";
import { getCarPageMeta } from "@/lib/seo/carPageMeta2026-10.mjs";
import { InternalBlogLinks } from "@/components/store/InternalBlogLinks";
import { blogsForCar } from "@/lib/seo/blogInternalLinks.mjs";

export const revalidate = 600;

const BRAND = BRAND_NAME;
const SITE = "https://crazzycars.pk";
const HERO_DESC_MAX = 320;

/** First paragraph only, capped — drops price lists / FAQ blocks from the hero. */
function shortenVehicleHeroHtml(html) {
  const safe = String(html || "").trim();
  if (!safe) return "";
  const pMatch = safe.match(/<p\b[^>]*>[\s\S]*?<\/p>/i);
  let chunk = pMatch ? pMatch[0] : safe;
  // Drop nested lists / headings if somehow inside the first block.
  chunk = chunk.replace(/<(ul|ol|h[1-6]|table)\b[\s\S]*$/i, "").trim();
  if (!chunk) return "";
  const text = chunk
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= HERO_DESC_MAX) return chunk.startsWith("<") ? chunk : `<p>${chunk}</p>`;
  const cut = text.slice(0, HERO_DESC_MAX).replace(/\s+\S*$/, "").trim();
  return `<p>${cut}…</p>`;
}

function shortenVehicleHeroPlain(text) {
  const t = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "";
  if (t.length <= HERO_DESC_MAX) return t;
  return `${t.slice(0, HERO_DESC_MAX).replace(/\s+\S*$/, "").trim()}…`;
}

export const generateMetadata = withSafeMetadata(async function vehicleMetadata({ params, searchParams }) {
  const { slug } = await params;
  const slugStr = String(slug || "").trim();
  const listing = parseListingSearchParams(await searchParams);
  const deletedCar = resolveDeletedPath(`/cars/${slugStr}`);
  if (deletedCar) permanentRedirect(listingHref(deletedCar, listing));
  try {
    await dbConnect();
    const vehicle = await loadVehicleBySlug(slugStr);
    if (!vehicle) return { title: "Vehicle Not Found", robots: { index: false, follow: false } };
    if (vehicle.slug && String(vehicle.slug) !== slugStr) {
      permanentRedirect(listingHref(`/cars/${vehicle.slug}`, listing));
    }
    const assigned = await Product.countDocuments(buildVehiclePageProductFilter(vehicle));
    if (assigned === 0) notFound();
    const totalPages = Math.max(1, Math.ceil(assigned / listing.pageSize) || 1);
    if (listing.page > totalPages) notFound();

    const carMeta = getCarPageMeta(vehicle.slug);
    const seoOverride = getPageSeoOverride(`/cars/${vehicle.slug}`);
    // S6: PAGE_SEO_OVERRIDES titles win (≤60, keyword-mapped). Else DB, then carPageMeta.
    const dbTitle = stripLegacyBrand(vehicle.metaTitle);
    const titleMeta = seoOverride?.title
      ? { absolute: String(seoOverride.title).trim() }
      : dbTitle
        ? buildBrandedAbsoluteTitle(dbTitle, { brand: BRAND, max: 60 })
        : carMeta?.title
          ? { absolute: withBrandTitleSuffix(carMeta.title) }
          : buildBrandedAbsoluteTitle(`${vehicle.displayName} Accessories`, {
              brand: BRAND,
              max: 60,
            });
    const title = titleMeta.absolute;
    // Prefer Car Catalog Description (merged in loadVehicleBySlug) over legacy Vehicle.metaDescription.
    const catalogDesc = stripLegacyBrand(
      String(vehicle.description || "").trim() || String(vehicle.metaDescription || "").trim(),
      { replacement: BRAND }
    );
    const description =
      (seoOverride?.meta || "").trim() ||
      catalogDesc ||
      (carMeta?.description || "").trim() ||
      vehicleMetaDescription(vehicle, catalogDesc);
    const listingSeo = listingMetadata(`/cars/${vehicle.slug}`, listing);
    const canonical =
      listing.page <= 1
        ? `${SITE}/cars/${vehicle.slug}`
        : listingSeo.alternates?.canonical || `${SITE}/cars/${vehicle.slug}`;
    const ogImage = mediaImageUrl(vehicle.image);

    return {
      title: titleMeta,
      description,
      robots: listingSeo.robots,
      alternates: {
        ...listingSeo.alternates,
        canonical,
      },
      openGraph: {
        title,
        description,
        url: canonical,
        images: ogImage
          ? [{ url: ogImage, alt: vehicle.displayName }]
          : [{ url: "/og/default-1200x630.jpg", width: 1200, height: 630, alt: `${vehicle.displayName} accessories` }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ogImage ? [ogImage] : ["/og/default-1200x630.jpg"],
      },
    };
  } catch (err) {
    if (String(err?.digest || "").startsWith("NEXT_")) throw err;
    return { title: "Car Accessories" };
  }
});

export default async function VehicleSlugPage({ params, searchParams }) {
  const { slug } = await params;
  const slugStr = String(slug || "").trim();
  if (!slugStr) notFound();
  const listing = parseListingSearchParams(await searchParams);
  const deletedCar = resolveDeletedPath(`/cars/${slugStr}`);
  if (deletedCar) permanentRedirect(listingHref(deletedCar, listing));

  let vehicle = null;
  try {
    await dbConnect();
    vehicle = await loadVehicleBySlug(slugStr);
  } catch (err) {
    console.error("[vehicle page] load failed:", err?.message || err);
    throw err;
  }
  if (!vehicle) {
    // Inactive / removed generation — closest brand page or exterior hub.
    permanentRedirect("/categories/exterior");
  }
  if (vehicle.slug && String(vehicle.slug) !== slugStr) {
    permanentRedirect(listingHref(`/cars/${vehicle.slug}`, listing));
  }

  let rawProducts = [];
  try {
    rawProducts = await loadProductsForVehicle(vehicle);
  } catch (err) {
    console.error("[vehicle page] products failed:", err?.message || err);
  }
  const allProducts = rawProducts
    .map((row) => {
      try {
        return serializeVehicleProduct(row);
      } catch (err) {
        console.error("[serializeVehicleProduct]", row?.slug, err);
        return null;
      }
    })
    .filter(Boolean);

  const sorted = sortProductsClient(allProducts, listing.sort);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / listing.pageSize) || 1);
  if (listing.page > totalPages) notFound();
  const page = listing.page;
  const products = sorted.slice((page - 1) * listing.pageSize, page * listing.pageSize);
  const listingForUi = { ...listing, page };
  if (total === 0) notFound();

  const yearLabel =
    vehicle.yearTo == null || Number(vehicle.yearTo) >= new Date().getFullYear()
      ? `${vehicle.yearFrom}–Present`
      : `${vehicle.yearFrom}–${vehicle.yearTo}`;

  const crumbs = [
    { name: "Home", url: "/" },
    { name: "Shop by Car", url: "/cars" },
    { name: vehicle.displayName, url: `/cars/${vehicle.slug}` },
  ];
  const breadcrumbLd = breadcrumbJsonLd(crumbs);
  const catalogDesc = stripLegacyBrand(
    String(vehicle.description || "").trim() || String(vehicle.metaDescription || "").trim(),
    { replacement: BRAND_NAME }
  );
  const pageDescription = vehicleMetaDescription(vehicle, catalogDesc);

  const priceExtent = await getProductPriceExtent(buildVehiclePageProductFilter(vehicle));
  const priceLine = priceRangeSentence(`${vehicle.displayName} accessories`, priceExtent);
  const collectionLd = collectionPageJsonLd({
    offers: aggregateOfferLd(priceExtent),
    name: `${vehicle.displayName} Accessories`,
    description: pageDescription,
    url: `/cars/${vehicle.slug}`,
    products,
    numberOfItems: total,
    breadcrumb: breadcrumbLd,
  });

  const hasSplitterProducts = allProducts.some((p) =>
    /splitter|side.?skirt|side skirt/i.test(
      `${p?.name || ""} ${p?.slug || ""} ${Array.isArray(p?.tags) ? p.tags.join(" ") : ""}`
    )
  );
  const faqExtras = VEHICLE_FAQ_OVERRIDES[vehicle.slug] || [];
  const faqItems = [
    ...buildVehicleKeywordFaqs(vehicle, { hasSplitterProducts }),
    ...faqExtras,
  ];
  const faqLd = faqPageJsonLd(faqItems);
  const akaLine = alsoKnownAsLine(vehicle, { max: 4 });

  const auditHtml = VEHICLE_DESCRIPTION_HTML[vehicle.slug] || "";
  const heroDesc =
    catalogDesc ||
    `Upgrade your ${vehicle.displayName} with premium accessories in Pakistan — body kits, LED lights, interior styling & carbon fiber. Cash on Delivery nationwide.`;
  const rawHeroHtml = auditHtml
    ? sanitizeCategoryHtml(auditHtml)
    : /<[a-z][\s\S]*>/i.test(heroDesc)
      ? sanitizeCategoryHtml(heroDesc)
      : "";
  // Hero: keep a short blurb only (first paragraph / ~320 chars) — price lists stay in the grid below.
  const heroHtml = shortenVehicleHeroHtml(rawHeroHtml);
  const heroPlainShort = !heroHtml
    ? shortenVehicleHeroPlain(heroDesc)
    : "";

  const popularAccessories = Array.isArray(vehicle.popularAccessories)
    ? vehicle.popularAccessories.map((s) => String(s || "").trim()).filter(Boolean)
    : [];
  // Subtitle must reflect real catalogue — not Popular chips alone.
  const hasBodyKitProduct = allProducts.some((p) =>
    /body[\s-]?kit/i.test(`${p?.name || ""} ${p?.slug || ""}`)
  );
  const heroOfferLine = hasBodyKitProduct ? "Accessories & Body Kits" : "Accessories";
  const nickname = String(vehicle.nickname || "").trim();
  const heroImage = mediaImageUrl(vehicle.image);

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
      <RememberMyCar slug={vehicle.slug} label={vehicle.displayName || `${vehicle.make} ${vehicle.model}`} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionLd) }}
      />
      {faqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(faqLd) }}
        />
      ) : null}

      <section
        className="vehicle-page-hero"
        style={{
          background: "linear-gradient(135deg, #141414 0%, #1f1f1f 55%, #2a1515 100%)",
          borderBottom: "1px solid #2a2a2a",
        }}
      >
        <div
          className="store-container vehicle-hero-inner"
          style={{
            display: "grid",
            gap: 24,
            alignItems: "center",
            padding: "28px 16px 32px",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 24,
              alignItems: "center",
              gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
            }}
            className="vehicle-hero-grid"
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#F87171",
                }}
              >
                {vehicle.make} · {yearLabel}
              </p>
              {/* Desktop title only — single page <h1> lives in vehicle-mobile-heading (mobile-first SEO). */}
              <p
                className="vehicle-hero-title"
                style={{
                  margin: "10px 0 0",
                  fontFamily: "var(--font-heading), Rajdhani, sans-serif",
                  fontSize: "clamp(22px, 3.2vw, 34px)",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: "#FFFFFF",
                }}
              >
                {vehicle.displayName}
              </p>
              {priceLine ? (
                <p className="vehicle-hero-price" style={{ margin: "6px 0 0", fontSize: 14, color: "#E5E7EB" }}>
                  {priceLine}
                </p>
              ) : null}
              {nickname &&
              !String(vehicle.displayName || "")
                .toLowerCase()
                .includes(nickname.toLowerCase()) ? (
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#F87171",
                  }}
                >
                  {nickname}
                </p>
              ) : null}
              {akaLine ? (
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: "#9CA3AF",
                  }}
                >
                  {akaLine}
                </p>
              ) : null}
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#E5E7EB",
                }}
              >
                {heroOfferLine}
              </p>
              {heroHtml ? (
                <div
                  className="vehicle-hero-desc prose prose-invert max-w-none"
                  style={{
                    margin: "12px 0 0",
                    maxWidth: 560,
                    fontSize: 14,
                    lineHeight: 1.65,
                    color: "#D1D5DB",
                  }}
                  dangerouslySetInnerHTML={{
                    // Audit HTML wins alone — never prepend Mongo description (avoids DB+code dupes).
                    __html: heroHtml,
                  }}
                />
              ) : (
                <p
                  style={{
                    margin: "12px 0 0",
                    maxWidth: 480,
                    fontSize: 14,
                    lineHeight: 1.65,
                    color: "#D1D5DB",
                    whiteSpace: "pre-line",
                  }}
                >
                  {heroPlainShort || heroDesc}
                </p>
              )}
              {popularAccessories.length ? (
                <p style={{ margin: "10px 0 0", fontSize: 13, color: "#9CA3AF" }}>
                  Popular: {popularAccessories.slice(0, 8).join(" · ")}
                </p>
              ) : null}
              <div className="vehicle-hero-actions" style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 10 }}>
                <Link
                  href="#compatible-products"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: 8,
                    background: "#C41E1E",
                    color: "#FFFFFF",
                    fontSize: 13,
                    fontWeight: 700,
                    padding: "10px 18px",
                    textDecoration: "none",
                  }}
                >
                  Shop compatible parts
                </Link>
                <Link
                  href="/categories"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.45)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#FFFFFF",
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "10px 18px",
                    textDecoration: "none",
                  }}
                >
                  Browse categories
                </Link>
              </div>
            </div>

            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 440,
                marginLeft: "auto",
                marginRight: "auto",
                aspectRatio: "16 / 10",
                overflow: "hidden",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#0f0f0f",
                boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
              }}
            >
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroImage}
                  alt={`${vehicle.displayName} accessories in Pakistan`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    height: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 48,
                    color: "rgba(255,255,255,0.35)",
                  }}
                >
                  🚗
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Compact title when desktop hero is hidden on small screens */}
      <div className="vehicle-mobile-heading store-container">
        <p className="vehicle-mobile-heading__eyebrow">
          {vehicle.make} · {yearLabel}
        </p>
        <h1 className="vehicle-mobile-heading__title">{vehicle.displayName}</h1>
        {akaLine ? (
          <p className="vehicle-mobile-heading__aka" style={{ margin: "6px 0 0", fontSize: 13, color: "#6B7280" }}>
            {akaLine}
          </p>
        ) : null}
        <p className="vehicle-mobile-heading__sub">{heroOfferLine}</p>
        {priceLine ? (
          <p className="vehicle-price-line" style={{ margin: "6px 0 0", fontSize: 13, color: "#555" }}>
            {priceLine}
          </p>
        ) : null}
      </div>

      <section id="compatible-products" className="store-container py-8 md:py-10">
        <ProductListingSection
          layout="embedded"
          pathname={`/cars/${vehicle.slug}`}
          listing={listingForUi}
          products={products}
          total={total}
          totalPages={totalPages}
          title="Compatible products"
          categoryName={`${vehicle.displayName} accessories`}
          emptyMessage="Products for this car will show once you assign them in admin (compatible vehicles / car catalog). Universal products are not listed here unless you add them to this car."
        />
      </section>
      <InternalBlogLinks
        title="From the blog"
        links={blogsForCar(vehicle.slug, vehicle.displayName)}
      />
    </div>
  );
}

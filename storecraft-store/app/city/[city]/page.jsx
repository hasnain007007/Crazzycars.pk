import Link from "next/link";
import { notFound } from "next/navigation";
import { dbConnect } from "@/lib/db";
import Category from "@/lib/models/Category.model";
import Product from "@/lib/models/Product.model";
import Settings from "@/lib/models/Settings.model";
import {
  CITY_LANDING_SLUGS,
  cityPath,
  mergeCityLanding,
} from "@/lib/cityLandingPages";
import { breadcrumbJsonLd, organizationJsonLd } from "@/lib/seo/jsonld";
import { faqPageJsonLd } from "@/lib/seo/keywordStrategyFaqs";
import { FaqSection } from "@/components/store/FaqSection";
import { sanitizeCategoryHtml } from "@/lib/sanitizeHtml";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { withSafeMetadata } from "@/lib/safeMetadata";
import { WEBSITE_PRODUCT_FILTER } from "@/lib/productVisibility";
import { effectiveUnitPrice } from "@/lib/storePricing";
import { BRAND_NAME, withBrandTitleSuffix } from "@/lib/brand";

export const revalidate = 3600;

const SITE = "https://crazzycars.pk";

function formatPkr(n) {
  const v = Math.round(Number(n) || 0);
  return `Rs. ${v.toLocaleString("en-PK")}`;
}

async function loadCityPage(citySlug) {
  const key = String(citySlug || "").trim().toLowerCase();
  if (!CITY_LANDING_SLUGS.includes(key)) return null;
  await dbConnect();
  const settings = await Settings.findOne({ singletonKey: "default" })
    .select("cityPages general contactPage")
    .lean();
  const override = settings?.cityPages?.[key] || {};
  const city = mergeCityLanding(key, override);
  if (!city) return null;

  const catSlugs = city.topCategorySlugs || [];
  const categories = catSlugs.length
    ? await Category.find({ slug: { $in: catSlugs }, status: "active" })
        .select("name slug shortDescription")
        .lean()
    : [];
  const catBySlug = new Map(categories.map((c) => [c.slug, c]));
  const orderedCats = catSlugs.map((s) => catBySlug.get(s)).filter(Boolean);

  const catIds = orderedCats.map((c) => c._id);
  let products = [];
  if (catIds.length) {
    const rows = await Product.find({
      ...WEBSITE_PRODUCT_FILTER,
      categories: { $in: catIds },
    })
      .select("name slug media pricing categories")
      .sort({ featured: -1, createdAt: -1 })
      .limit(12)
      .lean();
    products = rows.map((p) => {
      const img = (p.media?.images || []).find((i) => i.isMain) || p.media?.images?.[0];
      return {
        name: p.name,
        slug: p.slug,
        href: `/${p.slug}`,
        image: img?.url || "",
        price: effectiveUnitPrice(p) || Number(p.pricing?.regularPrice) || 0,
      };
    });
  }

  return { city, categories: orderedCats, products, settings };
}

export function generateStaticParams() {
  return CITY_LANDING_SLUGS.map((city) => ({ city }));
}

export const generateMetadata = withSafeMetadata(async function cityMeta({ params }) {
  const { city: cityParam } = await params;
  const data = await loadCityPage(cityParam);
  if (!data) return { title: "Not Found", robots: { index: false, follow: false } };
  const { city } = data;
  const canonical = `${SITE}${cityPath(city.slug)}`;
  return {
    title: { absolute: withBrandTitleSuffix(city.metaTitle) },
    description: city.metaDescription,
    alternates: { canonical },
    openGraph: {
      title: city.metaTitle,
      description: city.metaDescription,
      url: canonical,
      images: [{ url: "/og/default-1200x630.jpg", width: 1200, height: 630 }],
    },
  };
});

export default async function CityAccessoriesPage({ params }) {
  const { city: cityParam } = await params;
  const data = await loadCityPage(cityParam);
  if (!data) notFound();
  const { city, categories, products, settings } = data;

  const crumbs = [
    { name: "Home", url: "/" },
    { name: `Car accessories ${city.name}`, url: cityPath(city.slug) },
  ];
  const breadcrumbLd = breadcrumbJsonLd(crumbs);
  const faqLd = faqPageJsonLd(city.faq);
  const introHtml = sanitizeCategoryHtml(city.introHtml);

  let localBusinessLd = null;
  if (city.emitLocalBusiness) {
    const g = settings?.general || {};
    localBusinessLd = organizationJsonLd({
      name: BRAND_NAME,
      telephone: g.phone || g.whatsapp,
      email: g.email,
      whatsapp: g.whatsapp || g.phone,
      streetAddress: g.streetAddress || g.address,
      addressLocality: g.addressLocality || "Gujranwala",
      addressRegion: g.addressRegion || "Punjab",
      postalCode: g.postalCode,
      addressCountry: g.addressCountry || "PK",
      latitude: g.latitude,
      longitude: g.longitude,
      mapUrl: g.mapUrl,
      priceRange: g.priceRange,
      sameAs: g.sameAs,
      openingHours: g.openingHours,
    });
    // Gujranwala landing only — sitewide AutoPartsStore stays in root layout.
    if (localBusinessLd) {
      localBusinessLd["@type"] = ["LocalBusiness", "AutoPartsStore"];
      localBusinessLd["@id"] = `${SITE}${cityPath(city.slug)}#localbusiness`;
    }
  }

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }}
      />
      {faqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(faqLd) }}
        />
      ) : null}
      {localBusinessLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(localBusinessLd) }}
        />
      ) : null}

      <section
        style={{
          background: "linear-gradient(135deg, #141414 0%, #1f1f1f 55%, #2a1515 100%)",
          color: "#fff",
          padding: "36px 16px 40px",
        }}
      >
        <div className="store-container" style={{ maxWidth: 920 }}>
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
            {city.name} · {city.province}
          </p>
          <h1
            style={{
              margin: "10px 0 0",
              fontFamily: "var(--font-heading), Rajdhani, sans-serif",
              fontSize: "clamp(22px, 3.4vw, 34px)",
              fontWeight: 700,
              lineHeight: 1.25,
            }}
          >
            {city.h1}
          </h1>
          <p style={{ margin: "14px 0 0", fontSize: 15, color: "#E5E7EB" }}>
            <strong>Delivery:</strong> {city.deliveryDays}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "#D1D5DB" }}>{city.deliveryNote}</p>
        </div>
      </section>

      <div
        className="store-container prose prose-neutral max-w-none"
        style={{ padding: "28px 16px 8px", maxWidth: 920 }}
        dangerouslySetInnerHTML={{ __html: introHtml }}
      />

      {categories.length ? (
        <section className="store-container" style={{ padding: "20px 16px" }}>
          <h2 style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 700 }}>Top categories in {city.name}</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/categories/${c.slug}`}
                style={{
                  display: "block",
                  padding: "14px 16px",
                  borderRadius: 10,
                  border: "1px solid #E5E5E5",
                  textDecoration: "none",
                  color: "#111",
                  fontWeight: 650,
                }}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {products.length ? (
        <section className="store-container" style={{ padding: "12px 16px 28px" }}>
          <h2 style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 700 }}>Popular right now</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 14,
            }}
          >
            {products.map((p) => (
              <Link
                key={p.slug}
                href={p.href}
                style={{ textDecoration: "none", color: "#111" }}
              >
                <div
                  style={{
                    border: "1px solid #E5E5E5",
                    borderRadius: 10,
                    overflow: "hidden",
                    background: "#fff",
                  }}
                >
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image}
                      alt={p.name}
                      width={320}
                      height={320}
                      style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ aspectRatio: "1", background: "#f3f4f6" }} />
                  )}
                  <div style={{ padding: "10px 12px 12px" }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{p.name}</p>
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "#C41E1E", fontWeight: 700 }}>
                      {formatPkr(p.price)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <FaqSection title={`FAQs — car accessories in ${city.name}`} items={city.faq} />

      <p className="store-container" style={{ padding: "0 16px 40px", fontSize: 14, color: "#555" }}>
        Also shopping from another city? See{" "}
        {CITY_LANDING_SLUGS.filter((s) => s !== city.slug).map((s, i) => (
          <span key={s}>
            {i > 0 ? " · " : null}
            <Link href={cityPath(s)} style={{ color: "#C41E1E", fontWeight: 600 }}>
              {mergeCityLanding(s)?.name || s}
            </Link>
          </span>
        ))}
        .
      </p>
    </div>
  );
}

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
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { faqPageJsonLd } from "@/lib/seo/keywordStrategyFaqs";
import { FaqSection } from "@/components/store/FaqSection";
import { sanitizeCategoryHtml } from "@/lib/sanitizeHtml";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { withSafeMetadata } from "@/lib/safeMetadata";
import { STOREFRONT_PRODUCT_FILTER } from "@/lib/productVisibility";
import { effectiveUnitPrice } from "@/lib/storePricing";
import { BRAND_NAME } from "@/lib/brand";

export const revalidate = 300;

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
    .select("cityPages general contactPage localBusiness")
    .lean();
  const override = settings?.cityPages?.[key] || {};
  const city = mergeCityLanding(key, override);
  if (!city) return null;

  // Enrich Gujranwala FAQ with street/directions when admin filled address settings.
  const g = settings?.general || settings?.localBusiness || {};
  const street = String(g.streetAddress || "").trim();
  const mapUrl = String(g.mapUrl || "").trim();
  if (key === "gujranwala" && Array.isArray(city.faq)) {
    city.faq = city.faq.map((item) => {
      if (!/physical store/i.test(item.question || "")) return item;
      if (!street && !mapUrl) return item;
      const locality = String(g.addressLocality || "Gujranwala").trim();
      const region = String(g.addressRegion || "Punjab").trim();
      const line = [street, locality, region].filter(Boolean).join(", ");
      const dir = mapUrl ? ` Directions: ${mapUrl}` : "";
      return {
        ...item,
        answer: `Yes — CrazzyCars.pk operates from ${line}.${dir} Message WhatsApp 0328 4010007 for the current pickup/visit window before you come.`,
      };
    });
  }

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
      ...STOREFRONT_PRODUCT_FILTER,
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
    title: { absolute: city.metaTitle },
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

  // Do not duplicate AutoPartsStore / LocalBusiness here — root layout emits #org.
  // WebPage about points at the single store entity.
  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE}${cityPath(city.slug)}#webpage`,
    url: `${SITE}${cityPath(city.slug)}`,
    name: city.h1 || city.metaTitle,
    description: city.metaDescription,
    isPartOf: { "@type": "WebSite", name: BRAND_NAME, url: SITE },
    about: { "@id": `${SITE}/#org` },
    provider: { "@id": `${SITE}/#org` },
  };

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(webPageLd) }}
      />

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

      {city.slug === "gujranwala" &&
      (() => {
        const g = settings?.general || settings?.localBusiness || {};
        const street = String(g.streetAddress || "").trim();
        const mapUrl = String(g.mapUrl || "").trim();
        const mapEmbedUrl = String(g.mapEmbedUrl || "").trim();
        const lat = Number(g.latitude);
        const lng = Number(g.longitude);
        const hasGeo =
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          lat >= 23 &&
          lat <= 37 &&
          lng >= 60 &&
          lng <= 78;
        if (!street && !mapUrl && !mapEmbedUrl) return null;
        const locality = String(g.addressLocality || "Gujranwala").trim();
        const region = String(g.addressRegion || "Punjab").trim();
        const oneLine = [street, locality, region].filter(Boolean).join(", ");
        const directions = hasGeo
          ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
          : mapUrl;
        return (
          <section className="store-container" style={{ padding: "8px 16px 24px", maxWidth: 920 }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 700 }}>Visit / Directions</h2>
            <p style={{ margin: 0, fontSize: 15, color: "#374151" }}>{oneLine}</p>
            <p style={{ margin: "8px 0 0", fontSize: 14, color: "#6B7280" }}>
              Hours: Mon–Sat 09:00–21:00 · Sunday closed
            </p>
            {directions ? (
              <p style={{ margin: "10px 0 0" }}>
                <a href={directions} target="_blank" rel="noopener noreferrer" style={{ color: "#C41E1E", fontWeight: 600 }}>
                  Get directions
                </a>
              </p>
            ) : null}
            {mapEmbedUrl ? (
              <iframe
                title={`${BRAND_NAME} location map`}
                src={mapEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                style={{ marginTop: 12, width: "100%", height: 240, border: 0, borderRadius: 8 }}
                allowFullScreen
              />
            ) : null}
          </section>
        );
      })()}

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

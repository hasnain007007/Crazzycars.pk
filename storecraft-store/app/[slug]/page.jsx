import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { ProductDetailMedico } from "@/components/store/ProductDetailMedico";
import PageView from "@/components/store/PageView";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import Page from "@/lib/models/Page.model";
import { loadStoreCategoryDetail } from "@/lib/storeCategoryData";
import { resolveCategoryHandle } from "@/lib/resolveCategoryHandle";
import { resolveLegacyDestination } from "@/lib/categoryHandleAliases";
import { findExistingVehicleSlug } from "@/lib/vehiclePageData";
import { serializeStoreProductDetail, serializeStoreProductSummary } from "@/lib/storeSerialize";
import { getSiteUrl } from "@/lib/siteUrl";
import {
  findActiveProductBySlugParam,
  findUnavailableProductBySlugParam,
} from "@/lib/resolveProductSlug";
import { resolveFlatProductFallback } from "@/lib/productFallbackRedirects.mjs";
import { resolveDeletedFlatSlug } from "@/lib/deletedUrlRedirects.mjs";
import { resolveInactiveProductRedirect } from "@/lib/inactiveProductRedirect";
import { resolveProductImageUrls, resolvePrimaryProductImageUrl } from "@/lib/productImages";
import {
  productJsonLd as buildProductJsonLd,
  breadcrumbJsonLd as buildBreadcrumbJsonLd,
  isCompleteProductJsonLd,
  isGenuineReview,
  customerReviewsForSchema,
} from "@/lib/seo/jsonld";
import { buildBrandedAbsoluteTitle } from "@/lib/seo/brandedTitle";
import { withSafeMetadata } from "@/lib/safeMetadata";
import { safeJsonLd } from "@/lib/safeJsonLd";
import Review from "@/lib/models/Review.model";
import {
  buildProductKeywordFaqs,
  faqPageJsonLd,
} from "@/lib/seo/keywordStrategyFaqs";
import { resolveProductCarLinks } from "@/lib/seo/resolveProductCarLinks";
import { BRAND_NAME, withBrandTitleSuffix } from "@/lib/brand";
import { unitsSoldRecently } from "@/lib/productSalesCount";
import { toPlainText } from "@/lib/sanitizeHtml";
import {
  getPageSeoOverride,
  PRODUCT_CONTENT_OVERRIDES,
  PRODUCT_FAQ_OVERRIDES,
  PRODUCT_H1_OVERRIDES,
} from "@/lib/seo/gscAudit2026-10.mjs";

const BRAND = BRAND_NAME;

/**
 * ISR for product / CMS pages. Category slugs 308 to /categories/:slug.
 * 300s: catalog HTML can be edge-cached; admin revalidate webhook still purges.
 */
export const revalidate = 300;

const BASE_URL = getSiteUrl();

function stripHtml(s) {
  return String(s || "").replace(/<[^>]*>/g, "");
}

function buildProductSeoTitle({ name, metaTitle, slug }) {
  // Prefer admin/product SEO title when set — code PAGE_SEO_OVERRIDES must not
  // hide a freshly saved seo.metaTitle from Google.
  const fromProduct = String(metaTitle || "").trim();
  if (fromProduct) return withBrandTitleSuffix(fromProduct);

  const override = getPageSeoOverride(`/${String(slug || "").trim()}`);
  if (override?.title) return withBrandTitleSuffix(override.title);

  return withBrandTitleSuffix(String(name || "").trim());
}

function querySuffix(searchParams) {
  if (!searchParams) return "";
  const params = new URLSearchParams();
  const entries =
    typeof searchParams.entries === "function"
      ? [...searchParams.entries()]
      : Object.entries(searchParams);
  for (const [key, value] of entries) {
    if (value == null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item != null && item !== "") params.append(key, String(item));
      }
    } else {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function redirectWithQuery(to, searchParams) {
  const suffix = querySuffix(searchParams);
  permanentRedirect(suffix && !String(to).includes("?") ? `${to}${suffix}` : to);
}

function relatedFromRecommended(product) {
  const self = String(product?._id || product?.id || "");
  const recs = Array.isArray(product?.recommendedProducts) ? product.recommendedProducts : [];
  return recs.filter((row) => {
    if (!row || typeof row !== "object" || !row.slug) return false;
    if (String(row.status || "active").toLowerCase() !== "active") return false;
    const id = String(row._id || row.id || "");
    return !self || id !== self;
  });
}

async function loadRelatedProducts(product) {
  try {
    const curated = relatedFromRecommended(product);
    if (curated.length) {
      return JSON.parse(JSON.stringify(curated.map(serializeStoreProductSummary)));
    }

    const categoryIds = (product?.categories || [])
      .map((c) => {
        if (c == null) return null;
        if (typeof c === "object" && c._id) return c._id;
        return c;
      })
      .filter(Boolean);

    const filter = {
      status: "active",
      securityHold: { $ne: true },
      _id: { $ne: product._id },
    };
    if (categoryIds.length) {
      filter.categories = { $in: categoryIds };
    }

    const rows = await Product.find(filter)
      .select(
        "name slug media pricing inventory featured newArrival categories rating averageRating ratingAverage reviewCount totalReviews numReviews shortDescription articleNo createdAt tags"
      )
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    // Ensure RSC → client props are plain JSON (no Date / ObjectId surprises).
    return JSON.parse(JSON.stringify(rows.map(serializeStoreProductSummary)));
  } catch (err) {
    console.error("[loadRelatedProducts]", err?.message || err);
    return [];
  }
}

/**
 * One Mongo load per request — shared by generateMetadata + page via React.cache.
 */
const loadContent = cache(async (slug) => {
  await dbConnect();
  const slugStr = String(slug || "").trim();

  const deletedDest = resolveDeletedFlatSlug(slugStr);
  if (deletedDest) {
    return { type: "redirect", to: deletedDest };
  }

  // Exact slug first (fast path).
  let product = await Product.findOne({
    slug: slugStr,
    status: "active",
    securityHold: { $ne: true },
  })
    .select(
      "name slug articleNo media pricing inventory status simpleVariations variationCombinations featured newArrival categories variationTypes variationOptions variants shortDescription longDescription features addOns recommendedProducts onCarPreviews customSizing specifications seo metaTitle metaDescription averageRating ratingAverage rating reviewCount totalReviews numReviews isUniversal isBulky advancePercentRequired codEnabled compatibleVehicles compatibleCars vehicleCompatibility"
    )
    .populate("categories", "name slug")
    .populate("compatibleVehicles", "slug displayName make model yearFrom yearTo")
    .populate({
      path: "recommendedProducts",
      match: { status: "active", securityHold: { $ne: true } },
      select:
        "name slug status media pricing inventory featured newArrival categories articleNo simpleVariations variationCombinations tags shortDescription",
    })
    .lean();

  // Meta / Shopify-era handles often omit the `-crazzycars-pk` suffix.
  if (!product) {
    const legacy = await findActiveProductBySlugParam(slugStr);
    if (legacy?.slug && legacy.slug !== slugStr) {
      return { type: "redirect", to: `/${legacy.slug}` };
    }
    if (legacy?.slug) {
      product = await Product.findOne({
        slug: legacy.slug,
        status: "active",
        securityHold: { $ne: true },
      })
        .select(
          "name slug articleNo media pricing inventory status simpleVariations variationCombinations featured newArrival categories variationTypes variationOptions variants shortDescription longDescription features addOns recommendedProducts onCarPreviews customSizing specifications seo metaTitle metaDescription averageRating ratingAverage rating reviewCount totalReviews numReviews isUniversal isBulky advancePercentRequired codEnabled compatibleVehicles compatibleCars vehicleCompatibility"
        )
        .populate("categories", "name slug")
        .populate("compatibleVehicles", "slug displayName make model yearFrom yearTo")
        .populate({
          path: "recommendedProducts",
          match: { status: "active", securityHold: { $ne: true } },
          select:
            "name slug status media pricing inventory featured newArrival categories articleNo simpleVariations variationCombinations tags shortDescription",
        })
        .lean();
    }
  }

  if (product) {
    if (product.slug && product.slug !== slugStr) {
      return { type: "redirect", to: `/${product.slug}` };
    }
    const relatedProducts = await loadRelatedProducts(product);
    let carLinks = [];
    try {
      carLinks = await resolveProductCarLinks(product);
    } catch (e) {
      console.error("resolveProductCarLinks:", e);
    }
    return {
      type: "product",
      data: serializeStoreProductDetail(product),
      relatedProducts,
      carLinks,
    };
  }

  const page = await Page.findOne({
    slug: slugStr,
    status: "published",
  }).lean();

  if (page) {
    return {
      type: "page",
      data: JSON.parse(JSON.stringify(page)),
    };
  }

  const catDetail = await loadStoreCategoryDetail(slugStr);
  if (catDetail) {
    const catSlug = catDetail.category?.slug || slugStr;
    return { type: "redirect", to: `/categories/${catSlug}` };
  }

  const aliasedCategory = await resolveCategoryHandle(slugStr);
  if (aliasedCategory) {
    return { type: "redirect", to: `/categories/${aliasedCategory}` };
  }

  const productFallback = resolveFlatProductFallback(slugStr);
  if (productFallback) {
    return { type: "redirect", to: productFallback };
  }

  // Soft-deleted / inactive catalogue row → category (or car / home), never soft-404.
  try {
    const gone = await findUnavailableProductBySlugParam(slugStr);
    if (gone?._id) {
      const full = await Product.findOne({ _id: gone._id, status: "inactive" })
        .select("name slug categories compatibleVehicles redirectTo primaryCategorySlug primaryCarSlug carSlug seo")
        .populate("categories", "name slug")
        .populate("compatibleVehicles", "slug")
        .lean();
      if (full) {
        return { type: "redirect", to: resolveInactiveProductRedirect(full) };
      }
    }
  } catch (err) {
    console.error("[loadContent] inactive redirect:", err?.message || err);
  }

  const vehicleSlug = await findExistingVehicleSlug(slugStr);
  if (vehicleSlug) {
    return { type: "redirect", to: `/cars/${vehicleSlug}` };
  }

  const legacy = resolveLegacyDestination(slugStr);
  if (legacy && legacy !== `/${slugStr}`) {
    return { type: "redirect", to: legacy };
  }

  return null;
});

export const generateMetadata = withSafeMetadata(async function buildSlugMetadata({
  params,
  searchParams,
}) {
  const { slug } = await params;
  const slugStr = String(slug || "").trim();
  const content = await loadContent(slugStr);
  if (!content) notFound();
  if (content.type === "redirect") {
    redirectWithQuery(content.to, await searchParams);
  }
  const canonical = `${BASE_URL}/${content.type === "product" ? content.data.slug : slugStr}`;

  if (content.type === "product") {
    const p = content.data;
    const slugKey = p.slug || slugStr;
    const title = buildProductSeoTitle({
      name: p.name,
      metaTitle: p.seo?.metaTitle || p.metaTitle,
      slug: slugKey,
    });
    const seoOverride = getPageSeoOverride(`/${slugKey}`);
    const contentOverride = PRODUCT_CONTENT_OVERRIDES[slugKey] || null;
    const displayName =
      PRODUCT_H1_OVERRIDES[slugKey] ||
      String(p.name || "").replace(/\bButto\b/g, "Button");
    // Prefer product seo.metaDescription; override only fills gaps.
    const description =
      (p.seo?.metaDescription || p.metaDescription || "").trim().replace(/\bButto\b/g, "Button") ||
      (seoOverride?.meta || "").trim() ||
      stripHtml(contentOverride?.shortDescription || p.shortDescription || "").slice(0, 160) ||
      stripHtml(contentOverride?.descriptionHtml || p.longDescription || "").slice(0, 160) ||
      `Buy ${displayName} at ${BRAND}. Cash on Delivery nationwide.`;
    const keywords = Array.isArray(p.seo?.metaKeywords)
      ? p.seo.metaKeywords.map((k) => String(k || "").trim()).filter(Boolean)
      : [];
    const mainImg =
      resolvePrimaryProductImageUrl(p) ||
      p.media?.images?.find((i) => i?.isMain)?.url ||
      p.media?.images?.[0]?.url;
    const ogAlt = contentOverride?.imageAlt || displayName;

    return {
      title: { absolute: title },
      description,
      ...(keywords.length ? { keywords } : {}),
      alternates: { canonical },
      openGraph: {
        title: title,
        description,
        // Next.js metadata only allows website|article|profile|… — not OG "product".
        // Product schema stays in JSON-LD (toProductLd).
        type: "website",
        url: canonical,
        images: mainImg ? [{ url: mainImg, width: 800, height: 800, alt: ogAlt }] : [],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: mainImg ? [mainImg] : [],
      },
    };
  }

  const page = content.data;
  const pageTitleMeta = buildBrandedAbsoluteTitle(
    (page.seo?.metaTitle || "").trim() || page.title,
    { brand: BRAND }
  );
  const pageTitle = pageTitleMeta.absolute;
  return {
    title: pageTitleMeta,
    description: page.seo?.metaDescription || "",
    alternates: {
      canonical: page.seo?.canonical || `${BASE_URL}/${slugStr}`,
    },
    openGraph: {
      title: pageTitle,
      description: page.seo?.metaDescription || "",
      type: "website",
      url: `${BASE_URL}/${slugStr}`,
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: page.seo?.metaDescription || "",
    },
  };
});

function toProductLd(product, reviews = []) {
  const images = resolveProductImageUrls(product);
  const price = Number(
    product.isOnSale && product.salePrice
      ? product.salePrice
      : product.price || product.regularPrice || product.pricing?.salePrice || product.pricing?.regularPrice || 0
  );
  const stock = Number(product.inventory?.quantity ?? product.stock ?? (product.inStock === false ? 0 : 1));
  const genuine = customerReviewsForSchema(reviews);
  const slugKey = String(product?.slug || "").trim();
  const contentOverride = PRODUCT_CONTENT_OVERRIDES[slugKey] || null;
  const displayName =
    PRODUCT_H1_OVERRIDES[slugKey] ||
    String(product.name || "").replace(/\bButto\b/g, "Button");
  const descHtml =
    contentOverride?.descriptionHtml ||
    product.descriptionHtml ||
    product.longDescription ||
    "";
  const shortDesc =
    contentOverride?.shortDescription || product.shortDescription || "";
  const seoMeta = getPageSeoOverride(`/${slugKey}`)?.meta || "";
  return buildProductJsonLd({
    name: displayName,
    slug: product.slug,
    urlPath: `/${product.slug}`,
    images,
    media: { images: images.map((url) => ({ url, isMain: url === images[0] })) },
    longDescription: descHtml,
    descriptionHtml: descHtml,
    shortDescription: toPlainText(shortDesc),
    metaDescription:
      seoMeta ||
      String(product.metaDescription || product.seo?.metaDescription || "").replace(
        /\bButto\b/g,
        "Button"
      ),
    specifications: product.specifications,
    features: contentOverride?.features || product.features,
    sku: product.articleNo || product.inventory?.sku,
    articleNo: product.articleNo,
    ean: product.ean,
    partNumber: product.partNumber,
    mpn: product.partNumber || product.articleNo,
    brand: BRAND,
    vendor: product.vendor,
    condition: product.condition || "new",
    categories: product.categories,
    salePrice: price,
    price,
    stock,
    isBulky: product.isBulky === true,
    trackInventory: product.trackInventory ?? product.inventory?.trackInventory,
    allowBackorder: product.allowBackorder ?? product.inventory?.allowBackorder,
    compatibleCars: product.compatibleCars,
    vehicleCompatibility: product.vehicleCompatibility,
    isUniversal: product.isUniversal,
    reviews: genuine,
  });
}

function toBreadcrumbLd(product) {
  const cat = product.categories?.[0];
  const slugKey = String(product?.slug || "").trim();
  const crumbName =
    PRODUCT_H1_OVERRIDES[slugKey] ||
    String(product.name || "").replace(/\bButto\b/g, "Button");
  const items = [{ name: "Home", url: "/" }];
  if (cat?.slug) {
    items.push({ name: cat.name, url: `/categories/${cat.slug}` });
  } else {
    items.push({ name: "Products", url: "/shop" });
  }
  items.push({ name: crumbName, url: `/${product.slug}` });
  return buildBreadcrumbJsonLd(items);
}

export default async function ProductPage({ params, searchParams }) {
  const { slug } = await params;
  const slugStr = String(slug || "").trim();
  if (!slugStr) notFound();
  const content = await loadContent(slugStr);
  if (!content) notFound();
  if (content.type === "redirect") {
    redirectWithQuery(content.to, await searchParams);
  }

  if (content.type === "product") {
    let approvedReviews = [];
    const soldRecently = await unitsSoldRecently(content.data?.id || content.data?._id, 30);
    try {
      await dbConnect();
      const productId = content.data?.id || content.data?._id;
      if (productId) {
        const rows = await Review.find({
          product: productId,
          status: "approved",
          isSeed: { $ne: true },
          orderId: { $exists: true, $nin: [null, ""] },
        })
          .select("reviewer.name rating title body createdAt source status orderId isSeed")
          .sort({ featured: -1, createdAt: -1 })
          .limit(12)
          .lean();
        approvedReviews = rows.filter(isGenuineReview);
      }
    } catch (err) {
      console.error("[product reviews json-ld]", err?.message || err);
    }

    const productLd = (() => {
      try {
        return toProductLd(content.data, approvedReviews);
      } catch (e) {
        console.error("product json-ld:", e);
        return null;
      }
    })();
    // LCP: ProductDetailMedico main img uses pdpImageUrl(-sm) + fetchPriority=high.
    // Next auto-preloads that URL — do not add a second <link rel=preload> (was racing).
    const ssrReviews = approvedReviews.slice(0, 5);

    return (
      <>
        {isCompleteProductJsonLd(productLd) ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: safeJsonLd(productLd),
            }}
          />
        ) : null}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: (() => {
              try {
                return safeJsonLd(toBreadcrumbLd(content.data));
              } catch (e) {
                console.error("breadcrumb json-ld:", e);
                return "{}";
              }
            })(),
          }}
        />
        {(() => {
          try {
            const faqExtras =
              PRODUCT_FAQ_OVERRIDES[String(content.data?.slug || "").trim()] || [];
            const faqLd = faqPageJsonLd([
              ...buildProductKeywordFaqs(content.data),
              ...faqExtras,
            ]);
            if (!faqLd) return null;
            return (
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: safeJsonLd(faqLd) }}
              />
            );
          } catch (e) {
            console.error("product faq json-ld:", e);
            return null;
          }
        })()}
        {ssrReviews.length ? (
          <section id="customer-reviews-ssr" className="sr-only" aria-label="Customer reviews">
            {ssrReviews.map((r, i) => (
              <article key={String(r._id || i)}>
                <h3>{String(r?.title || "Customer review").trim() || "Customer review"}</h3>
                <p>
                  {String(r?.reviewer?.name || "Customer").trim()} — {Number(r?.rating) || 5}/5
                </p>
                <p>{String(r?.body || "").trim()}</p>
              </article>
            ))}
          </section>
        ) : null}
        <ProductDetailMedico
          product={content.data}
          relatedProducts={content.relatedProducts || []}
          carLinks={content.carLinks || []}
          soldRecently={soldRecently}
        />
      </>
    );
  }

  if (content.type === "page") {
    return <PageView page={content.data} slug={slugStr} />;
  }

  notFound();
}

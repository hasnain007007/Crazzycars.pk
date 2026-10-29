import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { dbConnect } from "@/lib/db";
import Category from "@/lib/models/Category.model";
import { getCategoryIdsWithProducts, loadStoreCategoryDetail } from "@/lib/storeCategoryData";
import { isEmptyCategoryTree } from "@/lib/emptyLeafCategory";
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/seo/jsonld";
import {
  CategoryPageChrome,
  splitCategoryDescriptionHtml,
  splitLeadParagraph,
} from "@/components/store/CategoryPageChrome";
import { FaqSection } from "@/components/store/FaqSection";
import { ProductListingSection } from "@/components/store/ProductListingSection";
import { getSiteUrl } from "@/lib/siteUrl";
import { getCollectionByHandle, isShopifyEnabled } from "@/lib/shopify";
import { getServerStoreSettings } from "@/lib/serverSettings";
import { resolveStoreLogoUrl } from "@/lib/storeLogo";
import { buildBrandedAbsoluteTitle } from "@/lib/seo/brandedTitle";
import { listingHref, listingMetadata, parseListingSearchParams } from "@/lib/listingQuery";
import { withSafeMetadata } from "@/lib/safeMetadata";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { sortProductsClient } from "@/lib/productListing";
import { resolveCategoryHandle } from "@/lib/resolveCategoryHandle";
import { resolveCollectionHandleToPath } from "@/lib/resolveCollectionHandle";
import { getCategoryPriceExtent } from "@/lib/seo/categoryPriceExtent";
import {
  buildCategoryKeywordFaqs,
  faqPageJsonLd,
  isKeywordStrategyCategory,
} from "@/lib/seo/keywordStrategyFaqs";
import { CATEGORY_KEYWORD_META, CATEGORY_SEO_OWNER_LOCKED } from "@/lib/seo/generationAliases";
import {
  CATEGORY_DESCRIPTION_HTML,
  CATEGORY_FAQ_OVERRIDES,
  CATEGORY_APPLY_SKIP,
} from "@/lib/seo/gscAudit2026-10.mjs";
import { sanitizeCategoryHtml } from "@/lib/sanitizeHtml";
import { BRAND_NAME } from "@/lib/brand";
import { InternalBlogLinks } from "@/components/store/InternalBlogLinks";
import { blogsForCategory } from "@/lib/seo/blogInternalLinks.mjs";
import { dbBlogsForCategory } from "@/lib/seo/blogLinksFromDb";

/** ISR: catalog HTML edge-cache friendly; admin revalidate webhook still purges. */
export const revalidate = 600;
export const dynamicParams = true;

const BASE_URL = getSiteUrl();
const BRAND = BRAND_NAME;

export async function generateStaticParams() {
  try {
    await dbConnect();
    const [rows, withProducts] = await Promise.all([
      Category.find({ status: "active" }).select("slug _id").lean(),
      getCategoryIdsWithProducts(),
    ]);
    return rows
      .filter((c) => withProducts.has(String(c._id)))
      .map((c) => String(c.slug || "").trim())
      .filter(Boolean)
      .map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

const loadCachedCategoryDetail = (slugStr, page, pageSize, sort) =>
  unstable_cache(
    async () => {
      await dbConnect();
      const detail = await loadStoreCategoryDetail(slugStr, {
        page,
        limit: pageSize,
        sort,
      });
      if (!detail) return null;
      return JSON.parse(JSON.stringify(detail));
    },
    // v10: bust stale empty payloads after ObjectId/string category-ref repairs (2026-10-29).
    ["category-detail-v10", slugStr, String(page), String(pageSize), String(sort)],
    { revalidate: 300 }
  )();

const getCategoryDetail = cache(async (slugStr, page, pageSize, sort) =>
  loadCachedCategoryDetail(slugStr, page, pageSize, sort)
);

const getCategoryMeta = cache(async (slugStr) =>
  unstable_cache(
    async () => {
      await dbConnect();
      return Category.findOne({
        slug: slugStr,
        status: "active",
      })
        .select("name seo image description shortDescription")
        .lean()
        .then((doc) => (doc ? JSON.parse(JSON.stringify(doc)) : null));
    },
    ["category-meta-v5", slugStr],
    { revalidate: 300 }
  )()
);

const getCachedBrand = cache(async () =>
  unstable_cache(
    async () => {
      const settings = await getServerStoreSettings();
      return {
        name:
          settings?.storeName ||
          process.env.NEXT_PUBLIC_STORE_NAME ||
          process.env.NEXT_PUBLIC_APP_NAME ||
          "CrazzyCars.pk",
        logo:
          settings?.logoUrl ||
          resolveStoreLogoUrl(settings) ||
          settings?.general?.logoUrl ||
          (typeof settings?.general?.logo === "string"
            ? settings.general.logo
            : settings?.general?.logo?.url) ||
          "",
      };
    },
    ["category-brand-v1"],
    { revalidate: 60 }
  )()
);

function paginateRows(rows, listing) {
  const sorted = sortProductsClient(rows, listing.sort);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / listing.pageSize) || 1);
  const page = Math.min(listing.page, totalPages);
  const start = (page - 1) * listing.pageSize;
  return {
    products: sorted.slice(start, start + listing.pageSize),
    total,
    totalPages,
    page,
  };
}

async function redirectLegacyCategoryParam(slugStr, listing) {
  const canonicalSlug = await resolveCategoryHandle(slugStr);
  if (canonicalSlug && canonicalSlug !== slugStr) {
    permanentRedirect(listingHref(`/categories/${canonicalSlug}`, listing));
  }
  if (!canonicalSlug) {
    const dest = await resolveCollectionHandleToPath(slugStr);
    if (dest && dest !== "/categories" && dest !== `/categories/${slugStr}`) {
      if (dest.startsWith("/categories/")) {
        permanentRedirect(listingHref(dest, listing));
      } else {
        permanentRedirect(dest);
      }
    }
  }
}

export const generateMetadata = withSafeMetadata(async function categoryMetadata({ params, searchParams }) {
  const { slug } = await params;
  const slugStr = String(slug || "").trim();
  const listing = parseListingSearchParams(await searchParams);
  const listingPath = `/categories/${slugStr}`;
  await redirectLegacyCategoryParam(slugStr, listing);

  try {
    const [category, detail] = await Promise.all([
      getCategoryMeta(slugStr),
      getCategoryDetail(slugStr, listing.page, listing.pageSize, listing.sort),
    ]);

    if (isEmptyCategoryTree(detail)) notFound();
    if (detail && listing.page > (Number(detail.totalPages) || 1)) notFound();

    if (category) {
      const locked = CATEGORY_SEO_OWNER_LOCKED[slugStr] || null;
      const kwMeta = locked || CATEGORY_KEYWORD_META[slugStr] || null;
      // Owner-locked categories (e.g. led-headlights-bulbs) ignore divergent DB SEO.
      const dbTitle = CATEGORY_APPLY_SKIP.has(slugStr)
        ? ""
        : String(category.seo?.metaTitle || "").trim();
      const dbMeta = CATEGORY_APPLY_SKIP.has(slugStr)
        ? ""
        : String(category.seo?.metaDescription || "").trim();
      const titleSource =
        String(kwMeta?.metaTitle || dbTitle || "").trim() || category.name;
      const titleMeta = kwMeta?.absoluteTitle
        ? { absolute: String(kwMeta.metaTitle || titleSource).trim() }
        : buildBrandedAbsoluteTitle(titleSource, { brand: BRAND, max: 62 });
      const title = titleMeta.absolute;
      const description =
        String(kwMeta?.metaDescription || dbMeta || "").trim() ||
        `Shop ${category.name} at ${BRAND}. Premium car accessories with Cash on Delivery nationwide.`;
      const keywords = Array.isArray(category.seo?.metaKeywords)
        ? category.seo.metaKeywords.map((k) => String(k || "").trim()).filter(Boolean)
        : [];
      const ogImage = category.image?.url
        ? [
            {
              url: category.image.url,
              width: 1200,
              height: 630,
              alt: category.image?.altText || category.name,
            },
          ]
        : [
            {
              url: "/og/default-1200x630.jpg",
              width: 1200,
              height: 630,
              alt: category.name || BRAND,
            },
          ];
      const listingSeo = listingMetadata(listingPath, listing, {
        thin: Boolean(detail && Number(detail.productCount) === 0),
      });

      return {
        title: titleMeta,
        description,
        ...(keywords.length ? { keywords } : {}),
        robots: listingSeo.robots,
        openGraph: {
          title,
          description,
          type: "website",
          url: listingSeo.alternates.canonical,
          siteName: BRAND_NAME,
          images: ogImage,
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: [ogImage[0].url],
        },
        alternates: listingSeo.alternates,
      };
    }
  } catch (err) {
    if (String(err?.digest || "").startsWith("NEXT_")) throw err;
    /* fall through */
  }

  if (isShopifyEnabled()) {
    const collection = await getCollectionByHandle(slugStr).catch(() => null);
    if (!collection || !(collection.products || []).length) {
      return { title: "Category Not Found", robots: { index: false, follow: false } };
    }
    const titleMeta = buildBrandedAbsoluteTitle(collection.title, { brand: BRAND });
    const listingSeo = listingMetadata(listingPath, listing, {
      thin: !(collection.products || []).length,
    });
    return {
      title: titleMeta,
      description: collection.description || `Shop ${collection.title} at ${BRAND}.`,
      robots: listingSeo.robots,
      alternates: listingSeo.alternates,
      openGraph: {
        title: titleMeta.absolute,
        description: collection.description || "",
        type: "website",
        url: listingSeo.alternates.canonical,
        siteName: BRAND_NAME,
        images: collection.image?.url ? [{ url: collection.image.url }] : [],
      },
    };
  }

  return { title: "Category Not Found", robots: { index: false, follow: false } };
});

export default async function CategoryPage({ params, searchParams }) {
  const { slug } = await params;
  const slugStr = String(slug || "").trim();
  if (!slugStr) notFound();
  const listing = parseListingSearchParams(await searchParams);
  const listingPath = `/categories/${slugStr}`;
  await redirectLegacyCategoryParam(slugStr, listing);

  // Prefer Mongo catalog (seeded categories) so /categories/[slug] never 404s
  // when Shopify is enabled but collections use different handles.
  const detail = await getCategoryDetail(slugStr, listing.page, listing.pageSize, listing.sort);
  if (isEmptyCategoryTree(detail)) notFound();
  if (detail && listing.page > (Number(detail.totalPages) || 1)) notFound();
  if (detail) {
    const brand = await getCachedBrand();
    const data = detail;

    const crumbItems = [
      { name: "Home", url: "/" },
      { name: "Categories", url: "/categories" },
      ...(Array.isArray(data.breadcrumbs)
        ? data.breadcrumbs.map((b) => ({ name: b.name, url: `/categories/${b.slug}` }))
        : [{ name: data.category.name, url: `/categories/${data.category.slug}` }]),
    ];
    const seen = new Set();
    const uniqueCrumbs = crumbItems.filter((c) => {
      if (seen.has(c.url)) return false;
      seen.add(c.url);
      return true;
    });

    const breadcrumbLd = breadcrumbJsonLd(uniqueCrumbs);
    const kwMetaBody = CATEGORY_KEYWORD_META[String(data.category?.slug || slugStr || "").trim()] || null;
    const categoryDescription =
      String(kwMetaBody?.metaDescription || data.category?.seo?.metaDescription || "").trim() ||
      String(data.category?.description || "").trim() ||
      String(data.category?.shortDescription || "").trim() ||
      undefined;
    const collectionLd = collectionPageJsonLd({
      name: data.category?.name,
      description: categoryDescription,
      url: `/categories/${data.category?.slug || slugStr}`,
      products: data.products,
      numberOfItems: data.productCount,
      breadcrumb: breadcrumbLd,
      isPartOfName: brand?.name || BRAND,
    });

    const catSlug = data.category?.slug || slugStr;
    const auditDesc = CATEGORY_DESCRIPTION_HTML[catSlug] || "";
    const resolvedDescHtml = sanitizeCategoryHtml(
      auditDesc ||
        String(data.category?.description || "").trim() ||
        String(data.category?.shortDescription || "").trim() ||
        ""
    );

    let visibleFaqs = [];
    if (isKeywordStrategyCategory(catSlug)) {
      const extent = await getCategoryPriceExtent(catSlug);
      const baseFaqs = buildCategoryKeywordFaqs(catSlug, extent);
      const extraFaqs = CATEGORY_FAQ_OVERRIDES[catSlug] || [];
      const seenQ = new Set(baseFaqs.map((f) => String(f.question || "").toLowerCase()));
      visibleFaqs = [
        ...baseFaqs,
        ...extraFaqs.filter((f) => !seenQ.has(String(f.question || "").toLowerCase())),
      ];
    }
    const { faqPairs, remainderHtml, summaryHtml } = splitCategoryDescriptionHtml(resolvedDescHtml);
    const introRestHtml = splitLeadParagraph(summaryHtml).restHtml;
    if (!visibleFaqs.length && faqPairs.length) visibleFaqs = faqPairs;
    else if (faqPairs.length) {
      const seenQ = new Set(visibleFaqs.map((f) => String(f.question || "").toLowerCase()));
      for (const f of faqPairs) {
        if (!seenQ.has(String(f.question || "").toLowerCase())) visibleFaqs.push(f);
      }
    }
    const faqLd = faqPageJsonLd(visibleFaqs);
    const fromBlogLinks = [
      ...blogsForCategory(catSlug, data.category?.name),
      ...(await dbBlogsForCategory(catSlug, data.category?.name, 5)),
    ]
      .filter((l, i, arr) => l?.href && arr.findIndex((x) => x.href === l.href) === i)
      .slice(0, 5);

    return (
      <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
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
        <CategoryPageChrome
          category={{
            ...data.category,
            description: resolvedDescHtml || data.category?.description,
          }}
          subcategories={data.subcategories}
          products={data.products}
          brand={brand}
          crumbs={uniqueCrumbs}
          showFullDescription={false}
          leadOnly
        />
        <ProductListingSection
          pathname={listingPath}
          listing={listing}
          products={data.products}
          total={data.productCount}
          totalPages={data.totalPages}
          title={data.category?.name}
          categoryName={data.category?.name}
          showTitle={false}
          emptyMessage="No products found in this category."
          priorityCount={0}
        />
        {introRestHtml ? (
          <div
            className="store-container cat-desc cat-desc--html prose prose-neutral max-w-none"
            style={{ padding: "24px 16px 8px" }}
            dangerouslySetInnerHTML={{ __html: introRestHtml }}
          />
        ) : null}
        {remainderHtml && !faqPairs.length ? (
          <div
            className="store-container cat-desc cat-desc--html prose prose-neutral max-w-none"
            style={{ padding: "24px 16px 40px" }}
            dangerouslySetInnerHTML={{ __html: remainderHtml }}
          />
        ) : null}
        <FaqSection title={`${data.category?.name || "Category"} FAQs`} items={visibleFaqs} />
        <InternalBlogLinks title="From the blog" links={fromBlogLinks} />
      </div>
    );
  }

  if (isShopifyEnabled()) {
    const collection = await getCollectionByHandle(slugStr).catch(() => null);
    if (!collection) notFound();
    if (!(collection.products || []).length) notFound();
    const brand = await getCachedBrand();
    const paged = paginateRows(collection.products || [], listing);
    const category = {
      _id: collection.handle,
      slug: collection.handle,
      name: collection.title,
      description: collection.descriptionHtml || collection.description,
      image: collection.image,
      source: "shopify",
    };
    return (
      <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
        <CategoryPageChrome
          category={category}
          subcategories={[]}
          products={paged.products}
          brand={brand}
        />
        <ProductListingSection
          pathname={listingPath}
          listing={{ ...listing, page: paged.page }}
          products={paged.products}
          total={paged.total}
          totalPages={paged.totalPages}
          title={collection.title}
          categoryName={collection.title}
          showTitle={false}
          emptyMessage="No products found in this category."
          priorityCount={0}
        />
      </div>
    );
  }

  notFound();
}

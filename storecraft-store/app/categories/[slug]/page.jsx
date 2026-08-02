import { notFound } from "next/navigation";
import { Suspense, cache } from "react";
import { unstable_cache } from "next/cache";
import { dbConnect } from "@/lib/db";
import Category from "@/lib/models/Category.model";
import { loadStoreCategoryDetail } from "@/lib/storeCategoryData";
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/seo/jsonld";
import { CategoryDetailPageClient } from "@/components/store/CategoryDetailPageClient";
import { CategoryPageChrome } from "@/components/store/CategoryPageChrome";
import { getSiteUrl } from "@/lib/siteUrl";
import { getCollectionByHandle, isShopifyEnabled } from "@/lib/shopify";
import { getServerStoreSettings } from "@/lib/serverSettings";
import { resolveStoreLogoUrl } from "@/lib/storeLogo";

/** ISR: prerender active categories at build; refresh every 2 minutes. */
export const revalidate = 120;
export const dynamicParams = true;

const BASE_URL = getSiteUrl();
const BRAND = process.env.NEXT_PUBLIC_STORE_NAME || process.env.NEXT_PUBLIC_APP_NAME || "Crazzycars.pk";

export async function generateStaticParams() {
  try {
    await dbConnect();
    const rows = await Category.find({ status: "active" }).select("slug").lean();
    return rows
      .map((c) => String(c.slug || "").trim())
      .filter(Boolean)
      .map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

const loadCachedCategoryDetail = (slugStr) =>
  unstable_cache(
    async () => {
      await dbConnect();
      const detail = await loadStoreCategoryDetail(slugStr);
      if (!detail) return null;
      return JSON.parse(JSON.stringify(detail));
    },
    ["category-detail-v2", slugStr],
    { revalidate: 120 }
  )();

const getCategoryDetail = cache(async (slugStr) => loadCachedCategoryDetail(slugStr));

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
    ["category-meta-v1", slugStr],
    { revalidate: 120 }
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

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const slugStr = String(slug || "").trim();

  try {
    const category = await getCategoryMeta(slugStr);

    if (category) {
      const title =
        (category.seo?.metaTitle || "").trim() || `${category.name} | ${BRAND}`;
      const description =
        (category.seo?.metaDescription || "").trim() ||
        `Shop ${category.name} at ${BRAND}. Premium car accessories with Cash on Delivery nationwide.`;
      const keywords = Array.isArray(category.seo?.metaKeywords)
        ? category.seo.metaKeywords.map((k) => String(k || "").trim()).filter(Boolean)
        : [];
      const ogImage = category.image?.url
        ? [
            {
              url: category.image.url,
              alt: category.image?.altText || category.name,
            },
          ]
        : [];

      return {
        title,
        description,
        ...(keywords.length ? { keywords } : {}),
        openGraph: {
          title,
          description,
          url: `${BASE_URL}/categories/${slugStr}`,
          images: ogImage,
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: category.image?.url ? [category.image.url] : [],
        },
        alternates: {
          canonical: `${BASE_URL}/categories/${slugStr}`,
        },
      };
    }
  } catch {
    /* fall through */
  }

  if (isShopifyEnabled()) {
    const collection = await getCollectionByHandle(slugStr).catch(() => null);
    if (!collection) return { title: "Category Not Found", robots: { index: false, follow: false } };
    return {
      title: collection.title,
      description: collection.description || `Shop ${collection.title} at ${BRAND}.`,
      alternates: { canonical: `${BASE_URL}/categories/${slugStr}` },
      openGraph: {
        title: collection.title,
        description: collection.description || "",
        url: `${BASE_URL}/categories/${slugStr}`,
        images: collection.image?.url ? [{ url: collection.image.url }] : [],
      },
    };
  }

  return { title: "Category Not Found", robots: { index: false, follow: false } };
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const slugStr = String(slug || "").trim();
  if (!slugStr) notFound();

  // Prefer Mongo catalog (seeded categories) so /categories/[slug] never 404s
  // when Shopify is enabled but collections use different handles.
  const detail = await getCategoryDetail(slugStr);
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
    const categoryDescription =
      String(data.category?.seo?.metaDescription || "").trim() ||
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

    return (
      <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
        />
        {/* H1 chrome SSRs here — outside the useSearchParams island */}
        <CategoryPageChrome
          category={data.category}
          subcategories={data.subcategories}
          products={data.products}
          brand={brand}
        />
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-4 py-16 text-sm text-[#6B7280]">
              Loading products…
            </div>
          }
        >
          <CategoryDetailPageClient
            initialCategory={data.category}
            initialSubcategories={data.subcategories}
            initialProducts={data.products}
            initialProductCount={data.productCount}
            initialBreadcrumbs={data.breadcrumbs}
            brand={brand}
          />
        </Suspense>
      </div>
    );
  }

  if (isShopifyEnabled()) {
    const collection = await getCollectionByHandle(slugStr).catch(() => null);
    if (!collection) notFound();
    const brand = await getCachedBrand();
    return (
      <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
        <CategoryPageChrome
          category={{
            _id: collection.handle,
            slug: collection.handle,
            name: collection.title,
            description: collection.descriptionHtml || collection.description,
            image: collection.image,
            source: "shopify",
          }}
          subcategories={[]}
          products={collection.products}
          brand={brand}
        />
        <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-16 text-sm text-[#6B7280]">Loading products…</div>}>
          <CategoryDetailPageClient
            initialCategory={{
              _id: collection.handle,
              slug: collection.handle,
              name: collection.title,
              description: collection.descriptionHtml || collection.description,
              image: collection.image,
              source: "shopify",
            }}
            initialSubcategories={[]}
            initialProducts={collection.products}
            initialBreadcrumbs={[]}
            brand={brand}
          />
        </Suspense>
      </div>
    );
  }

  notFound();
}

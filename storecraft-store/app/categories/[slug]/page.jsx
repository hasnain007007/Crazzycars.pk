import { notFound } from "next/navigation";
import { dbConnect } from "@/lib/db";
import Category from "@/lib/models/Category.model";
import { loadStoreCategoryDetail } from "@/lib/storeCategoryData";
import { CategoryDetailPageClient } from "@/components/store/CategoryDetailPageClient";
import { getSiteUrl } from "@/lib/siteUrl";
import { getCollectionByHandle, isShopifyEnabled } from "@/lib/shopify";

export const revalidate = 300;

const BASE_URL = getSiteUrl();
const BRAND = process.env.NEXT_PUBLIC_STORE_NAME || process.env.NEXT_PUBLIC_APP_NAME || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const slugStr = String(slug || "").trim();

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

  try {
    await dbConnect();
    const category = await Category.findOne({
      slug: slugStr,
      status: { $regex: /^active$/i },
    })
      .select("name seo image shortDescription description")
      .lean();

    if (!category) {
      return { title: "Category Not Found", robots: { index: false, follow: false } };
    }

    const title = (category.seo?.metaTitle || "").trim() || category.name;
    const description =
      (category.seo?.metaDescription || "").trim() ||
      `Shop ${category.name} at ${BRAND}. Premium car accessories collection.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${BASE_URL}/categories/${slugStr}`,
        images: category.image?.url ? [{ url: category.image.url }] : [],
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
  } catch {
    return { title: "Category" };
  }
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const slugStr = String(slug || "").trim();
  if (!slugStr) notFound();

  if (isShopifyEnabled()) {
    const collection = await getCollectionByHandle(slugStr).catch(() => null);
    if (!collection) notFound();
    return (
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
      />
    );
  }

  await dbConnect();
  const detail = await loadStoreCategoryDetail(slugStr);
  if (!detail) notFound();

  const data = JSON.parse(
    JSON.stringify({
      category: detail.category,
      subcategories: detail.subcategories,
      products: detail.products,
      breadcrumbs: detail.breadcrumbs,
    })
  );

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
      <CategoryDetailPageClient
        initialCategory={data.category}
        initialSubcategories={data.subcategories}
        initialProducts={data.products}
        initialBreadcrumbs={data.breadcrumbs}
      />
    </div>
  );
}

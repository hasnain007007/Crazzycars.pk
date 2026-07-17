import { notFound } from "next/navigation";
import { dbConnect } from "@/lib/db";
import Category from "@/lib/models/Category.model";
import { loadStoreCategoryDetail } from "@/lib/storeCategoryData";
import { CategoryDetailPageClient } from "@/components/store/CategoryDetailPageClient";

export const dynamic = "force-dynamic";

const BASE_URL = (process.env.NEXT_PUBLIC_STORE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://crazzycars.pk").replace(/\/$/, "");
const BRAND = process.env.NEXT_PUBLIC_STORE_NAME || process.env.NEXT_PUBLIC_APP_NAME || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const slugStr = String(slug || "").trim();

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
        title: category.name,
        description: `Shop ${category.name} at ${BRAND}`,
        url: `${BASE_URL}/${slugStr}`,
        images: category.image?.url ? [{ url: category.image.url }] : [],
      },
      alternates: {
        canonical: `${BASE_URL}/${slugStr}`,
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

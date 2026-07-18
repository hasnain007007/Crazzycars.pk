import { CategoriesPageClient } from "@/components/store/CategoriesPageClient";
import { categoryHref } from "@/lib/categories";
import { dbConnect } from "@/lib/db";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { loadStoreCategoriesTree } from "@/lib/storeCategoryData";

export const dynamic = "force-dynamic";
export const metadata = buildPageMetadata({
  title: "Shop Car Accessory Categories",
  description: "Browse product categories on CrazzyCars.pk.",
  path: "/categories",
});

export default async function CategoriesPage() {
  let serialized = [];
  try {
    await dbConnect();
    const categories = await loadStoreCategoriesTree(true);
    const roots = Array.isArray(categories) ? categories : [];
    serialized = roots.map((c, i) => ({
      _id: String(c._id),
      name: c.name,
      slug: c.slug,
      level: Number(c.level || 0),
      href: categoryHref(c.slug),
      productCount: Number(c.productCount || 0),
      children: Array.isArray(c.children)
        ? c.children.map((ch) => ({
            _id: String(ch._id),
            name: ch.name,
            slug: ch.slug,
            href: categoryHref(ch.slug),
            productCount: Number(ch.productCount || 0),
          }))
        : [],
      homepageOrder: Number(c.homepageOrder || i),
    }));
  } catch (e) {
    console.error("Categories page load error:", e);
  }

  return (
    <div style={{ background: "#0A0A0A", minHeight: "100vh" }}>
      <CategoriesPageClient initialCategories={serialized} />
    </div>
  );
}

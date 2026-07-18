import { CategoriesPageClient } from "@/components/store/CategoriesPageClient";
import { CRAZZYCARS_CATEGORIES, categoryHref } from "@/lib/categories";
import { buildPageMetadata } from "@/lib/pageMetadata";

export const dynamic = "force-dynamic";
export const metadata = buildPageMetadata({
  title: "Shop Car Accessory Categories",
  description:
    "Browse CrazzyCars.pk categories — splitters, LED lights, body kits, carbon fiber accessories & more.",
  path: "/categories",
});

export default function CategoriesPage() {
  const serialized = CRAZZYCARS_CATEGORIES.map((c, i) => ({
    _id: c.slug,
    name: c.name,
    slug: c.slug,
    level: 0,
    href: categoryHref(c.slug),
    productCount: 0,
    children: [],
    homepageOrder: i,
  }));
  return (
    <div style={{ background: "#0A0A0A", minHeight: "100vh" }}>
      <CategoriesPageClient initialCategories={serialized} />
    </div>
  );
}

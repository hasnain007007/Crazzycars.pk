import { Suspense } from "react";
import { CategoriesPageClient } from "@/components/store/CategoriesPageClient";
import { CategoriesIndexChrome } from "@/components/store/CategoriesIndexChrome";
import { categoryHref } from "@/lib/categories";
import { dbConnect } from "@/lib/db";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { loadStoreCategoriesTree } from "@/lib/storeCategoryData";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { getSiteUrl } from "@/lib/siteUrl";

export const revalidate = 300;
export const metadata = buildPageMetadata({
  title: "Shop Car Accessory Categories",
  description:
    "Browse car accessory categories in Pakistan — splitters, body kits, LED lights, spoilers, interior trims and more. Confirm fitment on each product. Cash on Delivery on eligible items.",
  path: "/categories",
});

export default async function CategoriesPage() {
  let serialized = [];
  try {
    await dbConnect();
    const categories = await loadStoreCategoriesTree(true);
    const roots = (Array.isArray(categories) ? categories : []).filter(
      (c) => Number(c.productCount || 0) > 0
    );
    serialized = roots.map((c, i) => ({
      _id: String(c._id),
      name: c.name,
      slug: c.slug,
      level: Number(c.level || 0),
      href: categoryHref(c.slug),
      productCount: Number(c.productCount || 0),
      image: c.image || null,
      children: Array.isArray(c.children)
        ? c.children
            .filter((ch) => Number(ch.productCount || 0) > 0)
            .map((ch) => ({
              _id: String(ch._id),
              name: ch.name,
              slug: ch.slug,
              href: categoryHref(ch.slug),
              productCount: Number(ch.productCount || 0),
              image: ch.image || null,
            }))
        : [],
      homepageOrder: Number(c.homepageOrder || i),
    }));
  } catch (e) {
    console.error("Categories page load error:", e);
  }

  const site = getSiteUrl();
  const listItems = [];
  for (const root of serialized) {
    listItems.push({ name: root.name, url: root.href || categoryHref(root.slug) });
    for (const ch of root.children || []) {
      listItems.push({ name: ch.name, url: ch.href || categoryHref(ch.slug) });
    }
  }

  const crumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Categories", url: "/categories" },
  ]);
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Shop Car Accessory Categories",
    url: `${site}/categories`,
    description:
      "Browse car accessory categories in Pakistan — exterior, interior, LED lighting and more.",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: listItems.length,
      itemListElement: listItems.slice(0, 80).map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: it.name,
        url: `${site}${it.url.startsWith("/") ? it.url : `/${it.url}`}`,
      })),
    },
  };

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(crumbs) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionLd) }}
      />
      <CategoriesIndexChrome />
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 py-12 text-zinc-500">Loading categories…</div>
        }
      >
        <CategoriesPageClient initialCategories={serialized} />
      </Suspense>
    </div>
  );
}

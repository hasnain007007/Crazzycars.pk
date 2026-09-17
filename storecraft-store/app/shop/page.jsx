import { notFound } from "next/navigation";
import { ShopListingLayout } from "@/components/store/ShopListingLayout";
import { fetchProductsServer } from "@/lib/serverProductFetch";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { withSafeMetadata } from "@/lib/safeMetadata";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { listingCanonicalPath, listingMetadata, parseListingSearchParams } from "@/lib/listingQuery";
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/seo/jsonld";

export const dynamic = "force-dynamic";

export const generateMetadata = withSafeMetadata(async function shopMetadata({ searchParams }) {
  const listing = parseListingSearchParams(await searchParams);
  const title = listing.q
    ? `Results for “${listing.q}”`
    : listing.sale || listing.deals
      ? "Hot Deals"
      : "Shop All Car Accessories";
  const description =
    "Browse premium car accessories in Pakistan. Filter by category, brand, and car make. Cash on delivery available nationwide from Crazzycars.pk.";
  const listingSeo = listingMetadata("/shop", listing);
  const base = buildPageMetadata({
    title,
    description,
    path: listingCanonicalPath("/shop", listing),
    noIndex: listingSeo.robots.index === false,
  });
  return {
    ...base,
    robots: listingSeo.robots,
    alternates: listingSeo.alternates,
    openGraph: {
      ...base.openGraph,
      url: listingSeo.alternates.canonical,
    },
  };
});

export default async function ShopPage({ searchParams }) {
  const listing = parseListingSearchParams(await searchParams);
  const { products, total, totalPages } = await fetchProductsServer({ listing });
  if (listing.page > Math.max(1, Number(totalPages) || 1)) notFound();

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Shop", url: "/shop" },
  ]);
  const collectionLd = collectionPageJsonLd({
    name: listing.q
      ? `Search: ${listing.q}`
      : listing.sale || listing.deals
        ? "Hot Deals"
        : "Shop All Car Accessories",
    description:
      "Browse premium car accessories in Pakistan. Filter by category, brand, and car make. Cash on delivery available nationwide from Crazzycars.pk.",
    url: listingCanonicalPath("/shop", listing),
    products,
    numberOfItems: total,
    breadcrumb: breadcrumbLd,
  });

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionLd) }}
      />
      <ShopListingLayout
        pathname="/shop"
        listing={listing}
        products={products}
        total={total}
        totalPages={totalPages}
      />
    </div>
  );
}

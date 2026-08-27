import { ShopListingLayout } from "@/components/store/ShopListingLayout";
import { fetchProductsServer } from "@/lib/serverProductFetch";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { listingCanonicalPath, listingMetadata, parseListingSearchParams } from "@/lib/listingQuery";
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/seo/jsonld";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  const listing = parseListingSearchParams(await searchParams);
  const title = listing.q
    ? `Results for “${listing.q}”`
    : listing.sale || listing.deals
      ? "Hot Deals"
      : "Shop Kitchen, Beauty & Travel Bags & Ladies Bags";
  const description =
    "Browse kitchen accessories, beauty & travel bags and ladies handbags in Pakistan. Cash on delivery available nationwide from Homefy.pk.";
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
}

export default async function ShopPage({ searchParams }) {
  const listing = parseListingSearchParams(await searchParams);
  const { products, total, totalPages } = await fetchProductsServer({ listing });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Shop", url: "/shop" },
  ]);
  const collectionLd = collectionPageJsonLd({
    name: listing.q
      ? `Search: ${listing.q}`
      : listing.sale || listing.deals
        ? "Hot Deals"
        : "Shop Kitchen, Beauty & Travel Bags & Ladies Bags",
    description:
      "Browse kitchen accessories, beauty & travel bags and ladies handbags in Pakistan. Cash on delivery available nationwide from Homefy.pk.",
    url: listingCanonicalPath("/shop", listing),
    products,
    numberOfItems: total,
    breadcrumb: breadcrumbLd,
  });

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
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

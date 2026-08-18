import { ShopListingLayout } from "@/components/store/ShopListingLayout";
import { fetchProductsServer } from "@/lib/serverProductFetch";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { listingCanonicalPath, listingMetadata, parseListingSearchParams } from "@/lib/listingQuery";

export async function generateMetadata({ searchParams }) {
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
}

export default async function ShopPage({ searchParams }) {
  const listing = parseListingSearchParams(await searchParams);
  const { products, total, totalPages } = await fetchProductsServer({ listing });

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
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

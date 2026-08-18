import { ShopListingLayout } from "@/components/store/ShopListingLayout";
import { fetchProductsServer } from "@/lib/serverProductFetch";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { listingCanonicalPath, listingMetadata, parseListingSearchParams } from "@/lib/listingQuery";

export async function generateMetadata({ searchParams }) {
  const listing = parseListingSearchParams(await searchParams);
  const title = listing.q
    ? `Results for “${listing.q}” | Crazzycars.pk`
    : "Shop All Car Accessories | Crazzycars.pk";
  const description =
    "Browse premium car accessories in Pakistan — splitters, LED headlights, body kits, spoilers, carbon fiber parts, and more. Cash on delivery available.";
  const listingSeo = listingMetadata("/products", listing);
  const base = buildPageMetadata({
    title,
    description,
    path: listingCanonicalPath("/products", listing),
    noIndex: listingSeo.robots.index === false,
    absoluteTitle: true,
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

export default async function Page({ searchParams }) {
  const listing = parseListingSearchParams(await searchParams);
  const q = listing.q;
  const { products, total, totalPages } = await fetchProductsServer({ listing });

  const intro = q
    ? `Search results for “${q}”.`
    : "Browse our complete collection of premium car accessories. Shop splitters, LED lights, body kits, spoilers, carbon fiber parts, and more — with cash on delivery across Pakistan.";

  return (
    <div style={{ background: "#F5F5F5", minHeight: "100vh" }}>
      <ShopListingLayout
        pathname="/products"
        listing={listing}
        products={products}
        total={total}
        totalPages={totalPages}
        intro={intro}
      />
    </div>
  );
}

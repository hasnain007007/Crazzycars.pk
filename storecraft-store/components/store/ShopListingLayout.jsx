import Link from "next/link";
import { listingHasFacets, listingToUrlState, shopListingTitle } from "@/lib/listingQuery";
import { getProductCardPrices } from "@/lib/productCardShape";
import { ProductListingSection } from "@/components/store/ProductListingSection";
import { ShopFiltersClient } from "@/components/store/ShopFiltersClient";

/**
 * Shared /shop and /products chrome: SSR H1 + breadcrumb, client filters, server grid.
 */
export function ShopListingLayout({
  pathname = "/shop",
  listing,
  products = [],
  total = 0,
  totalPages = 1,
  intro = "",
}) {
  const urlState = listingToUrlState(listing);
  const title = shopListingTitle(listing);
  const highest = products.reduce((max, p) => {
    const { sale, regular } = getProductCardPrices(p);
    return Math.max(max, sale || 0, regular || 0);
  }, 0);
  const catalogEmpty =
    total === 0 &&
    !listingHasFacets(listing) &&
    !listing.q &&
    products.length === 0;

  return (
    <div className="shop-listing">
      <div className="shop-listing-banner border-b border-[rgba(0,0,0,0.08)] bg-[#F5F5F5] py-2.5 md:py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4">
          <h1
            className="font-heading text-lg font-bold uppercase tracking-[0.04em] md:text-2xl md:tracking-[0.05em]"
            style={{ color: "#111111" }}
          >
            {title}
          </h1>
          <nav className="shrink-0 text-xs text-[#555555] md:text-sm" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[#111111]">
              Home
            </Link>
            <span> / </span>
            <span>Shop</span>
          </nav>
        </div>
      </div>

      {intro ? (
        <p className="shop-listing-intro mx-auto max-w-7xl px-4 pt-3 text-[13px] leading-relaxed text-[#333333] md:pt-6 md:text-[15px]">{intro}</p>
      ) : null}

      {catalogEmpty ? (
        <div className="mx-auto max-w-7xl px-4 py-8 text-center md:py-16">
          <h2 className="font-heading text-xl font-bold text-[#111111]">Products coming soon</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#555555]">
            We&apos;re stocking the shelves with premium car accessories for Pakistan. Check back shortly.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded bg-[#C41E1E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#a01818]"
          >
            Back to home
          </Link>
        </div>
      ) : (
        <div className="mx-auto flex max-w-7xl gap-6 px-4 py-4 md:py-8">
          <ShopFiltersClient pathname={pathname} urlState={urlState} highest={highest} />
          <div className="min-w-0 flex-1">
            <ProductListingSection
              layout="embedded"
              pathname={pathname}
              listing={listing}
              urlState={urlState}
              products={products}
              total={total}
              totalPages={totalPages}
              title={title}
              categoryName="car accessories"
              emptyMessage={
                listing.q
                  ? `No products match “${listing.q}”. Try another keyword or browse the shop.`
                  : "No products match current filters."
              }
            >
              <div className="mt-6">
                <Link
                  href={pathname}
                  className="text-sm text-[#D72323] underline underline-offset-2 hover:text-[#a01818]"
                >
                  Reset filters
                </Link>
              </div>
            </ProductListingSection>
          </div>
        </div>
      )}
    </div>
  );
}

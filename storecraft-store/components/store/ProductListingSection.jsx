import { listingPageHref, listingToUrlState } from "@/lib/listingQuery";
import { ListingToolbarClient } from "@/components/store/ListingToolbarClient";
import { ServerListingPagination } from "@/components/store/ServerListingPagination";
import { ServerProductGrid } from "@/components/store/ServerProductGrid";

/**
 * Shared listing body: client toolbar + server grid + crawlable pagination.
 */
export function ProductListingSection({
  pathname,
  listing,
  urlState: urlStateProp,
  products = [],
  total = 0,
  totalPages = 1,
  title,
  categoryName,
  showTitle = true,
  emptyMessage,
  layout = "page",
  children,
}) {
  const urlState = urlStateProp || listingToUrlState(listing);
  const wrapClass =
    layout === "embedded" ? "min-w-0" : "mx-auto max-w-7xl px-4 py-4 sm:px-6 md:py-8";
  const prevHref = listing.page > 1 ? listingPageHref(pathname, urlState, listing.page - 1) : null;
  const nextHref =
    listing.page < totalPages ? listingPageHref(pathname, urlState, listing.page + 1) : null;

  return (
    <div className={wrapClass}>
      {prevHref ? <link rel="prev" href={prevHref} /> : null}
      {nextHref ? <link rel="next" href={nextHref} /> : null}
      <ListingToolbarClient
        pathname={pathname}
        urlState={urlState}
        title={title}
        total={total}
        page={listing.page}
        pageSize={listing.pageSize}
        sort={listing.sort}
        view={listing.view}
        showTitle={showTitle}
      />
      <ServerProductGrid
        products={products}
        categoryName={categoryName || title}
        view={listing.view}
        emptyMessage={emptyMessage}
      />
      <ServerListingPagination
        pathname={pathname}
        urlState={urlState}
        page={listing.page}
        totalPages={totalPages}
      />
      {children}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { ProductListingToolbar } from "@/components/store/ProductListingToolbar";
import { DEFAULT_LISTING_PAGE_SIZE } from "@/lib/productListing";
import { hrefFromUrlState } from "@/lib/listingQuery";

/**
 * Toolbar-only island. Receives current listing state as props — does not
 * call useSearchParams() (that would CSR-bail the product grid).
 */
export function ListingToolbarClient({
  pathname,
  urlState = {},
  title,
  total = 0,
  page = 1,
  pageSize = DEFAULT_LISTING_PAGE_SIZE,
  sort = "default",
  view = "grid",
  showTitle = true,
}) {
  const router = useRouter();

  function replace(patch, resetPage = false) {
    const next = { ...urlState, ...patch };
    if (patch.sort === "default") delete next.sort;
    if (patch.view === "grid") delete next.view;
    if (Number(patch.per_page) === DEFAULT_LISTING_PAGE_SIZE) delete next.per_page;
    if (resetPage) delete next.page;
    router.replace(hrefFromUrlState(pathname, next), { scroll: false });
  }

  return (
    <ProductListingToolbar
      title={title}
      total={total}
      page={page}
      pageSize={pageSize}
      sort={sort}
      view={view}
      showTitle={showTitle}
      onSortChange={(v) => replace({ sort: v }, true)}
      onPageSizeChange={(n) => replace({ per_page: n }, true)}
      onViewChange={(v) => replace({ view: v })}
    />
  );
}

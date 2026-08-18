import { pageWindow } from "@/lib/productListing";
import { listingPageHref } from "@/lib/listingQuery";

/**
 * Crawlable pagination — real <a href> with rel="prev"/"next". No preventDefault.
 */
export function ServerListingPagination({
  pathname,
  urlState = {},
  page = 1,
  totalPages = 1,
}) {
  if (totalPages <= 1) return null;
  const nums = pageWindow(page, totalPages);
  const prevHref = page > 1 ? listingPageHref(pathname, urlState, page - 1) : null;
  const nextHref = page < totalPages ? listingPageHref(pathname, urlState, page + 1) : null;

  return (
    <nav className="pl-pagination" aria-label="Product pagination">
      {prevHref ? (
        <a href={prevHref} className="pl-page-link" rel="prev">
          Prev
        </a>
      ) : (
        <span className="pl-page-link is-disabled">Prev</span>
      )}

      {nums.map((n, idx) => {
        const prev = nums[idx - 1];
        const ellipsis = prev != null && n - prev > 1;
        const current = n === page;
        return (
          <span key={n} className="contents">
            {ellipsis ? <span className="pl-page-ellipsis">…</span> : null}
            <a
              href={listingPageHref(pathname, urlState, n)}
              aria-current={current ? "page" : undefined}
              className={`pl-page-num${current ? " is-active" : ""}`}
              rel={n === page - 1 ? "prev" : n === page + 1 ? "next" : undefined}
            >
              {n}
            </a>
          </span>
        );
      })}

      {nextHref ? (
        <a href={nextHref} className="pl-page-link" rel="next">
          Next
        </a>
      ) : (
        <span className="pl-page-link is-disabled">Next</span>
      )}
    </nav>
  );
}

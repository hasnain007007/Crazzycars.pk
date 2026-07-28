"use client";

import {
  LISTING_PAGE_SIZES,
  LISTING_SORT_OPTIONS,
  LISTING_VIEWS,
  formatShowingLabel,
} from "@/lib/productListing";

/** After pagination, jump back to the listing (Next.js keeps scroll on same-path query changes). */
export function scrollProductListingToTop() {
  if (typeof window === "undefined") return;
  const run = () => {
    const el = document.getElementById("product-listing-top");
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  // Wait a tick so new page content can mount first.
  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });
}

function ViewIcon({ view, active }) {
  const stroke = active ? "#111111" : "#6B7280";
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 18 18",
    fill: "none",
    "aria-hidden": true,
  };
  if (view === "grid") {
    return (
      <svg {...common}>
        <rect x="1.5" y="1.5" width="6.5" height="6.5" rx="1" stroke={stroke} strokeWidth="1.4" />
        <rect x="10" y="1.5" width="6.5" height="6.5" rx="1" stroke={stroke} strokeWidth="1.4" />
        <rect x="1.5" y="10" width="6.5" height="6.5" rx="1" stroke={stroke} strokeWidth="1.4" />
        <rect x="10" y="10" width="6.5" height="6.5" rx="1" stroke={stroke} strokeWidth="1.4" />
      </svg>
    );
  }
  if (view === "grid-dense") {
    return (
      <svg {...common}>
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => (
            <rect
              key={`${r}-${c}`}
              x={1.5 + c * 5.5}
              y={1.5 + r * 5.5}
              width="4.2"
              height="4.2"
              rx="0.6"
              stroke={stroke}
              strokeWidth="1.2"
            />
          ))
        )}
      </svg>
    );
  }
  if (view === "list") {
    return (
      <svg {...common}>
        <rect x="1.5" y="2" width="4" height="4" rx="0.8" stroke={stroke} strokeWidth="1.3" />
        <path d="M8 3h8M8 5.5h6" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
        <rect x="1.5" y="12" width="4" height="4" rx="0.8" stroke={stroke} strokeWidth="1.3" />
        <path d="M8 13h8M8 15.5h6" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="1.5" y="2" width="5" height="5" rx="0.8" stroke={stroke} strokeWidth="1.3" />
      <path d="M9 3.2h7M9 5.5h5.5M9 7.8h6" stroke={stroke} strokeWidth="1.25" strokeLinecap="round" />
      <rect x="1.5" y="11" width="5" height="5" rx="0.8" stroke={stroke} strokeWidth="1.3" />
      <path d="M9 12.2h7M9 14.5h5.5M9 16.8h6" stroke={stroke} strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

/**
 * WooCommerce-style listing controls adapted to CrazzyCars branding.
 */
export function ProductListingToolbar({
  title,
  total = 0,
  page = 1,
  pageSize = 40,
  sort = "default",
  view = "grid",
  loading = false,
  onSortChange,
  onPageSizeChange,
  onViewChange,
  showTitle = true,
}) {
  return (
    <div id="product-listing-top" className="pl-toolbar-wrap" tabIndex={-1}>
      {showTitle ? (
        <div className="pl-toolbar-heading">
          {title ? <h2 className="pl-toolbar-title">{title}</h2> : <span />}
          <p className="pl-toolbar-count">
            {formatShowingLabel({ total, page, pageSize, loading })}
          </p>
        </div>
      ) : (
        <div className="pl-toolbar-heading pl-toolbar-heading--count-only">
          <p className="pl-toolbar-count">
            {formatShowingLabel({ total, page, pageSize, loading })}
          </p>
        </div>
      )}

      <div className="pl-toolbar" role="toolbar" aria-label="Product listing options">
        <div className="pl-toolbar-views" role="group" aria-label="Layout">
          {LISTING_VIEWS.map((v) => {
            const active = view === v.id;
            return (
              <button
                key={v.id}
                type="button"
                className={`pl-view-btn${active ? " is-active" : ""}`}
                aria-label={v.label}
                aria-pressed={active}
                title={v.label}
                onClick={() => onViewChange?.(v.id)}
              >
                <ViewIcon view={v.id} active={active} />
              </button>
            );
          })}
        </div>

        <div className="pl-toolbar-controls">
          <label className="pl-select-wrap">
            <span className="sr-only">Sort products</span>
            <select
              value={sort}
              onChange={(e) => onSortChange?.(e.target.value)}
              className="pl-select"
            >
              {LISTING_SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="pl-select-wrap">
            <span className="sr-only">Products per page</span>
            <select
              value={String(pageSize)}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className="pl-select"
            >
              {LISTING_PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  Show {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}

export function ProductListingPagination({
  page,
  totalPages,
  buildHref,
  onPageChange,
}) {
  if (totalPages <= 1) return null;
  const nums = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) nums.push(i);
  } else {
    const set = new Set([1, totalPages, page - 1, page, page + 1, page - 2, page + 2]);
    nums.push(...[...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b));
  }

  const go = (n) => {
    if (onPageChange) onPageChange(n);
    scrollProductListingToTop();
  };

  return (
    <nav className="pl-pagination" aria-label="Product pagination">
      {page > 1 ? (
        buildHref ? (
          <a href={buildHref(page - 1)} className="pl-page-link" onClick={(e) => { if (onPageChange) { e.preventDefault(); go(page - 1); } }}>
            Prev
          </a>
        ) : (
          <button type="button" className="pl-page-link" onClick={() => go(page - 1)}>
            Prev
          </button>
        )
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
            {buildHref ? (
              <a
                href={buildHref(n)}
                aria-current={current ? "page" : undefined}
                className={`pl-page-num${current ? " is-active" : ""}`}
                onClick={(e) => {
                  if (onPageChange) {
                    e.preventDefault();
                    go(n);
                  }
                }}
              >
                {n}
              </a>
            ) : (
              <button
                type="button"
                aria-current={current ? "page" : undefined}
                className={`pl-page-num${current ? " is-active" : ""}`}
                onClick={() => go(n)}
              >
                {n}
              </button>
            )}
          </span>
        );
      })}

      {page < totalPages ? (
        buildHref ? (
          <a href={buildHref(page + 1)} className="pl-page-link" onClick={(e) => { if (onPageChange) { e.preventDefault(); go(page + 1); } }}>
            Next
          </a>
        ) : (
          <button type="button" className="pl-page-link" onClick={() => go(page + 1)}>
            Next
          </button>
        )
      ) : (
        <span className="pl-page-link is-disabled">Next</span>
      )}
    </nav>
  );
}

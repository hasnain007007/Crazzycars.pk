"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductListingRow } from "@/components/store/ProductListingRow";
import {
  ProductListingPagination,
  ProductListingToolbar,
} from "@/components/store/ProductListingToolbar";
import {
  DEFAULT_LISTING_PAGE_SIZE,
  LISTING_VIEWS,
  normalizeListingPageSize,
  normalizeListingSort,
  normalizeListingView,
  sortProductsClient,
} from "@/lib/productListing";

function VehicleProductsListingInner({
  title,
  subtitle,
  products = [],
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sort = normalizeListingSort(searchParams.get("sort"));
  const view = normalizeListingView(searchParams.get("view"));
  const pageSize = normalizeListingPageSize(
    searchParams.get("per_page") || searchParams.get("show"),
    DEFAULT_LISTING_PAGE_SIZE
  );
  const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);

  const patchQuery = useCallback(
    (patch, { resetPage = false } = {}) => {
      const qs = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, val]) => {
        if (val == null || val === "") {
          qs.delete(key);
          return;
        }
        if (key === "sort" && val === "default") {
          qs.delete(key);
          return;
        }
        if (key === "view" && val === "grid") {
          qs.delete(key);
          return;
        }
        if (key === "per_page" && Number(val) === DEFAULT_LISTING_PAGE_SIZE) {
          qs.delete(key);
          return;
        }
        qs.set(key, String(val));
      });
      if (resetPage) qs.delete("page");
      const q = qs.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const sortedProducts = useMemo(() => sortProductsClient(products, sort), [products, sort]);
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize) || 1);
  const safePage = Math.min(page, totalPages);
  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, safePage, pageSize]);

  useEffect(() => {
    if (page > totalPages && totalPages >= 1) {
      patchQuery({ page: totalPages === 1 ? "" : totalPages });
    }
  }, [page, totalPages, patchQuery]);

  const buildPageHref = useCallback(
    (pageNum) => {
      const qs = new URLSearchParams(searchParams.toString());
      if (pageNum <= 1) qs.delete("page");
      else qs.set("page", String(pageNum));
      const q = qs.toString();
      return q ? `${pathname}?${q}` : pathname;
    },
    [pathname, searchParams]
  );

  const viewMeta = LISTING_VIEWS.find((v) => v.id === view) || LISTING_VIEWS[0];
  const isRowView = view === "list" || view === "detail";

  if (!products.length) {
    return (
      <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#FAFAFA] px-6 py-12 text-center">
        <p className="text-sm text-[#6B7280]">
          {subtitle ||
            "Products for this car will show once you assign them in admin (compatible vehicles / car catalog). Universal products are not listed here unless you add them to this car."}
        </p>
        <Link href="/shop" className="mt-4 inline-block text-sm font-bold text-[#C41E1E] hover:underline">
          Browse the shop →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <ProductListingToolbar
        title={title}
        total={sortedProducts.length}
        page={safePage}
        pageSize={pageSize}
        sort={sort}
        view={view}
        onSortChange={(v) => patchQuery({ sort: v }, { resetPage: true })}
        onPageSizeChange={(n) => patchQuery({ per_page: n }, { resetPage: true })}
        onViewChange={(v) => patchQuery({ view: v })}
      />

      {isRowView ? (
        <div className="pl-rows">
          {pageSlice.map((p) => (
            <ProductListingRow
              key={p.id || p._id || p.slug}
              product={p}
              mode={view === "detail" ? "detail" : "list"}
            />
          ))}
        </div>
      ) : (
        <div className={`product-grid grid gap-2 md:gap-2.5 ${viewMeta.cols}`}>
          {pageSlice.map((p) => (
            <div key={p.id || p._id || p.slug}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      )}

      <ProductListingPagination
        page={safePage}
        totalPages={totalPages}
        buildHref={buildPageHref}
        onPageChange={(n) => patchQuery({ page: n <= 1 ? "" : n })}
      />
    </div>
  );
}

export function VehicleProductsListing(props) {
  return (
    <Suspense
      fallback={
        <div className="product-grid grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-2.5 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-[#E5E7EB]" />
          ))}
        </div>
      }
    >
      <VehicleProductsListingInner {...props} />
    </Suspense>
  );
}

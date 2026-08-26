"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "./ProductCard";
import { ProductListingRow } from "./ProductListingRow";
import {
  ProductListingPagination,
  ProductListingToolbar,
} from "./ProductListingToolbar";
import { categoryHref } from "@/lib/categories";
import {
  DEFAULT_LISTING_PAGE_SIZE,
  LISTING_VIEWS,
  listingSortToApi,
  normalizeListingPageSize,
  normalizeListingSort,
  normalizeListingView,
} from "@/lib/productListing";

/** Maps category-page product documents to the flat shape ProductCard + /api/products use. */
function toProductCard(product) {
  if (product?.source === "shopify") return product;
  const regularPrice = Number(product.pricing?.regularPrice ?? product.regularPrice ?? product.price ?? 0);
  const salePrice = Number(product.pricing?.salePrice ?? product.salePrice ?? 0);
  const cats = Array.isArray(product.categories)
    ? product.categories.map((c) =>
        typeof c === "object" && c
          ? { name: c.name, slug: c.slug, _id: c._id }
          : c
      )
    : [];
  return {
    id: product._id || product.id,
    _id: product._id || product.id,
    slug: product.slug,
    name: product.name,
    media: product.media,
    image: product.media?.images?.[0]?.url || "",
    images: (product.media?.images || []).map((i) => i?.url).filter(Boolean),
    regularPrice,
    salePrice,
    price: salePrice > 0 && salePrice < regularPrice ? salePrice : regularPrice,
    inventory: product.inventory,
    newArrival: Boolean(product.newArrival),
    featured: Boolean(product.featured),
    createdAt: product.createdAt,
    shortDescription: product.shortDescription || "",
    articleNo: product.articleNo || product.inventory?.sku || "",
    categories: cats,
    rating: Number(product.rating || product.averageRating || product.ratingAverage || 0),
    averageRating: Number(product.averageRating || product.ratingAverage || product.rating || 0),
    reviewCount: Number(product.reviewCount || product.totalReviews || product.numReviews || 0),
  };
}

/**
 * Category product listing island — reads sort/view/page from the URL.
 * Page chrome (breadcrumb + H1 hero) is rendered by the server parent so crawlers
 * always see one H1 even when this island bails out to CSR.
 */
export function CategoryDetailPageClient({
  initialCategory,
  initialSubcategories,
  initialProducts,
  initialProductCount = null,
  initialBreadcrumbs: _initialBreadcrumbs,
  brand: _brand = null,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const category = initialCategory;
  const subcategories = initialSubcategories || [];
  const seededProducts = useMemo(
    () => (initialProducts || []).map(toProductCard),
    [initialProducts]
  );
  const seededTotal =
    initialProductCount != null && Number.isFinite(Number(initialProductCount))
      ? Number(initialProductCount)
      : seededProducts.length;

  const sort = normalizeListingSort(searchParams.get("sort"));
  const view = normalizeListingView(searchParams.get("view"));
  const pageSize = normalizeListingPageSize(
    searchParams.get("per_page") || searchParams.get("show"),
    DEFAULT_LISTING_PAGE_SIZE
  );
  const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
  const apiSort = listingSortToApi(sort);

  const [products, setProducts] = useState(seededProducts);
  const [totalCount, setTotalCount] = useState(seededTotal);
  const [totalPages, setTotalPages] = useState(
    Math.max(1, Math.ceil(seededTotal / DEFAULT_LISTING_PAGE_SIZE) || 1)
  );
  const [loading, setLoading] = useState(false);

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

  const canUseSeed =
    page === 1 &&
    pageSize === DEFAULT_LISTING_PAGE_SIZE &&
    (sort === "default" || sort === "latest") &&
    apiSort === "newest";

  useEffect(() => {
    if (!category?.slug) return undefined;

    if (canUseSeed) {
      setProducts(seededProducts);
      setTotalCount(seededTotal);
      setTotalPages(Math.max(1, Math.ceil(seededTotal / pageSize) || 1));
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams({
      category: String(category.slug),
      limit: String(pageSize),
      page: String(page),
      sort: apiSort,
    });
    fetch(`/api/products?${qs.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json?.success) {
          setProducts((json.products || []).map(toProductCard));
          setTotalCount(Number(json.total) || 0);
          setTotalPages(Math.max(1, Number(json.totalPages) || 1));
        } else {
          setProducts([]);
          setTotalCount(0);
          setTotalPages(1);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([]);
          setTotalCount(0);
          setTotalPages(1);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    category?.slug,
    canUseSeed,
    seededProducts,
    seededTotal,
    page,
    pageSize,
    apiSort,
    sort,
  ]);

  const safePage = Math.min(page, totalPages);
  const pageSlice = products;

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

  if (!category) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-14 text-center">
        <p className="text-3xl font-bold">Category not found</p>
        <Link href="/categories" className="mt-5 inline-block text-[var(--color-primary)] underline">
          Back to categories
        </Link>
      </div>
    );
  }

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {subcategories.length > 0 ? (
          <section className="subcat-circle-section" style={{ marginBottom: 48 }}>
            <h2 className="cat-section-title">Shop By Categories</h2>
            <div className="subcat-circle-marquee" aria-label="Subcategories">
              <div
                className="subcat-circle-track"
                style={{
                  animationDuration: `${Math.max(subcategories.length * 3.2, 28)}s`,
                }}
              >
                {[0, 1].map((copy) =>
                  subcategories.map((sub, idx) => (
                    <Link
                      key={`${copy}-${sub._id}`}
                      href={categoryHref(sub.slug)}
                      className="subcat-circle-item"
                      tabIndex={copy === 0 ? undefined : -1}
                      aria-hidden={copy === 1 ? true : undefined}
                      style={
                        copy === 0
                          ? { animationDelay: `${Math.min(idx, 12) * 45}ms` }
                          : undefined
                      }
                    >
                      <span className="subcat-circle-ring">
                        {sub.image?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={sub.image.url}
                            alt={copy === 0 ? sub.image?.altText || sub.name : ""}
                            title={sub.image?.title || sub.name}
                            loading="lazy"
                            draggable={false}
                          />
                        ) : (
                          <span className="subcat-circle-fallback" aria-hidden>
                            {(sub.name || "?").charAt(0)}
                          </span>
                        )}
                      </span>
                      <span className="subcat-circle-label">{sub.name}</span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </section>
        ) : null}

        <ProductListingToolbar
          title={category.name}
          total={totalCount}
          page={safePage}
          pageSize={pageSize}
          sort={sort}
          view={view}
          onSortChange={(v) => patchQuery({ sort: v }, { resetPage: true })}
          onPageSizeChange={(n) => patchQuery({ per_page: n }, { resetPage: true })}
          onViewChange={(v) => patchQuery({ view: v })}
        />

        {loading ? (
          <p className="py-16 text-center text-sm text-[#888888]">Loading products…</p>
        ) : pageSlice.length > 0 ? (
          isRowView ? (
            <div className="pl-rows">
              {pageSlice.map((product) => (
                <ProductListingRow
                  key={String(product.id || product._id)}
                  product={product}
                  mode={view === "detail" ? "detail" : "list"}
                />
              ))}
            </div>
          ) : (
            <div className={`product-grid grid gap-2 md:gap-4 ${viewMeta.cols}`}>
              {pageSlice.map((product) => (
                <div key={String(product.id || product._id)}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )
        ) : (
          <div style={{ textAlign: "center", padding: "60px 24px", color: "#888888" }}>
            <p style={{ fontSize: 16, margin: "0 0 16px" }}>No products found in this category.</p>
            <Link
              href="/shop"
              style={{
                display: "inline-block",
                padding: "12px 28px",
                background: "#C6633B",
                color: "#FFFFFF",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                borderRadius: 4,
              }}
            >
              View All Products
            </Link>
          </div>
        )}

        <ProductListingPagination
          page={safePage}
          totalPages={totalPages}
          buildHref={buildPageHref}
          onPageChange={(n) => patchQuery({ page: n <= 1 ? "" : n })}
        />
      </div>
    </div>
  );
}

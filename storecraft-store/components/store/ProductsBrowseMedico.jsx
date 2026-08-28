"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatPrice } from "@/lib/currency";
import { ProductCard } from "./ProductCard";
import { ProductListingRow } from "./ProductListingRow";
import {
  ProductListingPagination,
  ProductListingToolbar,
} from "./ProductListingToolbar";
import { CAR_MAKES } from "@/lib/carCatalog";
import {
  DEFAULT_LISTING_PAGE_SIZE,
  LISTING_VIEWS,
  listingSortToApi,
  normalizeListingPageSize,
  normalizeListingSort,
  normalizeListingView,
} from "@/lib/productListing";

/** Real vehicle brands only — not product attributes like Universal/Premium. */
const SHOP_BRANDS = ["Honda", "Toyota", "Suzuki", "KIA", "Hyundai", "Changan", "MG"];
const DEFAULT_PAGE_SIZE = DEFAULT_LISTING_PAGE_SIZE;

function Section({ title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-[rgba(0,0,0,0.1)] py-3">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left text-sm font-semibold text-[#111111]">
        {title} <span className="text-[#666666]">{open ? "▲" : "▼"}</span>
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

function buildPageHref(pathname, searchParams, pageNum) {
  const qs = new URLSearchParams(searchParams.toString());
  if (pageNum <= 1) qs.delete("page");
  else qs.set("page", String(pageNum));
  const q = qs.toString();
  return q ? `${pathname}?${q}` : pathname;
}

function resolveInitialTotalPages(initialTotal, initialProductsLength, initialTotalPages, pageSize) {
  const size = pageSize || DEFAULT_PAGE_SIZE;
  const fromProp = Number(initialTotalPages);
  if (Number.isFinite(fromProp) && fromProp > 1) return Math.floor(fromProp);
  const total = Number(initialTotal);
  if (Number.isFinite(total) && total > 0) {
    return Math.max(1, Math.ceil(total / size));
  }
  if (Number.isFinite(fromProp) && fromProp >= 1) return Math.floor(fromProp);
  return Math.max(1, Math.ceil((initialProductsLength || 0) / size) || 1);
}

export function ProductsBrowseMedico({
  initialProducts = [],
  initialTotal = 0,
  initialPage = 1,
  initialTotalPages = 1,
  initialQuery = "",
}) {
  const router = useRouter();
  const pathname = usePathname() || "/shop";
  const searchParams = useSearchParams();

  const category = searchParams.get("category") || "";
  const saleOnly = searchParams.get("sale") === "true";
  const dealsParam = searchParams.get("deals") === "true" || searchParams.get("deals") === "1";
  const carMake = searchParams.get("make") || searchParams.get("carMake") || "";
  const carModel = searchParams.get("model") || searchParams.get("carModel") || "";
  const carYear = searchParams.get("year") || searchParams.get("carYear") || "";
  const searchQ = (searchParams.get("q") || "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
  const listingSort = normalizeListingSort(searchParams.get("sort"));
  const apiSort = listingSortToApi(listingSort);
  const view = normalizeListingView(searchParams.get("view"));
  const pageSize = normalizeListingPageSize(
    searchParams.get("per_page") || searchParams.get("show"),
    DEFAULT_PAGE_SIZE
  );

  const seedQuery = String(initialQuery || "").trim();
  const seedMatchesSearch = seedQuery === searchQ;
  const hasExtraClientFilters = Boolean(
    category ||
      saleOnly ||
      dealsParam ||
      carMake ||
      carModel ||
      carYear ||
      listingSort !== "default" ||
      view !== "grid" ||
      pageSize !== DEFAULT_PAGE_SIZE
  );
  const seededTotal = Number(initialTotal) || initialProducts.length || 0;
  const seededPages = resolveInitialTotalPages(
    seededTotal,
    initialProducts.length,
    initialTotalPages,
    pageSize
  );
  const initialPageComplete =
    initialProducts.length > 0 &&
    (initialProducts.length >= Math.min(pageSize, seededTotal || pageSize) ||
      initialProducts.length >= seededTotal);
  // Seed when SSR payload has products. Empty SSR search must client-fetch /api/products.
  const hasInitial =
    seedMatchesSearch &&
    !hasExtraClientFilters &&
    page === (initialPage || 1) &&
    apiSort === "newest" &&
    initialProducts.length > 0 &&
    initialPageComplete;

  const [products, setProducts] = useState(hasInitial ? initialProducts : []);
  const [totalCount, setTotalCount] = useState(hasInitial ? seededTotal : 0);
  const [totalPages, setTotalPages] = useState(hasInitial ? seededPages : 1);
  const [loading, setLoading] = useState(!hasInitial);
  const [fetchError, setFetchError] = useState("");
  const [inStock, setInStock] = useState(false);
  const [outOfStock, setOutOfStock] = useState(false);
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [filterCategory, setFilterCategory] = useState(category);
  const [filterBrand, setFilterBrand] = useState("");
  const [filterMake, setFilterMake] = useState(carMake);
  const [highest, setHighest] = useState(0);

  const patchListingQuery = useCallback(
    (patch, { resetPage = false, replace = true } = {}) => {
      const qs = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, val]) => {
        if (val == null || val === "") qs.delete(key);
        else if (key === "sort" && val === "default") qs.delete(key);
        else if (key === "view" && val === "grid") qs.delete(key);
        else if (key === "per_page" && Number(val) === DEFAULT_PAGE_SIZE) qs.delete(key);
        else qs.set(key, String(val));
      });
      if (resetPage) qs.delete("page");
      const q = qs.toString();
      const href = q ? `${pathname}?${q}` : pathname;
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: true });
    },
    [pathname, router, searchParams]
  );

  const goToPage = useCallback(
    (nextPage, { replace = false } = {}) => {
      const href = buildPageHref(pathname, searchParams, nextPage);
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: true });
    },
    [pathname, router, searchParams]
  );

  const setFilterParam = useCallback(
    (key, value) => {
      const qs = new URLSearchParams(searchParams.toString());
      if (value) qs.set(key, value);
      else qs.delete(key);
      qs.delete("page");
      const q = qs.toString();
      router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const qs = new URLSearchParams({
        limit: String(pageSize),
        page: String(page),
        sort: apiSort,
      });
      const activeCategory = filterCategory || category;
      if (activeCategory) qs.set("category", activeCategory);
      if (saleOnly) qs.set("sale", "true");
      if (dealsParam) qs.set("deals", "true");
      if (searchQ) qs.set("q", searchQ);

      const make = filterMake || carMake;
      if (make) qs.set("carMake", make);
      if (carModel) qs.set("carModel", carModel);
      if (carYear) qs.set("carYear", carYear);

      if (filterBrand) qs.set("brand", filterBrand);
      if (priceFrom !== "") qs.set("minPrice", String(priceFrom));
      if (priceTo !== "") qs.set("maxPrice", String(priceTo));
      if (inStock && !outOfStock) qs.set("inStock", "true");
      if (outOfStock && !inStock) qs.set("outOfStock", "true");

      const res = await fetch(`/api/products?${qs.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (json.success) {
        const rows = json.products || [];
        setProducts(rows);
        setTotalCount(Number(json.total) || 0);
        setTotalPages(Math.max(1, Number(json.totalPages) || 1));
        if (rows.length) {
          setHighest((prev) => Math.max(prev, ...rows.map((p) => Number(p.price) || 0)));
        }
      } else {
        setProducts([]);
        setTotalCount(0);
        setTotalPages(1);
        setFetchError(json.error || "Could not load products.");
      }
    } catch {
      setProducts([]);
      setTotalCount(0);
      setTotalPages(1);
      setFetchError("Could not load products.");
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    apiSort,
    category,
    filterCategory,
    saleOnly,
    dealsParam,
    searchQ,
    carMake,
    carModel,
    carYear,
    filterMake,
    filterBrand,
    priceFrom,
    priceTo,
    inStock,
    outOfStock,
  ]);

  useEffect(() => {
    const canUseSeed =
      hasInitial &&
      page === (initialPage || 1) &&
      apiSort === "newest" &&
      pageSize === DEFAULT_PAGE_SIZE &&
      !filterBrand &&
      !filterMake &&
      !priceFrom &&
      !priceTo &&
      !inStock &&
      !outOfStock &&
      !filterCategory &&
      seedMatchesSearch;
    if (canUseSeed) {
      setProducts(initialProducts);
      setTotalCount(seededTotal);
      setTotalPages(seededPages);
      setLoading(false);
      return;
    }
    void load();
  }, [
    load,
    hasInitial,
    page,
    initialPage,
    apiSort,
    pageSize,
    filterBrand,
    filterMake,
    priceFrom,
    priceTo,
    inStock,
    outOfStock,
    filterCategory,
    seedMatchesSearch,
    initialProducts,
    seededTotal,
    seededPages,
  ]);

  // Keep local category/make selects in sync with URL.
  useEffect(() => {
    setFilterCategory(category);
  }, [category]);
  useEffect(() => {
    setFilterMake(carMake);
  }, [carMake]);

  // If filters shrink results below current page, snap back.
  useEffect(() => {
    const pages = Math.max(
      totalPages,
      totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1
    );
    if (!loading && pages > 0 && page > pages) {
      goToPage(pages, { replace: true });
    }
  }, [loading, page, totalPages, totalCount, pageSize, goToPage]);

  const effectiveTotalPages = Math.max(
    totalPages,
    totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1
  );
  // Only treat as empty catalog when browsing with no search/filters.
  const catalogEmpty =
    !loading &&
    !searchQ &&
    !hasExtraClientFilters &&
    !filterBrand &&
    !filterMake &&
    !priceFrom &&
    !priceTo &&
    !inStock &&
    !outOfStock &&
    totalCount === 0 &&
    products.length === 0;
  const viewMeta = LISTING_VIEWS.find((v) => v.id === view) || LISTING_VIEWS[0];
  const isRowView = view === "list" || view === "detail";
  const listingTitle = searchQ
    ? `Results for “${searchQ}”`
    : saleOnly || dealsParam
      ? "Hot Deals"
      : carMake
        ? `Parts for ${carMake}${carModel ? ` ${carModel}` : ""}${carYear ? ` ${carYear}` : ""}`
        : "Products";

  return (
    <div>
      <div className="border-b border-[rgba(0,0,0,0.08)] bg-[#F5F5F5] py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
          <h1
            className="font-heading text-2xl font-bold uppercase tracking-[0.05em]"
            style={{ color: "#111111", letterSpacing: "0.06em" }}
          >
            {listingTitle}
          </h1>
          <p className="text-sm text-[#555555]">Home / Shop</p>
        </div>
      </div>

      {catalogEmpty ? (
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
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
        <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
          <aside className="hidden w-64 shrink-0 rounded border border-[rgba(0,0,0,0.12)] bg-[#FFFFFF] p-4 lg:block">
            <h3 className="text-base font-bold" style={{ color: "#111111" }}>Filter:</h3>
            <Section title="Availability">
              <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm text-[#333333]">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => {
                    setInStock(e.target.checked);
                    goToPage(1, { replace: true });
                  }}
                  className="accent-[#D72323]"
                />{" "}
                In stock
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[#333333]">
                <input
                  type="checkbox"
                  checked={outOfStock}
                  onChange={(e) => {
                    setOutOfStock(e.target.checked);
                    goToPage(1, { replace: true });
                  }}
                  className="accent-[#D72323]"
                />{" "}
                Out of stock
              </label>
            </Section>
            <Section title="Price">
              {highest > 0 ? (
                <p className="text-xs text-[#555555]">
                  The highest price on this page is <span className="price">{formatPrice(highest)}</span>
                </p>
              ) : null}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  value={priceFrom}
                  onChange={(e) => setPriceFrom(e.target.value)}
                  onBlur={() => goToPage(1, { replace: true })}
                  placeholder="From"
                  className="rounded border border-[rgba(0,0,0,0.12)] bg-[#FFFFFF] px-2 py-1.5 text-sm text-[#111111] placeholder:text-[#777777]"
                />
                <input
                  value={priceTo}
                  onChange={(e) => setPriceTo(e.target.value)}
                  onBlur={() => goToPage(1, { replace: true })}
                  placeholder="To"
                  className="rounded border border-[rgba(0,0,0,0.12)] bg-[#FFFFFF] px-2 py-1.5 text-sm text-[#111111] placeholder:text-[#777777]"
                />
              </div>
            </Section>
            <Section title="Category">
              <select
                value={filterCategory}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilterCategory(v);
                  setFilterParam("category", v);
                }}
                className="w-full min-h-[44px] rounded border border-[rgba(0,0,0,0.12)] px-2 text-sm"
              >
                <option value="">All categories</option>
              </select>
            </Section>
            <Section title="Brand">
              <select
                value={filterBrand}
                onChange={(e) => {
                  setFilterBrand(e.target.value);
                  goToPage(1, { replace: true });
                }}
                className="w-full min-h-[44px] rounded border border-[rgba(0,0,0,0.12)] px-2 text-sm"
              >
                <option value="">All brands</option>
                {SHOP_BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Section>
            <Section title="Car Make">
              <select
                value={filterMake}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilterMake(v);
                  setFilterParam("make", v);
                }}
                className="w-full min-h-[44px] rounded border border-[rgba(0,0,0,0.12)] px-2 text-sm"
              >
                <option value="">Any vehicle</option>
                {CAR_MAKES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Section>
          </aside>

          <div className="min-w-0 flex-1">
            <ProductListingToolbar
              title={listingTitle}
              total={loading && !products.length ? -1 : totalCount}
              page={page}
              pageSize={pageSize}
              sort={listingSort}
              view={view}
              loading={loading}
              onSortChange={(v) => patchListingQuery({ sort: v }, { resetPage: true })}
              onPageSizeChange={(n) => patchListingQuery({ per_page: n }, { resetPage: true })}
              onViewChange={(v) => patchListingQuery({ view: v })}
            />

            {highest > 0 ? (
              <p className="mb-3 text-xs text-[#555555] lg:hidden">
                Highest on this page: <span className="price">{formatPrice(highest)}</span>
              </p>
            ) : null}

            {fetchError ? (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {fetchError}
              </p>
            ) : null}

            {loading && !products.length ? (
              <div className={`product-grid grid gap-2 md:gap-2.5 ${viewMeta.cols}`}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-44 animate-pulse rounded border border-[rgba(0,0,0,0.12)] bg-[#EFEFEF] md:h-52" />
                ))}
              </div>
            ) : isRowView ? (
              <div className="pl-rows">
                {products.map((p) => (
                  <ProductListingRow
                    key={p.id || p._id || p.slug}
                    product={p}
                    mode={view === "detail" ? "detail" : "list"}
                  />
                ))}
              </div>
            ) : (
              <div className={`product-grid grid gap-2 md:gap-2.5 ${viewMeta.cols}`}>
                {products.map((p) => (
                  <div key={p.id || p._id || p.slug}>
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            )}
            {!products.length && !loading ? (
              <p className="mt-6 text-sm text-[#555555]">
                {searchQ
                  ? `No products match “${searchQ}”. Try another keyword or browse the shop.`
                  : "No products match current filters."}
              </p>
            ) : null}

            <ProductListingPagination
              page={page}
              totalPages={effectiveTotalPages}
              buildHref={(n) => buildPageHref(pathname, searchParams, n)}
              onPageChange={(n) => goToPage(n)}
            />

            <div className="mt-6">
              <Link href="/shop" className="text-sm text-[#D72323] underline underline-offset-2 hover:text-[#a01818]">
                Reset filters
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

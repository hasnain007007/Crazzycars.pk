"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatPrice } from "@/lib/currency";
import { ProductCard } from "./ProductCard";
import { CAR_MAKES } from "@/lib/carCatalog";

/** Real vehicle brands only — not product attributes like Universal/Premium. */
const SHOP_BRANDS = ["Honda", "Toyota", "Suzuki", "KIA", "Hyundai", "Changan", "MG"];
const PAGE_SIZE = 24;

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

function pageWindow(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const out = new Set([1, totalPages, page - 1, page, page + 1, page - 2, page + 2]);
  return [...out].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
}

function resolveInitialTotalPages(initialTotal, initialProductsLength, initialTotalPages) {
  const fromProp = Number(initialTotalPages);
  if (Number.isFinite(fromProp) && fromProp > 1) return Math.floor(fromProp);
  const total = Number(initialTotal);
  if (Number.isFinite(total) && total > 0) {
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  }
  if (Number.isFinite(fromProp) && fromProp >= 1) return Math.floor(fromProp);
  return Math.max(1, Math.ceil((initialProductsLength || 0) / PAGE_SIZE) || 1);
}

export function ProductsBrowseMedico({
  initialProducts = [],
  initialTotal = 0,
  initialPage = 1,
  initialTotalPages = 1,
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
  const searchQ = searchParams.get("q") || "";
  const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);

  const hasUrlFilters = Boolean(
    category || saleOnly || dealsParam || carMake || carModel || carYear || searchQ.trim() || page > 1
  );
  const seededTotal = Number(initialTotal) || initialProducts.length || 0;
  const seededPages = resolveInitialTotalPages(
    seededTotal,
    initialProducts.length,
    initialTotalPages
  );
  // Only treat SSR payload as complete when it matches the browse page size (or the full catalog).
  const initialPageComplete =
    initialProducts.length > 0 &&
    (initialProducts.length >= PAGE_SIZE || initialProducts.length >= seededTotal);
  const hasInitial = !hasUrlFilters && initialPageComplete && page === (initialPage || 1);

  const [products, setProducts] = useState(hasInitial ? initialProducts : []);
  const [totalCount, setTotalCount] = useState(hasInitial ? seededTotal : 0);
  const [totalPages, setTotalPages] = useState(hasInitial ? seededPages : 1);
  const [loading, setLoading] = useState(!hasInitial);
  const [sort, setSort] = useState("newest");
  const [inStock, setInStock] = useState(false);
  const [outOfStock, setOutOfStock] = useState(false);
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [filterCategory, setFilterCategory] = useState(category);
  const [filterBrand, setFilterBrand] = useState("");
  const [filterMake, setFilterMake] = useState(carMake);
  const [grid, setGrid] = useState(true);
  const [highest, setHighest] = useState(0);

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
    try {
      const qs = new URLSearchParams({
        limit: String(PAGE_SIZE),
        page: String(page),
        sort,
      });
      const activeCategory = filterCategory || category;
      if (activeCategory) qs.set("category", activeCategory);
      if (saleOnly) qs.set("sale", "true");
      if (dealsParam) qs.set("deals", "true");
      if (searchQ.trim()) qs.set("q", searchQ.trim());

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
      const json = await res.json();
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
      }
    } finally {
      setLoading(false);
    }
  }, [
    page,
    sort,
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
      page === 1 &&
      sort === "newest" &&
      !filterBrand &&
      !filterMake &&
      !priceFrom &&
      !priceTo &&
      !inStock &&
      !outOfStock &&
      !filterCategory;
    if (canUseSeed) return;
    void load();
  }, [load, hasInitial, page, sort, filterBrand, filterMake, priceFrom, priceTo, inStock, outOfStock, filterCategory]);

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
      totalCount > 0 ? Math.ceil(totalCount / PAGE_SIZE) : 1
    );
    if (!loading && pages > 0 && page > pages) {
      goToPage(pages, { replace: true });
    }
  }, [loading, page, totalPages, totalCount, goToPage]);

  const effectiveTotalPages = Math.max(
    totalPages,
    totalCount > 0 ? Math.ceil(totalCount / PAGE_SIZE) : 1
  );
  const pageNumbers = useMemo(
    () => pageWindow(page, effectiveTotalPages),
    [page, effectiveTotalPages]
  );
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, totalCount);
  const catalogEmpty = !loading && totalCount === 0 && products.length === 0;

  return (
    <div>
      <div className="border-b border-[rgba(0,0,0,0.08)] bg-[#F5F5F5] py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
          <h1
            className="font-heading text-2xl font-bold uppercase tracking-[0.05em]"
            style={{ color: "#111111", letterSpacing: "0.06em" }}
          >
            {saleOnly || dealsParam
              ? "Hot Deals"
              : carMake
                ? `Parts for ${carMake}${carModel ? ` ${carModel}` : ""}${carYear ? ` ${carYear}` : ""}`
                : "Products"}
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
            <div className="mb-4 flex flex-col gap-3 rounded border border-[rgba(0,0,0,0.12)] bg-[#FFFFFF] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#333333]">
                {totalCount > 0
                  ? `Showing ${showingFrom}–${showingTo} of ${totalCount} products`
                  : "No products"}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm text-[#333333]">Sort by</label>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    goToPage(1, { replace: true });
                  }}
                  className="rounded border border-[rgba(0,0,0,0.12)] bg-[#FFFFFF] px-2 py-1.5 text-sm text-[#111111]"
                >
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="popular">Popular</option>
                  <option value="name">Alphabetically A-Z</option>
                </select>
                <button
                  type="button"
                  className={`rounded border px-2 py-1 text-[#555555] ${grid ? "border-[#D72323] text-[#D72323]" : "border-[rgba(0,0,0,0.12)]"}`}
                  onClick={() => setGrid(true)}
                >
                  ⊞
                </button>
                <button
                  type="button"
                  className={`rounded border px-2 py-1 text-[#555555] ${!grid ? "border-[#D72323] text-[#D72323]" : "border-[rgba(0,0,0,0.12)]"}`}
                  onClick={() => setGrid(false)}
                >
                  ☰
                </button>
              </div>
            </div>

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-72 animate-pulse rounded border border-[rgba(0,0,0,0.12)] bg-[#EFEFEF]" />
                ))}
              </div>
            ) : (
              <div className={`grid gap-4 ${grid ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1"}`}>
                {products.map((p) => (
                  <div key={p.id || p._id || p.slug} className={!grid ? "max-w-md" : ""}>
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            )}
            {!products.length && !loading ? <p className="mt-6 text-sm text-[#555555]">No products match current filters.</p> : null}

            {effectiveTotalPages > 1 ? (
              <nav
                className="mt-8 flex flex-wrap items-center justify-center gap-2"
                aria-label="Product pagination"
              >
                {page > 1 ? (
                  <Link
                    href={buildPageHref(pathname, searchParams, page - 1)}
                    className="rounded border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm font-semibold text-[#D72323] hover:border-[#D72323]"
                  >
                    Prev
                  </Link>
                ) : (
                  <span className="rounded border border-transparent px-3 py-2 text-sm text-[#AAAAAA]">Prev</span>
                )}
                {pageNumbers.map((n, idx) => {
                  const prev = pageNumbers[idx - 1];
                  const showEllipsis = prev != null && n - prev > 1;
                  return (
                    <span key={n} className="contents">
                      {showEllipsis ? <span className="px-1 text-sm text-[#888888]">…</span> : null}
                      <Link
                        href={buildPageHref(pathname, searchParams, n)}
                        aria-current={n === page ? "page" : undefined}
                        className={`inline-flex min-w-[36px] items-center justify-center rounded border px-2 py-2 text-sm font-semibold ${
                          n === page
                            ? "border-[#111111] bg-[#111111] text-white"
                            : "border-[rgba(0,0,0,0.12)] bg-white text-[#555555] hover:border-[#D72323] hover:text-[#D72323]"
                        }`}
                      >
                        {n}
                      </Link>
                    </span>
                  );
                })}
                {page < effectiveTotalPages ? (
                  <Link
                    href={buildPageHref(pathname, searchParams, page + 1)}
                    className="rounded border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm font-semibold text-[#D72323] hover:border-[#D72323]"
                  >
                    Next
                  </Link>
                ) : (
                  <span className="rounded border border-transparent px-3 py-2 text-sm text-[#AAAAAA]">Next</span>
                )}
              </nav>
            ) : null}

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

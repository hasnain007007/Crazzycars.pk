"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  activeVariants,
  fitmentModelName,
  formatModelShortLabel,
  formatModelSubtitle,
  formatModelTitle,
  yearsForCatalogEntry,
} from "@/lib/carCatalogDisplay";

const ACCESSORY_FILTERS = [
  { id: "", label: "All" },
  { id: "seat", label: "Seat Covers", keywords: ["seat cover", "seat"] },
  { id: "floor", label: "Floor Mats", keywords: ["floor mat", "floor", "mat"] },
  { id: "steering", label: "Steering", keywords: ["steering"] },
  { id: "lighting", label: "Lighting", keywords: ["light", "led", "lamp"] },
  { id: "care", label: "Care", keywords: ["polish", "wax", "cleaner", "care", "shampoo"] },
];

function pillClass(active) {
  return [
    "rounded-full border px-3 py-1.5 text-sm font-medium transition",
    active
      ? "border-[#C41E1E] bg-[#C41E1E] text-white"
      : "border-[#E5E7EB] bg-white text-[#374151] hover:border-[#C41E1E]",
  ].join(" ");
}

export function CarAccessoriesClient({ makeSlug, modelSlug, carContext, initialYear, initialVariant }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");

  const year = searchParams.get("year") || initialYear || "";
  const variant = searchParams.get("variant") || initialVariant || "";
  const sort = normalizeListingSort(searchParams.get("sort"));
  const view = normalizeListingView(searchParams.get("view"));
  const pageSize = normalizeListingPageSize(searchParams.get("per_page") || searchParams.get("show"), DEFAULT_LISTING_PAGE_SIZE);
  const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);

  const { makeName, entry } = carContext || {};
  const displayName = formatModelShortLabel(entry) || entry?.model || modelSlug;
  const fitmentModel = fitmentModelName(entry) || entry?.model || displayName;
  const years = useMemo(() => yearsForCatalogEntry(entry), [entry]);
  const variants = useMemo(() => activeVariants(entry, year || null), [entry, year]);

  const updateQuery = useCallback(
    (patch, { resetPage = false } = {}) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, val]) => {
        if (val == null || val === "") {
          params.delete(key);
          return;
        }
        if (key === "sort" && val === "default") {
          params.delete(key);
          return;
        }
        if (key === "view" && val === "grid") {
          params.delete(key);
          return;
        }
        if (key === "per_page" && Number(val) === DEFAULT_LISTING_PAGE_SIZE) {
          params.delete(key);
          return;
        }
        params.set(key, String(val));
      });
      if (resetPage) params.delete("page");
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const loadProducts = useCallback(async () => {
    if (!makeName || !fitmentModel) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        make: makeName,
        model: fitmentModel,
        limit: "100",
      });
      if (year) qs.set("year", year);
      if (variant) qs.set("variant", variant);
      const res = await fetch(`/api/products/fitment?${qs.toString()}`);
      const json = await res.json();
      setProducts(json.success ? json.products || [] : []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [makeName, fitmentModel, year, variant]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const filter = ACCESSORY_FILTERS.find((f) => f.id === category);
    if (!filter?.keywords?.length) return products;
    return products.filter((p) => {
      const hay = `${p.name || ""} ${(p.tags || []).join(" ")} ${p.shortDescription || ""}`.toLowerCase();
      return filter.keywords.some((kw) => hay.includes(kw));
    });
  }, [products, category]);

  const sortedProducts = useMemo(
    () => sortProductsClient(filteredProducts, sort),
    [filteredProducts, sort]
  );

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize) || 1);
  const safePage = Math.min(page, totalPages);
  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, safePage, pageSize]);

  useEffect(() => {
    if (page > totalPages && totalPages >= 1) {
      updateQuery({ page: totalPages === 1 ? "" : totalPages });
    }
  }, [page, totalPages, updateQuery]);

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

  const summaryParts = [makeName, displayName];
  if (year) summaryParts.push(String(year));
  if (variant) summaryParts.push(variant);
  const summaryLine = summaryParts.filter(Boolean).join(" ");

  if (!carContext?.entry) {
    return (
      <div className="store-container mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-[#111111]">Vehicle not found</h1>
        <p className="mt-2 text-[#6B7280]">We could not find this car in our catalog.</p>
        <Link href="/" className="mt-6 inline-block text-[#C41E1E] font-semibold hover:underline">
          ← Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <div className="store-container mx-auto max-w-6xl px-4 py-8">
        <nav className="mb-6 text-sm text-[#6B7280]">
          <Link href="/" className="hover:text-[#C41E1E]">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#111111]">
            {makeName} {displayName}
          </span>
        </nav>

        <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
          <div className="flex flex-col sm:flex-row">
            <div className="relative h-48 w-full shrink-0 bg-[#F3F4F6] sm:h-auto sm:w-64">
              {entry.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full min-h-[192px] items-center justify-center bg-gradient-to-br from-[#1A1A1A] to-[#C41E1E] text-5xl font-bold text-white">
                  {displayName.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col justify-center p-6">
              <h1 className="font-heading text-2xl font-bold text-[#111111] sm:text-3xl">
                {makeName} {formatModelTitle(entry)}
              </h1>
              <p className="mt-1 text-[#6B7280]">{formatModelSubtitle(entry)}</p>
              {variants.length ? (
                <p className="mt-2 text-sm text-[#9CA3AF]">Available variants below ↓</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-[#E5E7EB] bg-white p-4 sm:p-5">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Year</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={pillClass(!year)} onClick={() => updateQuery({ year: "", variant: "" }, { resetPage: true })}>
                  All
                </button>
                {years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    className={pillClass(String(year) === String(y))}
                    onClick={() => updateQuery({ year: y, variant: "" }, { resetPage: true })}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {variants.length ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Variant</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={pillClass(!variant)}
                    onClick={() => updateQuery({ variant: "" }, { resetPage: true })}
                  >
                    All
                  </button>
                  {variants.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      className={pillClass(variant === v.name)}
                      onClick={() => updateQuery({ variant: v.name }, { resetPage: true })}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <p className="border-t border-[#F3F4F6] pt-3 text-sm text-[#374151]">
              Showing accessories for: <strong>{summaryLine}</strong>
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-6 lg:flex-row">
          <aside className="lg:w-48 lg:shrink-0">
            <p className="mb-3 text-sm font-semibold text-[#111111]">Categories</p>
            <div className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
              {ACCESSORY_FILTERS.map((f) => (
                <button
                  key={f.id || "all"}
                  type="button"
                  onClick={() => {
                    setCategory(f.id);
                    updateQuery({ page: "" }, { resetPage: true });
                  }}
                  className={`text-left ${pillClass(category === f.id)} lg:w-full`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <ProductListingToolbar
              title={`Accessories for ${makeName} ${displayName}`}
              total={sortedProducts.length}
              page={safePage}
              pageSize={pageSize}
              sort={sort}
              view={view}
              onSortChange={(v) => updateQuery({ sort: v }, { resetPage: true })}
              onPageSizeChange={(n) => updateQuery({ per_page: n }, { resetPage: true })}
              onViewChange={(v) => updateQuery({ view: v })}
            />

            {loading ? (
              <div className={`grid gap-4 ${viewMeta.cols}`}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-[#E5E7EB]" />
                ))}
              </div>
            ) : pageSlice.length ? (
              isRowView ? (
                <div className="pl-rows">
                  {pageSlice.map((p) => (
                    <ProductListingRow
                      key={p.id || p.slug}
                      product={p}
                      mode={view === "detail" ? "detail" : "list"}
                    />
                  ))}
                </div>
              ) : (
                <div className={`grid gap-4 ${viewMeta.cols}`}>
                  {pageSlice.map((p) => (
                    <div key={p.id || p.slug}>
                      <ProductCard product={p} />
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="mt-10 rounded-xl border border-dashed border-[#E5E7EB] bg-white p-10 text-center">
                <p className="text-[#374151]">No accessories found for this selection yet.</p>
                <Link href="/shop" className="mt-4 inline-block text-sm font-semibold text-[#C41E1E] hover:underline">
                  Browse all products →
                </Link>
              </div>
            )}

            <ProductListingPagination
              page={safePage}
              totalPages={totalPages}
              buildHref={buildPageHref}
              onPageChange={(n) => updateQuery({ page: n <= 1 ? "" : n })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import PremiumProductCard from "@/components/home/PremiumProductCard";
import {
  getSaleTab,
  resolveSaleTabId,
  saleApiQueryForTab,
  SALE_DEFAULT_TAB,
  SALE_SSR_LIMIT,
  SALE_TABS,
} from "@/lib/saleTabs";

function SkeletonGrid() {
  return (
    <div className="product-grid grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
        >
          <div className="aspect-[4/3] animate-pulse bg-gray-200" />
          <div className="space-y-3 p-4">
            <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SalePageView({
  initialTab = SALE_DEFAULT_TAB,
  initialProducts = [],
}) {
  const router = useRouter();
  const params = useSearchParams();
  const filterParam = resolveSaleTabId(params.get("filter") || initialTab);
  const urlTab = SALE_TABS.some((t) => t.id === filterParam)
    ? filterParam
    : resolveSaleTabId(initialTab);

  const ssrTab = resolveSaleTabId(initialTab);
  const hasSsrForTab = Array.isArray(initialProducts) && urlTab === ssrTab;

  const [active, setActive] = useState(urlTab);
  const [products, setProducts] = useState(() => (hasSsrForTab ? initialProducts : []));
  const [loading, setLoading] = useState(!hasSsrForTab);
  // Skip the first client fetch when HTML already includes SSR deals for this tab.
  const [skipNextFetch, setSkipNextFetch] = useState(hasSsrForTab);

  useEffect(() => {
    setActive(urlTab);
  }, [urlTab]);

  const load = useCallback(async (tabId) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/products?${saleApiQueryForTab(tabId, { limit: SALE_SSR_LIMIT })}`
      );
      const json = await res.json();
      setProducts(json.success ? json.products || [] : []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (skipNextFetch && active === ssrTab) {
      setSkipNextFetch(false);
      setLoading(false);
      return;
    }
    void load(active);
  }, [active, load, skipNextFetch, ssrTab]);

  function handleTab(id) {
    const next = resolveSaleTabId(id);
    setActive(next);
    setSkipNextFetch(false);
    router.replace(`/sale?filter=${next}`, { scroll: false });
  }

  const activeTab = getSaleTab(active);

  return (
    <main className="min-h-screen bg-white">
      <section className="py-6 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-10 -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hidden md:mx-0 md:flex-wrap md:px-0">
            {SALE_TABS.map((tab) => {
              const isActive = active === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTab(tab.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] uppercase transition-all duration-300 md:px-5 md:py-2.5 md:text-xs md:tracking-[0.15em] ${
                    isActive
                      ? "bg-[#DC2626] text-white shadow-lg shadow-red-200"
                      : "border border-gray-200 bg-white text-gray-700 hover:border-[#DC2626] hover:text-[#DC2626]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900 md:text-3xl">
              {activeTab.label}
            </h2>
            <p className="text-sm text-gray-500">
              {loading
                ? "Loading deals…"
                : `${products.length} ${products.length === 1 ? "product" : "products"} found`}
            </p>
          </div>

          {loading ? (
            <SkeletonGrid />
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center md:p-12">
              <p className="text-base font-semibold text-gray-900">
                No products in this category yet
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Check back soon — new deals are added all the time.
              </p>
              <Link
                href="/shop"
                className="btn-outline-dark mt-6 inline-flex items-center gap-2"
              >
                BROWSE ALL PRODUCTS
              </Link>
            </div>
          ) : (
            <div className="product-grid grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((p) => (
                <PremiumProductCard key={p.id || p.slug} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

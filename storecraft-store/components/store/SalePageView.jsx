"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import PremiumProductCard from "@/components/home/PremiumProductCard";

const TABS = [
  { id: "50off", label: "50% Off", query: "minDiscount=50" },
  { id: "30off", label: "30% Off", query: "minDiscount=30" },
  { id: "under999", label: "Under Rs. 20", query: "maxPrice=20" },
  { id: "under1999", label: "Under Rs. 35", query: "maxPrice=35" },
];

function buildUrl(tabId) {
  const tab = TABS.find((t) => t.id === tabId) || TABS[0];
  return `/api/products?status=active&limit=24&${tab.query}`;
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
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

export default function SalePageView() {
  const router = useRouter();
  const params = useSearchParams();
  const filterParam = (params.get("filter") || "50off").toLowerCase();
  const initialTab = TABS.find((t) => t.id === filterParam)?.id || "50off";

  const [active, setActive] = useState(initialTab);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActive(initialTab);
  }, [initialTab]);

  const load = useCallback(async (tabId) => {
    setLoading(true);
    try {
      const res = await fetch(buildUrl(tabId));
      const json = await res.json();
      setProducts(json.success ? json.products || [] : []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(active);
  }, [active, load]);

  function handleTab(id) {
    setActive(id);
    const url = `/sale?filter=${id}`;
    router.replace(url, { scroll: false });
  }

  const activeTab = TABS.find((t) => t.id === active) || TABS[0];

  return (
    <main className="min-h-screen bg-white">
      {/* Tabs + Products — hero/H1 is server-rendered via SalePageChrome */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          {/* Tabs */}
          <div className="mb-10 -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hidden md:mx-0 md:flex-wrap md:px-0">
            {TABS.map((tab) => {
              const isActive = active === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTab(tab.id)}
                  className={`shrink-0 rounded-full px-5 py-2.5 text-xs font-bold tracking-[0.15em] uppercase transition-all duration-300 ${
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

          {/* Active tab title */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
              {activeTab.label}
            </h2>
            <p className="text-sm text-gray-500">
              {loading
                ? "Loading deals…"
                : `${products.length} ${products.length === 1 ? "product" : "products"} found`}
            </p>
          </div>

          {/* Grid */}
          {loading ? (
            <SkeletonGrid />
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-12 text-center">
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
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
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

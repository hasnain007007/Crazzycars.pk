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
      {/* Hero */}
      <section
        className="relative overflow-hidden py-20 md:py-28"
        style={{
          background:
            "linear-gradient(135deg, #1a0505 0%, #2a0707 50%, #0a0a0a 100%)",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full opacity-50 blur-[140px]"
          style={{ background: "rgba(220,38,38,0.25)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 md:px-8">
          <nav className="mb-6 text-xs tracking-widest text-white/50 uppercase">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span className="mx-2 text-white/30">/</span>
            <span className="text-white/80">Sale</span>
          </nav>
          <span className="mb-4 inline-block rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-[11px] font-semibold tracking-[0.2em] text-red-400 uppercase">
            Limited Time Offers
          </span>
          <h1 className="font-display text-6xl text-white uppercase md:text-8xl">
            Sale
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/60 md:text-lg">
            Discover up to 50% off premium car accessories, from everyday basics to statement designs.
          </p>
        </div>
      </section>

      {/* Tabs + Products */}
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

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ProductCard from "@/components/store/ProductCard";
import { DEFAULT_HOMEPAGE_SETTINGS } from "@/lib/defaultHomepageSettings";

const FALLBACK_TABS = DEFAULT_HOMEPAGE_SETTINGS.hotDeals.tabs;

export default function HotDeals({ settings, initialProducts = null }) {
  const section = settings?.hotDeals || DEFAULT_HOMEPAGE_SETTINGS.hotDeals;
  const tabs = useMemo(
    () =>
      (Array.isArray(section.tabs) && section.tabs.length ? section.tabs : FALLBACK_TABS)
        .filter((t) => t.enabled !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    [section.tabs]
  );
  const defaultFilter = tabs[0]?.filter || "all";
  const ssrSeed = Array.isArray(initialProducts) ? initialProducts : null;
  const ssrSeedRef = useRef(ssrSeed);
  const [active, setActive] = useState(defaultFilter);
  const [products, setProducts] = useState(ssrSeed || []);
  const [loading, setLoading] = useState(ssrSeed == null);
  const [seconds, setSeconds] = useState(6 * 60 * 60);

  // Keep default tab in sync if settings change the first filter key — do not wipe SSR seed.
  useEffect(() => {
    setActive((prev) => (prev ? prev : defaultFilter));
  }, [defaultFilter]);

  const hasDeals = products.length > 0;
  const showFlashTimer = hasDeals && settings?.flashSaleEnabled === true;

  useEffect(() => {
    if (!showFlashTimer) return undefined;
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [showFlashTimer]);

  useEffect(() => {
    const seed = ssrSeedRef.current;
    // SSR / first paint for the default tab — never hit the network.
    if (seed && active === defaultFilter) {
      setProducts(seed);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/products/deals?filter=${encodeURIComponent(active)}&limit=24`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setProducts(Array.isArray(data?.products) ? data.products : []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, defaultFilter]);

  if (section.enabled === false) return null;

  const title = section.title || "On Sale";
  const subtitle = section.subtitle || "Sale prices on kitchen pieces and bags — while stock lasts.";

  return (
    <section
      className="homepage-section py-6 md:py-8"
      style={{
        background: "#FFF8F0",
        borderLeft: "4px solid #C6633B",
      }}
    >
      <div className="store-container">
        <h2 className="font-heading text-[20px] font-bold md:text-[24px]" style={{ color: "#111111" }}>
          {title}
        </h2>
        <div style={{ width: 48, height: 3, background: "#C6633B", marginTop: 8 }} />
        <p className="mt-1.5 text-xs md:mt-2 md:text-sm" style={{ color: "#6B7280" }}>
          {subtitle}
        </p>
        {!loading && showFlashTimer ? (
          <p
            className="mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold"
            style={{ borderColor: "#E5E7EB", color: "#374151", background: "#FFFFFF" }}
          >
            Flash ends in {String(Math.floor(seconds / 3600)).padStart(2, "0")}:
            {String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:
            {String(seconds % 60).padStart(2, "0")}
          </p>
        ) : null}

        <div className="scrollbar-hidden mt-3 flex gap-1.5 overflow-x-auto pb-1 md:mt-6 md:gap-2 md:pb-2">
          {tabs.map((t) => {
            const isActive = active === t.filter;
            return (
              <button
                key={`${t.filter}-${t.label}`}
                type="button"
                onClick={() => setActive(t.filter)}
                className="shrink-0 min-h-[44px] border px-3 py-1.5 text-xs font-semibold transition duration-200 hover:border-[#C6633B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6633B] md:px-4 md:py-2 md:text-sm"
                style={{
                  borderRadius: 99,
                  background: isActive ? "#C6633B" : "#FFFFFF",
                  color: isActive ? "#FFFFFF" : "#374151",
                  borderColor: isActive ? "#C6633B" : "#E5E7EB",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="product-grid mt-4 grid grid-cols-2 gap-2 md:mt-8 md:grid-cols-4 md:gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] animate-pulse rounded-xl bg-gradient-to-r from-[#F3F4F6] via-[#E5E7EB] to-[#F3F4F6] md:aspect-square"
              />
            ))}
          </div>
        ) : hasDeals ? (
          <div className="product-grid mt-4 grid grid-cols-2 gap-2 md:mt-8 md:grid-cols-4 md:gap-5">
            {products.map((p) => (
              <ProductCard key={p.id || p.slug} product={p} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-[#E5E7EB] bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium" style={{ color: "#374151" }}>
              Nothing in this price band right now. Try “All Deals” — thin filters are a catalog-size issue, not a site bug.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

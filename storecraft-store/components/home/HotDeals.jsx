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

  // Keep default tab in sync if settings change the first filter key — do not wipe SSR seed.
  useEffect(() => {
    setActive((prev) => (prev ? prev : defaultFilter));
  }, [defaultFilter]);

  const hasDeals = products.length > 0;

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
    fetch(`/api/products/deals?filter=${encodeURIComponent(active)}&limit=500`)
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

  const maxOff = useMemo(() => {
    let max = 0;
    for (const p of products) {
      const reg = Number(p.regularPrice ?? p.compareAt ?? p.price ?? 0);
      const sale = Number(p.salePrice ?? p.price ?? reg);
      if (reg > sale && sale > 0) {
        max = Math.max(max, Math.round(((reg - sale) / reg) * 100));
      }
    }
    return max;
  }, [products]);

  if (section.enabled === false) return null;

  return (
    <section className="homepage-section flash-sale-section py-6 md:py-14">
      <div className="store-container">
        <header className="flash-sale-header">
          <div className="flash-sale-header__rule" aria-hidden />
          <h2 className="flash-sale-header__title">
            FLASH SALE <span aria-hidden>🔥</span>
          </h2>
          <div className="flash-sale-header__rule" aria-hidden />
        </header>
        <p className="flash-sale-header__sub">
          {maxOff > 0 ? `> GET UP TO ${maxOff}% OFF` : "> LIMITED TIME DEALS"}
        </p>

        <div className="scrollbar-hidden mt-4 flex gap-1.5 overflow-x-auto pb-1 md:mt-6 md:gap-2 md:pb-2">
          {tabs.map((t) => {
            const isActive = active === t.filter;
            return (
              <button
                key={`${t.filter}-${t.label}`}
                type="button"
                onClick={() => setActive(t.filter)}
                className="shrink-0 border px-3 py-1.5 text-xs font-semibold transition duration-200 md:px-4 md:py-2 md:text-sm"
                style={{
                  borderRadius: 99,
                  background: isActive ? "#C41E1E" : "#FFFFFF",
                  color: isActive ? "#FFFFFF" : "#374151",
                  borderColor: isActive ? "#C41E1E" : "#E5E7EB",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="product-grid mt-4 grid grid-cols-2 gap-2 md:mt-8 md:grid-cols-4 md:gap-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] animate-pulse rounded-xl bg-gradient-to-r from-[#F3F4F6] via-[#E5E7EB] to-[#F3F4F6] md:aspect-square"
              />
            ))}
          </div>
        ) : hasDeals ? (
          <div className="product-grid mt-4 grid grid-cols-2 gap-2 md:mt-8 md:grid-cols-4 md:gap-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((p) => (
              <ProductCard key={p.id || p.slug} product={p} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-[#E5E7EB] bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium" style={{ color: "#374151" }}>
              No Hot Deal products yet — turn on Hot Deal for products in admin.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

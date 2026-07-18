"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [active, setActive] = useState(tabs[0]?.filter || "all");
  const hasInitial = Array.isArray(initialProducts);
  const [products, setProducts] = useState(hasInitial ? initialProducts : []);
  const [loading, setLoading] = useState(!hasInitial);
  const [seconds, setSeconds] = useState(6 * 60 * 60);

  useEffect(() => {
    setActive(tabs[0]?.filter || "all");
  }, [tabs]);

  const hasDeals = products.length > 0;

  useEffect(() => {
    if (!hasDeals) return undefined;
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [hasDeals]);

  useEffect(() => {
    if (hasInitial) return undefined;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/products/deals?filter=${encodeURIComponent(active)}&limit=12`)
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
  }, [active, hasInitial]);

  if (section.enabled === false) return null;

  const title = section.title || "🔥 Hot Deals";
  const subtitle = section.subtitle || "Limited time offers — grab them before they're gone!";

  return (
    <section
      className="homepage-section py-12 md:py-20"
      style={{
        background: "#FFF8F0",
        borderLeft: "4px solid #C41E1E",
      }}
    >
      <div className="store-container">
        <h2 className="font-heading text-[32px] font-bold" style={{ color: "#111111" }}>
          {title}
        </h2>
        <div style={{ width: 48, height: 3, background: "#C41E1E", marginTop: 8 }} />
        <p className="mt-2 text-sm" style={{ color: "#6B7280" }}>
          {subtitle}
        </p>
        {!loading && hasDeals && settings?.flashSaleEnabled !== false ? (
          <p
            className="mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold"
            style={{ borderColor: "#E5E7EB", color: "#374151", background: "#FFFFFF" }}
          >
            Flash ends in {String(Math.floor(seconds / 3600)).padStart(2, "0")}:
            {String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:
            {String(seconds % 60).padStart(2, "0")}
          </p>
        ) : null}

        {!loading && hasDeals ? (
          <div className="scrollbar-hidden mt-6 flex gap-2 overflow-x-auto pb-2">
            {tabs.map((t) => {
              const isActive = active === t.filter;
              return (
                <button
                  key={t.filter}
                  type="button"
                  onClick={() => setActive(t.filter)}
                  className="shrink-0 border px-4 py-2 text-sm font-semibold transition duration-200"
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
        ) : null}

        {loading ? (
          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-xl bg-gradient-to-r from-[#F3F4F6] via-[#E5E7EB] to-[#F3F4F6]"
              />
            ))}
          </div>
        ) : hasDeals ? (
          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id || p.slug} product={p} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-[#E5E7EB] bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium" style={{ color: "#374151" }}>
              Coming Soon — fresh deals are being added.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/store/ProductCard";
import { DEFAULT_HOMEPAGE_SETTINGS } from "@/lib/defaultHomepageSettings";

function matchesTab(product, tabId) {
  if (tabId === "all") return true;
  const slugs = [
    product?.categorySlug,
    ...(Array.isArray(product?.categories) ? product.categories.map((c) => c?.slug) : []),
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  return slugs.includes(String(tabId).toLowerCase());
}

function SkeletonCard() {
  return <div className="aspect-square animate-pulse rounded-xl bg-[#F3F4F6]" />;
}

export default function BestSellers({ initialProducts = [], settings }) {
  const hasInitial = Array.isArray(initialProducts) && initialProducts.length > 0;
  const [products, setProducts] = useState(hasInitial ? initialProducts : []);
  const [loading, setLoading] = useState(!hasInitial);
  const tabs = useMemo(() => {
    const fromSettings = settings?.bestSellers?.tabs;
    const source = Array.isArray(fromSettings) && fromSettings.length ? fromSettings : DEFAULT_HOMEPAGE_SETTINGS.bestSellers.tabs;
    return source.filter((t) => t.enabled !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [settings?.bestSellers?.tabs]);
  const [tab, setTab] = useState(tabs[0]?.categorySlug || "all");
  const [visible, setVisible] = useState(8);

  useEffect(() => {
    if (hasInitial) return;
    fetch("/api/products?limit=4&sort=popular")
      .then((r) => r.json())
      .then((data) => {
        const list = data?.products || data?.data || [];
        setProducts(Array.isArray(list) ? list : []);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [hasInitial]);

  useEffect(() => {
    setTab(tabs[0]?.categorySlug || "all");
  }, [tabs]);

  const filtered = useMemo(() => products.filter((p) => matchesTab(p, tab)), [products, tab]);
  const shown = filtered.slice(0, visible);

  // Hide entire section when catalog has no products (after load).
  if (!loading && products.length === 0) return null;

  return (
    <section className="homepage-section bg-white py-12 md:py-20">
      <div className="store-container">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-[32px] font-bold text-[#111111]">{settings?.bestSellers?.title || "Best Sellers"}</h2>
            <div style={{ width: 48, height: 3, background: "#C41E1E", marginTop: 8 }} />
          </div>
          <Link href="/shop" className="text-sm font-semibold text-[#C41E1E] hover:underline">View All →</Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-6 border-b" style={{ borderColor: "#E5E7EB" }}>
          {tabs.map((t) => (
            <button
              key={t.categorySlug}
              type="button"
              onClick={() => {
                setTab(t.categorySlug);
                setVisible(8);
              }}
              className="pb-3 text-sm font-semibold transition"
              style={{
                color: tab === t.categorySlug ? "#C41E1E" : "#6B7280",
                borderBottom: tab === t.categorySlug ? "2px solid #C41E1E" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <p className="mt-8 text-sm text-[#6B7280]">No products in this tab yet.</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
            {shown.map((p) => (
              <ProductCard key={p.id || p.slug} product={p} />
            ))}
          </div>
        )}

        {visible < filtered.length ? (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={() => setVisible((v) => v + 8)}
              className="text-sm font-semibold text-[#111111] underline-offset-4 hover:underline"
            >
              Load more products
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}



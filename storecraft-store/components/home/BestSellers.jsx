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
    const source =
      Array.isArray(fromSettings) && fromSettings.length
        ? fromSettings
        : DEFAULT_HOMEPAGE_SETTINGS.bestSellers.tabs;
    return source.filter((t) => t.enabled !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [settings?.bestSellers?.tabs]);
  const [tab, setTab] = useState(tabs[0]?.categorySlug || "all");

  useEffect(() => {
    if (hasInitial) return;
    fetch("/api/products?featured=true&limit=100")
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

  if (!loading && products.length === 0) return null;

  return (
    <section className="homepage-section bg-white py-6 md:py-8">
      <div className="store-container">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-[20px] font-bold text-[#111111] md:text-[24px]">
              {settings?.bestSellers?.title || "Best Sellers"}
            </h2>
            <div style={{ width: 48, height: 3, background: "#C6633B", marginTop: 8 }} />
          </div>
          <Link href="/shop" className="text-sm font-semibold text-[var(--color-primary)] hover:underline">
            View All →
          </Link>
        </div>

        {tabs.length > 1 ? (
          <div className="mt-4 flex flex-wrap gap-4 border-b md:mt-6 md:gap-6" style={{ borderColor: "#E5E7EB" }}>
            {tabs.map((t) => (
              <button
                key={t.categorySlug}
                type="button"
                onClick={() => setTab(t.categorySlug)}
                className="pb-3 text-sm font-semibold transition"
                style={{
                  color: tab === t.categorySlug ? "#C6633B" : "#6B7280",
                  borderBottom: tab === t.categorySlug ? "2px solid #C6633B" : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : null}

        {loading ? (
          <div className="product-grid mt-4 grid grid-cols-2 gap-2 md:mt-8 md:grid-cols-4 md:gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="mt-8 text-sm text-[#6B7280]">No products in this tab yet.</p>
        ) : (
          <div className="product-grid mt-4 grid grid-cols-2 gap-2 md:mt-8 md:grid-cols-4 md:gap-5">
            {filtered.map((p) => (
              <ProductCard key={p.id || p.slug} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PremiumProductCard from "@/components/home/PremiumProductCard";

export default function NewArrivals() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products?limit=8&sort=newest")
      .then((r) => r.json())
      .then((data) => {
        const list = data?.products || data?.data || [];
        setProducts(Array.isArray(list) ? list.slice(0, 8) : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="bg-[var(--color-background)] py-6 md:py-16">
      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p
              className="font-heading mb-1 text-xs font-bold tracking-[0.15em] uppercase"
              style={{ color: "var(--color-primary)" }}
            >
              Fresh Stock
            </p>
            <h2 className="font-heading text-xl font-bold text-[var(--color-text-primary)] md:text-3xl">
              New Arrivals
            </h2>
          </div>
          <Link
            href="/shop?sort=newest"
            className="text-sm font-semibold uppercase tracking-wide text-[var(--color-primary)] hover:underline"
          >
            View All →
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded bg-[var(--color-border)]" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="rounded border border-[var(--color-border)] bg-white p-8 text-center text-sm text-[var(--color-text-muted)]">
            New products coming soon.
          </p>
        ) : (
          <div className="product-grid grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <PremiumProductCard key={p.id || p.slug} product={{ ...p, isNew: true, newArrival: true }} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

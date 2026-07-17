"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function CategoryCard({ c }) {
  return (
    <Link
      href={c.href}
      className={`group relative overflow-hidden rounded-xl border border-[#E5E7EB] transition duration-200 hover:shadow-[0_10px_30px_rgba(0,0,0,0.12)] ${c.span}`}
    >
      <div className="relative min-h-[180px] bg-gradient-to-br from-[#1a1a1a] to-[#3a1111] p-6">
        <div className="absolute inset-0 bg-black/10 transition duration-200 group-hover:bg-[#C41E1E]/45" />
        <span className="relative z-10 text-3xl">{c.homepageIcon || "🚗"}</span>
        <div className="absolute inset-0 transition duration-200 group-hover:scale-105" />
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <h3 className="font-heading text-2xl font-bold text-white">{c.name}</h3>
          <p className="text-xs text-white/80">{c.productCount || 0} products</p>
        </div>
      </div>
    </Link>
  );
}

export default function CategoryGrid({ title = "Shop by Category", viewAllText = "View all →" }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories?showOnHomepage=true")
      .then((r) => r.json())
      .then((data) => {
        const rows = Array.isArray(data?.categories) ? data.categories : [];
        setCategories(rows.sort((a, b) => (a.homepageOrder || 0) - (b.homepageOrder || 0)));
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="homepage-section bg-white py-12 md:py-20">
      <div className="store-container">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-heading text-[32px] font-bold text-[#111111]">{title}</h2>
          <Link href="/categories" className="text-sm font-medium text-[#C41E1E] hover:underline">
            {viewAllText}
          </Link>
        </div>
        <div style={{ width: 48, height: 3, background: "#C41E1E", marginTop: -24, marginBottom: 24 }} />
        {loading || categories.length === 0 ? (
          <div>
            <h3 className="font-heading text-2xl font-bold text-[#111111]">Categories Coming Soon</h3>
            <p className="mt-2 text-sm text-[#6B7280]">We are adding products to our store</p>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-xl bg-gradient-to-r from-[#F3F4F6] via-[#E5E7EB] to-[#F3F4F6]" />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-12">
            {categories.map((c) => (
              <CategoryCard key={c._id} c={{ ...c, href: `/categories/${c.slug}`, span: "md:col-span-6 lg:col-span-4" }} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { categoryHref } from "@/lib/categories";

function CategoryCard({ c }) {
  const imageUrl = c.imageUrl || "";
  return (
    <Link
      href={c.href}
      className={`group relative overflow-hidden rounded-xl border border-[#E5E7EB] transition duration-200 hover:shadow-[0_10px_30px_rgba(0,0,0,0.12)] ${c.span}`}
    >
      <div className="relative min-h-[180px] overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#3a1111] p-6">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={c.name}
            className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : null}
        <div className="absolute inset-0 bg-black/35 transition duration-200 group-hover:bg-[#C41E1E]/45" />
        {!imageUrl ? <span className="relative z-10 text-3xl">{c.homepageIcon || "🚗"}</span> : null}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <h3 className="font-heading text-2xl font-bold text-white">{c.name}</h3>
          <p className="text-xs text-white/80">Shop collection</p>
        </div>
      </div>
    </Link>
  );
}

function mapCat(c) {
  const imageUrl =
    typeof c.image === "string"
      ? c.image
      : c.image?.url || c.imageUrl || "";
  return {
    name: c.name,
    slug: c.slug,
    href: categoryHref(c.slug),
    homepageIcon: c.homepageIcon || "🚗",
    imageUrl,
  };
}

export default function CategoryGrid({ title = "Shop by Category", viewAllText = "View all →", categories: injected }) {
  const [fetched, setFetched] = useState([]);

  useEffect(() => {
    if (Array.isArray(injected) && injected.length) return;
    let cancelled = false;
    // Prefer featured parents from the tree endpoint (AutoJin-style)
    fetch("/api/categories/tree", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const tree = data?.categories || data?.data || [];
        const parents = (Array.isArray(tree) ? tree : []).filter((c) => c?.slug && c?.name);
        const featured = parents.filter((c) => c.isFeatured);
        const list = (featured.length ? featured : parents).slice(0, 12);
        if (list.length) {
          setFetched(list);
          return;
        }
        return fetch("/api/categories?showOnHomepage=true", { cache: "no-store" })
          .then((r) => r.json())
          .then((all) => {
            if (cancelled) return;
            const cats = all?.categories || all?.data || [];
            setFetched((Array.isArray(cats) ? cats : []).filter((c) => c?.slug && c?.name && !c.parentId));
          });
      })
      .catch(() => {
        if (!cancelled) setFetched([]);
      });
    return () => {
      cancelled = true;
    };
  }, [injected]);

  const categories =
    Array.isArray(injected) && injected.length
      ? injected.map((c) => ({
          ...mapCat(c),
          href: c.href || categoryHref(c.slug),
        }))
      : fetched.map(mapCat);

  if (!categories.length) return null;

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
        <div className="grid gap-5 md:grid-cols-12">
          {categories.map((c) => (
            <CategoryCard
              key={c.slug || c.href || c.name}
              c={{
                ...c,
                href: c.href || categoryHref(c.slug),
                span: "md:col-span-6 lg:col-span-4",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

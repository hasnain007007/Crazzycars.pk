"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { categoryHref } from "@/lib/categories";
import { categoryImageUrl, localMediaPath } from "@/lib/cloudinaryImage";
import { pickHomepageCategories } from "@/lib/homepageCategories";

function masterCategorySrc(url) {
  const path = localMediaPath(url);
  if (path && /-400\.webp$/i.test(path)) return path.replace(/-400\.webp$/i, ".webp");
  return path || url;
}

function CategoryCard({ c, eager }) {
  const imageUrl = c.imageUrl ? categoryImageUrl(c.imageUrl, 360) : "";
  const imageAlt = c.imageAlt || c.name;
  const imageTitle = c.imageTitle || c.name;
  return (
    <Link href={c.href} className="home-category-card group">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={imageAlt}
          title={imageTitle}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "low"}
          decoding="async"
          className="home-category-card__img"
          onLoad={(e) => e.currentTarget.classList.add("is-loaded")}
          ref={(el) => {
            if (el?.complete && el.naturalWidth > 0) el.classList.add("is-loaded");
          }}
          onError={(e) => {
            const img = e.currentTarget;
            const fallback = masterCategorySrc(img.getAttribute("src") || "");
            if (fallback && img.getAttribute("src") !== fallback) {
              img.src = fallback;
              return;
            }
            img.style.visibility = "hidden";
          }}
        />
      ) : (
        <span className="home-category-card__icon" aria-hidden>
          {c.homepageIcon || "🚗"}
        </span>
      )}

      <div className="home-category-card__fade" aria-hidden />

      <div className="home-category-card__label">
        <span className="home-category-card__title" title={c.name}>
          {c.name}
        </span>
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
    imageAlt: c.image?.altText || c.imageAlt || c.name,
    imageTitle: c.image?.title || c.imageTitle || c.name,
  };
}

export default function CategoryGrid({ title = "Shop by Category", viewAllText = "View all →", categories: injected }) {
  const [fetched, setFetched] = useState([]);

  useEffect(() => {
    if (Array.isArray(injected) && injected.length) return;
    let cancelled = false;
    import("@/lib/fetchCategoryTree")
      .then(({ fetchCategoryTree }) => fetchCategoryTree())
      .then((tree) => {
        if (cancelled) return;
        const list = pickHomepageCategories(tree);
        if (list.length) {
          setFetched(list);
          return null;
        }
        return fetch("/api/categories?featured=true").then((r) => r.json());
      })
      .then((all) => {
        if (cancelled || !all) return;
        const cats = all?.categories || all?.data || [];
        // Flat payload: sort shallowest-first so roots still lead the grid.
        const sorted = (Array.isArray(cats) ? cats : [])
          .slice()
          .sort((a, b) => Number(a?.level || 0) - Number(b?.level || 0));
        setFetched(pickHomepageCategories(sorted));
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
      ? pickHomepageCategories(injected).map((c) => ({
          ...mapCat(c),
          href: c.href || categoryHref(c.slug),
        }))
      : fetched.map(mapCat);

  if (!categories.length) return null;

  const viewAllLabel = String(viewAllText || "View all →").replace(/\s*→\s*$/, "").trim() || "View all";

  return (
    <section className="homepage-section bg-white py-6 md:py-20">
      <div className="store-container">
        <div className="mb-3">
          <h2 className="font-heading text-[20px] font-bold text-[#111111] md:text-[32px]">{title}</h2>
          <div style={{ width: 40, height: 3, background: "#C41E1E", marginTop: 8, borderRadius: 2 }} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {categories.map((c, i) => (
            <CategoryCard
              key={c.slug || c.href || c.name}
              eager={i < 4}
              c={{
                ...c,
                href: c.href || categoryHref(c.slug),
              }}
            />
          ))}
        </div>
        <div className="mt-6 flex justify-center">
          <Link
            href="/categories"
            className="inline-flex items-center gap-2 rounded-full border border-[#111111] bg-[#111111] px-4 py-2 text-xs font-semibold transition hover:bg-[#C41E1E] hover:border-[#C41E1E] md:px-6 md:py-3 md:text-sm"
            // Inline: the unlayered `a { color: inherit }` in globals.css outranks Tailwind's layered text-white.
            style={{ color: "#FFFFFF" }}
          >
            {viewAllLabel}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

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

function mapCat(c) {
  const imageUrl =
    typeof c.image === "string" ? c.image : c.image?.url || c.imageUrl || "";
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

export default function CategoryGrid({
  title = "Shop by Category",
  viewAllText = "View all →",
  categories: injected,
}) {
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
      ? injected.map((c) => ({
          ...mapCat(c),
          href: c.href || categoryHref(c.slug),
        }))
      : fetched.map(mapCat);

  if (!categories.length) return null;

  const viewAllLabel =
    String(viewAllText || "View all →").replace(/\s*→\s*$/, "").trim() || "View all";
  const durationSec = Math.max(categories.length * 3.2, 28);

  return (
    <section className="homepage-section bg-white py-6 md:py-16">
      <div className="store-container">
        <div className="mb-3">
          <h2 className="font-heading text-[20px] font-bold text-[#111111] md:text-[32px]">
            {title}
          </h2>
          <div
            style={{ width: 40, height: 3, background: "#C41E1E", marginTop: 8, borderRadius: 2 }}
          />
        </div>

        <div className="subcat-circle-marquee home-cat-marquee mt-4 sm:mt-6" aria-label={title}>
          <div
            className="subcat-circle-track"
            style={{ animationDuration: `${durationSec}s` }}
          >
            {[0, 1].map((copy) =>
              categories.map((c, idx) => {
                const href = c.href || categoryHref(c.slug);
                const imageUrl = c.imageUrl ? categoryImageUrl(c.imageUrl, 360) : "";
                return (
                  <Link
                    key={`${copy}-${c.slug || c.name || idx}`}
                    href={href}
                    className="subcat-circle-item home-cat-marquee__item"
                    tabIndex={copy === 0 ? undefined : -1}
                    aria-hidden={copy === 1 ? true : undefined}
                    style={
                      copy === 0
                        ? { animationDelay: `${Math.min(idx, 12) * 45}ms` }
                        : undefined
                    }
                  >
                    <span className="subcat-circle-ring home-cat-marquee__ring">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt={copy === 0 ? c.imageAlt || c.name : ""}
                          title={c.imageTitle || c.name}
                          loading={copy === 0 && idx < 6 ? "eager" : "lazy"}
                          decoding="async"
                          draggable={false}
                          onError={(e) => {
                            const img = e.currentTarget;
                            const fallback = masterCategorySrc(img.getAttribute("src") || "");
                            if (fallback && img.getAttribute("src") !== fallback) {
                              img.src = fallback;
                              return;
                            }
                            img.style.display = "none";
                          }}
                        />
                      ) : (
                        <span className="subcat-circle-fallback" aria-hidden>
                          {(c.name || "?").charAt(0)}
                        </span>
                      )}
                    </span>
                    <span className="subcat-circle-label home-cat-marquee__label">{c.name}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            href="/categories"
            className="inline-flex items-center gap-2 rounded-full border border-[#111111] bg-[#111111] px-4 py-2 text-xs font-semibold transition hover:bg-[#C41E1E] hover:border-[#C41E1E] md:px-6 md:py-3 md:text-sm"
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

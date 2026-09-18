"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { categoryHref } from "@/lib/categories";
import { categoryImageUrl, localMediaPath } from "@/lib/cloudinaryImage";
import { pickHomepageCategories } from "@/lib/homepageCategories";

/** Fall back to the original master URL (keeps .jpg/.png — never force .webp). */
function masterCategorySrc(thumbUrl, originalUrl) {
  const master = localMediaPath(originalUrl) || String(originalUrl || "").split("?")[0].trim();
  if (master) return master;
  const path = localMediaPath(thumbUrl);
  if (path && /-400\.webp$/i.test(path)) return path.replace(/-400\.webp$/i, ".webp");
  return path || thumbUrl;
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
  const scrollerRef = useRef(null);
  const pausedRef = useRef(false);

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

  function scrollByCards(dir) {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector("[data-home-cat-card]");
    const step = card ? card.getBoundingClientRect().width + 12 : el.clientWidth * 0.7;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  // Gentle auto-scroll like vehicle catalogue — pause on hover/touch.
  useEffect(() => {
    if (categories.length < 5) return undefined;
    const el = scrollerRef.current;
    if (!el) return undefined;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) return undefined;

    const pause = () => {
      pausedRef.current = true;
    };
    const resume = () => {
      pausedRef.current = false;
    };

    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);
    el.addEventListener("focusin", pause);
    el.addEventListener("focusout", resume);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume, { passive: true });

    const tick = () => {
      if (pausedRef.current || !scrollerRef.current) return;
      const node = scrollerRef.current;
      const max = node.scrollWidth - node.clientWidth;
      if (max <= 8) return;
      const card = node.querySelector("[data-home-cat-card]");
      const gap = 12;
      const step = card ? card.getBoundingClientRect().width + gap : 140;
      if (node.scrollLeft >= max - 12) {
        node.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        node.scrollBy({ left: step, behavior: "smooth" });
      }
    };

    const id = window.setInterval(tick, 3000);
    return () => {
      window.clearInterval(id);
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
      el.removeEventListener("focusin", pause);
      el.removeEventListener("focusout", resume);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
    };
  }, [categories.length]);

  if (!categories.length) return null;

  const viewAllLabel =
    String(viewAllText || "View all →").replace(/\s*→\s*$/, "").trim() || "View all";

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

        <div className="home-cat-rail home-cat-marquee relative mt-4 sm:mt-6">
          {categories.length > 4 ? (
            <>
              <button
                type="button"
                aria-label="Scroll categories left"
                onClick={() => scrollByCards(-1)}
                className="home-cat-nav home-cat-nav--prev"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Scroll categories right"
                onClick={() => scrollByCards(1)}
                className="home-cat-nav home-cat-nav--next"
              >
                ›
              </button>
            </>
          ) : null}

          <div
            ref={scrollerRef}
            className="home-cat-slider"
            aria-label={title}
            style={{
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {categories.map((c, idx) => {
              const href = c.href || categoryHref(c.slug);
              const imageUrl = c.imageUrl ? categoryImageUrl(c.imageUrl, 360) : "";
              return (
                <Link
                  key={c.slug || c.name || idx}
                  href={href}
                  data-home-cat-card
                  className="home-cat-marquee__item home-cat-card"
                  style={{ scrollSnapAlign: "start" }}
                >
                  <span className="home-cat-marquee__ring home-cat-card__ring">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt={c.imageAlt || c.name}
                        title={c.imageTitle || c.name}
                        loading={idx < 6 ? "eager" : "lazy"}
                        decoding="async"
                        draggable={false}
                        onError={(e) => {
                          const img = e.currentTarget;
                          const fallback = masterCategorySrc(img.getAttribute("src") || "", c.imageUrl);
                          if (fallback && img.getAttribute("src") !== fallback) {
                            img.src = fallback;
                            return;
                          }
                          img.removeAttribute("alt");
                          img.style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="subcat-circle-fallback" aria-hidden>
                        {(c.name || "?").charAt(0)}
                      </span>
                    )}
                  </span>
                  <span className="home-cat-marquee__label">{c.name}</span>
                </Link>
              );
            })}
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

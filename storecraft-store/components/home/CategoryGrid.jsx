"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { categoryHref } from "@/lib/categories";
import { categoryImageUrl } from "@/lib/cloudinaryImage";

function CategoryCard({ c }) {
  const imageUrl = c.imageUrl ? categoryImageUrl(c.imageUrl, 360) : "";
  const imageAlt = c.imageAlt || c.name;
  const imageTitle = c.imageTitle || c.name;
  return (
    <Link
      href={c.href}
      className="group relative block aspect-square overflow-hidden rounded-2xl bg-[#111111] shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)]"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={imageAlt}
          title={imageTitle}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      ) : (
        <span className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-4xl">
          {c.homepageIcon || "🚗"}
        </span>
      )}

      {/* Soft top + strong bottom scrim — edge to edge, no floating box */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.78) 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
        style={{ background: "rgba(196, 30, 30, 0.28)" }}
      />

      {/* Fixed-height label strip so every card matches */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end px-3 pb-3 pt-10 sm:px-4 sm:pb-4"
        style={{ minHeight: 88 }}
      >
        <h3
          className="font-heading text-[15px] font-bold leading-snug sm:text-[17px]"
          style={{
            color: "#FFFFFF",
            margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textShadow: "0 1px 3px rgba(0,0,0,0.65)",
            minHeight: "2.4em",
          }}
          title={c.name}
        >
          {c.name}
        </h3>
        <span
          className="mt-1.5 inline-flex w-fit items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] transition group-hover:gap-2"
          style={{ color: "#FFFFFF" }}
        >
          Shop
          <span aria-hidden>→</span>
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

const HOMEPAGE_CATEGORY_LIMIT = 10;

/** Flatten the category tree — featured subcategories must surface too, not just roots. */
function flattenTree(nodes, depth = 0, out = []) {
  for (const node of Array.isArray(nodes) ? nodes : []) {
    if (!node) continue;
    out.push({ node, depth });
    flattenTree(node.children, depth + 1, out);
  }
  return out;
}

function pickHomepageCategories(input) {
  const seen = new Set();
  const byDepth = [];

  for (const { node, depth } of flattenTree(input)) {
    if (!node.slug || !node.name) continue;
    if (!(node.isFeatured || node.featured)) continue;
    // A category can hang off several parents, so the same node repeats in the tree.
    const key = String(node._id || node.slug);
    if (seen.has(key)) continue;
    seen.add(key);
    (byDepth[depth] ||= []).push(node);
  }

  // Top-level categories keep priority; featured subcategories fill the rest.
  return byDepth.flatMap((group) => group || []).slice(0, HOMEPAGE_CATEGORY_LIMIT);
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
    <section className="homepage-section bg-white py-12 md:py-20">
      <div className="store-container">
        <div className="mb-3">
          <h2 className="font-heading text-[28px] font-bold text-[#111111] sm:text-[32px]">{title}</h2>
          <div style={{ width: 48, height: 3, background: "#C41E1E", marginTop: 10, borderRadius: 2 }} />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {categories.map((c) => (
            <CategoryCard
              key={c.slug || c.href || c.name}
              c={{
                ...c,
                href: c.href || categoryHref(c.slug),
              }}
            />
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Link
            href="/categories"
            className="inline-flex items-center gap-2 rounded-full border border-[#111111] bg-[#111111] px-6 py-3 text-sm font-semibold transition hover:bg-[#C41E1E] hover:border-[#C41E1E]"
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

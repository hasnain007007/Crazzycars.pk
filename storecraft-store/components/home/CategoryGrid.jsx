"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { categoryHref } from "@/lib/categories";
import { categoryImageUrl, cloudinarySrcSet } from "@/lib/cloudinaryImage";

function CategoryCard({ c }) {
  const imageUrl = c.imageUrl ? categoryImageUrl(c.imageUrl, 360) : "";
  const imageSrcSet = c.imageUrl
    ? cloudinarySrcSet(c.imageUrl, [256, 360, 480], { crop: "fill" })
    : "";
  const imageAlt = c.imageAlt || c.name;
  const imageTitle = c.imageTitle || c.name;
  return (
    <Link href={c.href} className="home-category-card group">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          srcSet={imageSrcSet || undefined}
          sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 20vw"
          alt={imageAlt}
          title={imageTitle}
          loading="lazy"
          decoding="async"
          className="home-category-card__img"
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
    <section className="homepage-section bg-white py-6 md:py-20">
      <div className="store-container">
        <div className="mb-3">
          <h2 className="font-heading text-[20px] font-bold text-[#111111] md:text-[32px]">{title}</h2>
          <div style={{ width: 40, height: 3, background: "#C41E1E", marginTop: 8, borderRadius: 2 }} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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

"use client";

/**
 * Carzstore-style category product rails:
 * italic title + subcategory tabs + promo banner + horizontal product carousel.
 * Uses live categories/products only — no fake Carzstore collections.
 */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ProductCard from "@/components/store/ProductCard";
import { categoryHref } from "@/lib/categories";
import { categoryImageUrl } from "@/lib/cloudinaryImage";
import { fetchCategoryTree, seedCategoryTree } from "@/lib/fetchCategoryTree";

/** Homepage rails — only shown when the root has storefront products. */
const RAIL_CONFIG = [
  {
    slug: "led-lighting",
    title: "LED & Lighting",
    tagline: "Headlights, indicators, ambient & more",
    accent: "#C41E1E",
  },
  {
    slug: "exterior",
    title: "Exterior",
    tagline: "Body kits, splitters, mirrors & styling",
    accent: "#111111",
  },
  {
    slug: "carbon-fiber",
    title: "Carbon Fiber",
    tagline: "Interior & exterior carbon trim upgrades",
    accent: "#1F2937",
  },
  {
    slug: "interior",
    title: "Interior",
    tagline: "Cabin comfort, mats, covers & lighting",
    accent: "#7F1D1D",
  },
];

function findNode(tree, slug) {
  const target = String(slug || "").toLowerCase();
  const walk = (nodes) => {
    for (const n of nodes || []) {
      if (String(n?.slug || "").toLowerCase() === target) return n;
      const hit = walk(n.children);
      if (hit) return hit;
    }
    return null;
  };
  return walk(tree);
}

function nodeImage(node) {
  if (!node) return "";
  const raw =
    typeof node.image === "string"
      ? node.image
      : node.image?.url || node.imageUrl || "";
  return raw ? categoryImageUrl(raw, 640) : "";
}

function buildTabs(root) {
  const kids = (root?.children || [])
    .filter((c) => c?.slug && c?.name)
    .slice(0, 5)
    .map((c) => ({ label: c.name, slug: c.slug }));
  return [{ label: "All", slug: root?.slug || "all" }, ...kids];
}

function CategoryRail({ config, root }) {
  const tabs = useMemo(() => buildTabs(root), [root]);
  const [activeSlug, setActiveSlug] = useState(config.slug);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const scrollerRef = useRef(null);
  const cacheRef = useRef(new Map());

  useEffect(() => {
    setActiveSlug(config.slug);
  }, [config.slug]);

  useEffect(() => {
    let cancelled = false;
    const slug = activeSlug || config.slug;
    const cached = cacheRef.current.get(slug);
    if (cached) {
      setProducts(cached);
      setLoading(false);
      setPage(0);
      return undefined;
    }
    setLoading(true);
    fetch(`/api/products?category=${encodeURIComponent(slug)}&limit=16&sort=featured`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.products) ? data.products : [];
        cacheRef.current.set(slug, list);
        setProducts(list);
        setPage(0);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSlug, config.slug]);

  const pageCount = Math.max(1, Math.ceil(products.length / 4));
  const pageRef = useRef(0);
  const scrollingRef = useRef(false);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const goToPage = useCallback(
    (idx) => {
      const el = scrollerRef.current;
      if (!el) return;
      const clamped = Math.min(pageCount - 1, Math.max(0, idx));
      pageRef.current = clamped;
      setPage(clamped);
      const max = el.scrollWidth - el.clientWidth;
      const target = pageCount <= 1 ? 0 : (clamped / (pageCount - 1)) * max;
      scrollingRef.current = true;
      el.scrollTo({ left: target, behavior: "smooth" });
      window.setTimeout(() => {
        scrollingRef.current = false;
      }, 420);
    },
    [pageCount]
  );

  const scrollByPage = useCallback(
    (dir) => {
      goToPage(pageRef.current + dir);
    },
    [goToPage]
  );

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      if (scrollingRef.current) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) {
        pageRef.current = 0;
        setPage(0);
        return;
      }
      const ratio = el.scrollLeft / max;
      const next = Math.min(pageCount - 1, Math.round(ratio * (pageCount - 1)));
      pageRef.current = next;
      setPage(next);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [pageCount, products.length]);

  if (!root) return null;
  if (!loading && products.length === 0 && activeSlug === config.slug) return null;

  const href = categoryHref(config.slug);
  const image = nodeImage(root);

  return (
    <section className="cat-showcase" aria-labelledby={`cat-rail-${config.slug}`}>
      <div className="store-container">
        <div className="cat-showcase__head">
          <h2 id={`cat-rail-${config.slug}`} className="cat-showcase__title">
            {config.title}
          </h2>
          <div className="cat-showcase__tabs" role="tablist" aria-label={`${config.title} filters`}>
            {tabs.map((t) => {
              const on = activeSlug === t.slug;
              return (
                <button
                  key={t.slug}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  className={`cat-showcase__tab${on ? " is-on" : ""}`}
                  onClick={() => setActiveSlug(t.slug)}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="cat-showcase__body">
          <Link
            href={href}
            className="cat-showcase__promo"
            style={{ background: `linear-gradient(165deg, ${config.accent} 0%, #111111 72%)` }}
          >
            <div className="cat-showcase__promo-top">
              <span className="cat-showcase__promo-brand">CrazzyCars.pk</span>
              <p className="cat-showcase__promo-tag">Apki Gaari, Hamari Zimmedari</p>
              <p className="cat-showcase__promo-title">{config.title}</p>
              <p className="cat-showcase__promo-sub">{config.tagline}</p>
            </div>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="cat-showcase__promo-img" loading="lazy" />
            ) : (
              <div className="cat-showcase__promo-fallback" aria-hidden>
                🚗
              </div>
            )}
            <span className="cat-showcase__promo-cta">Shop collection →</span>
          </Link>

          <div className="cat-showcase__rail">
            {products.length > 4 ? (
              <>
                <button
                  type="button"
                  className="cat-showcase__nav cat-showcase__nav--prev"
                  aria-label="Previous products"
                  onClick={() => scrollByPage(-1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="cat-showcase__nav cat-showcase__nav--next"
                  aria-label="Next products"
                  onClick={() => scrollByPage(1)}
                >
                  ›
                </button>
              </>
            ) : null}

            <div ref={scrollerRef} className="cat-showcase__scroller">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="cat-showcase__card-wrap">
                      <div className="cat-showcase__skel" />
                    </div>
                  ))
                : products.map((p) => (
                    <div key={p.id || p.slug} className="cat-showcase__card-wrap">
                      <ProductCard product={p} />
                    </div>
                  ))}
            </div>

            {pageCount > 1 ? (
              <div className="cat-showcase__dots" role="tablist" aria-label="Product pages">
                {Array.from({ length: pageCount }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Page ${i + 1}`}
                    aria-current={page === i ? "true" : undefined}
                    className={`cat-showcase__dot${page === i ? " is-on" : ""}`}
                    onClick={() => goToPage(i)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function CategoryShowcaseRails({ initialTree = null }) {
  const [tree, setTree] = useState(() => (Array.isArray(initialTree) ? initialTree : []));

  useEffect(() => {
    if (Array.isArray(initialTree) && initialTree.length) {
      seedCategoryTree(initialTree);
      setTree(initialTree);
      return undefined;
    }
    let cancelled = false;
    fetchCategoryTree().then((t) => {
      if (!cancelled) setTree(Array.isArray(t) ? t : []);
    });
    return () => {
      cancelled = true;
    };
  }, [initialTree]);

  const rails = useMemo(
    () =>
      RAIL_CONFIG.map((cfg) => ({
        config: cfg,
        root: findNode(tree, cfg.slug),
      })).filter((r) => r.root),
    [tree]
  );

  if (!rails.length) return null;

  return (
    <div className="cat-showcase-stack">
      {rails.map(({ config, root }) => (
        <CategoryRail key={config.slug} config={config} root={root} />
      ))}
    </div>
  );
}

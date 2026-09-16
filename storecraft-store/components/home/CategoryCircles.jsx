"use client";

/**
 * Homepage category circles — Carzstore-style icon strip using our live categories.
 */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { categoryHref } from "@/lib/categories";
import { categoryImageUrl } from "@/lib/cloudinaryImage";

/** Preferred homepage circle order — only shown if the slug exists in catalog. */
const CIRCLE_ORDER = [
  "interior",
  "exterior",
  "car-care-safety",
  "led-lighting",
  "carbon-fiber",
  "universal-accessories",
  "gadgets",
  "utility",
  "fragrances",
];

const CIRCLE_META = {
  interior: { label: "Interior", color: "#F5C542", Icon: IconSeat },
  exterior: { label: "Exterior", color: "#4FD1C5", Icon: IconMirror },
  "car-care-safety": { label: "Car Care", color: "#B794F4", Icon: IconCare },
  "led-lighting": { label: "Lighting", color: "#A3E635", Icon: IconBulb },
  "carbon-fiber": { label: "Carbon", color: "#94A3B8", Icon: IconCarbon },
  "universal-accessories": { label: "Universal", color: "#60A5FA", Icon: IconUniversal },
  gadgets: { label: "Gadgets", color: "#38BDF8", Icon: IconGadget },
  utility: { label: "Utility", color: "#34D399", Icon: IconUtility },
  fragrances: { label: "Fragrance", color: "#F472B6", Icon: IconFragrance },
};

function IconSeat() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M16 34V18c0-4 3-7 8-7s8 3 8 7v16" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M14 34h20" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M18 24h12" stroke="#111" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconMirror() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="10" y="16" width="18" height="14" rx="3" stroke="#111" strokeWidth="2.2" />
      <path d="M28 20h8l4 4v6h-6" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="19" cy="23" r="2.5" fill="#111" />
    </svg>
  );
}
function IconCare() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M12 28c0-6 5-11 12-11s12 5 12 11" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M10 30h28" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16 20c2-4 6-6 8-6s6 2 8 6" stroke="#111" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconBulb() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M24 10a10 10 0 0 0-6 18v4h12v-4a10 10 0 0 0-6-18Z" stroke="#111" strokeWidth="2.2" />
      <path d="M20 36h8M21 40h6" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
function IconCarbon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M12 30l12-16 12 16H12Z" stroke="#111" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M18 30l6-8 6 8" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
function IconUniversal() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="12" stroke="#111" strokeWidth="2.2" />
      <path d="M12 24h24M24 12c4 4 4 16 0 24M24 12c-4 4-4 16 0 24" stroke="#111" strokeWidth="2" />
    </svg>
  );
}
function IconGadget() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="14" y="10" width="20" height="28" rx="3" stroke="#111" strokeWidth="2.2" />
      <circle cx="24" cy="32" r="1.8" fill="#111" />
    </svg>
  );
}
function IconUtility() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M16 32l4-14h8l4 14" stroke="#111" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M14 32h20" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="20" cy="34" r="2" fill="#111" />
      <circle cx="28" cy="34" r="2" fill="#111" />
    </svg>
  );
}
function IconFragrance() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M22 12h4v6h-4z" stroke="#111" strokeWidth="2" />
      <path d="M16 18h16l-2 18H18l-2-18Z" stroke="#111" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

function mapInjected(list) {
  return (Array.isArray(list) ? list : [])
    .map((c) => ({
      name: c.name,
      slug: c.slug,
      href: c.href || categoryHref(c.slug),
      imageUrl: typeof c.image === "string" ? c.image : c.image?.url || c.imageUrl || "",
    }))
    .filter((c) => c.slug && c.name);
}

function pickCircleCategories(available) {
  const bySlug = new Map(available.map((c) => [String(c.slug).toLowerCase(), c]));
  const ordered = [];
  for (const slug of CIRCLE_ORDER) {
    const hit = bySlug.get(slug);
    if (hit) ordered.push(hit);
  }
  // Fill remaining featured roots not in preferred list (up to 9)
  if (ordered.length < 9) {
    for (const c of available) {
      if (ordered.some((o) => o.slug === c.slug)) continue;
      ordered.push(c);
      if (ordered.length >= 9) break;
    }
  }
  return ordered.slice(0, 9);
}

export default function CategoryCircles({ categories: injected }) {
  const [fetched, setFetched] = useState([]);

  useEffect(() => {
    if (Array.isArray(injected) && injected.length) return undefined;
    let cancelled = false;
    import("@/lib/fetchCategoryTree")
      .then(({ fetchCategoryTree }) => fetchCategoryTree())
      .then((tree) => {
        if (cancelled) return;
        const roots = (Array.isArray(tree) ? tree : [])
          .filter((n) => n?.slug && n?.name)
          .map((n) => ({
            name: n.name,
            slug: n.slug,
            href: categoryHref(n.slug),
            imageUrl: typeof n.image === "string" ? n.image : n.image?.url || "",
          }));
        setFetched(roots);
      })
      .catch(() => {
        if (!cancelled) setFetched([]);
      });
    return () => {
      cancelled = true;
    };
  }, [injected]);

  const available = useMemo(
    () => (Array.isArray(injected) && injected.length ? mapInjected(injected) : fetched),
    [injected, fetched]
  );

  const circles = useMemo(() => pickCircleCategories(available), [available]);

  if (!circles.length) return null;

  return (
    <section className="home-cat-circles" aria-label="Shop by category">
      <div className="store-container">
        <div className="home-cat-circles__row">
          {circles.map((c) => {
            const meta = CIRCLE_META[String(c.slug).toLowerCase()] || null;
            const label = meta?.label || c.name;
            const color = meta?.color || "#E5E7EB";
            const Icon = meta?.Icon || null;
            const img = c.imageUrl ? categoryImageUrl(c.imageUrl, 160) : "";
            return (
              <Link key={c.slug} href={c.href || categoryHref(c.slug)} className="home-cat-circle">
                <span className="home-cat-circle__ring" style={{ background: color }}>
                  {Icon ? (
                    <span className="home-cat-circle__icon">
                      <Icon />
                    </span>
                  ) : img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <span className="home-cat-circle__fallback" aria-hidden>
                      🚗
                    </span>
                  )}
                </span>
                <span className="home-cat-circle__label">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

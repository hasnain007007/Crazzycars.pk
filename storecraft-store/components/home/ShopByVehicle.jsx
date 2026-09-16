"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchCarCatalogClient, seedCarCatalogClient } from "@/lib/fetchCarCatalogClient";
import { stripBrandPrefix } from "@/lib/carCatalogDisplay";

function yearLabel(v) {
  const from = v.yearFrom;
  const to = v.yearTo;
  if (!from) return "";
  if (to == null || to >= new Date().getFullYear()) return `${from}–Present`;
  return `${from}–${to}`;
}

function mapCatalogToItems(data) {
  if (!data) return [];
  const vehicles = Array.isArray(data?.vehicles) ? data.vehicles : [];
  const popular = Array.isArray(data?.popular) ? data.popular : [];
  const source = vehicles.length ? vehicles : popular;
  if (source.length) {
    return source.map((p, idx) => {
      const raw = p.nickname || p.generation || p.model;
      return {
        make: p.make,
        model: stripBrandPrefix(p.make, raw),
        slug: p.slug,
        yearFrom: p.yearFrom,
        yearTo: p.yearTo,
        image: p.image || "",
        href: `/cars/${p.slug}`,
        sortIndex: idx,
        isPopular: Boolean(p.isPopular),
        popularOrder: Number(p.popularOrder) || 9999,
      };
    });
  }
  const carData = data?.carData || {};
  const flat = [];
  for (const [make, models] of Object.entries(carData)) {
    for (const m of models || []) {
      const raw = m.nickname || m.generation || m.model;
      flat.push({
        make,
        model: stripBrandPrefix(make, raw),
        slug: m.slug,
        yearFrom: m.yearFrom,
        yearTo: m.yearTo,
        image: m.image || "",
        href: `/cars/${m.slug}`,
        sortIndex: flat.length,
        isPopular: Boolean(m.isPopular),
        popularOrder: Number(m.popularOrder) || 9999,
      });
    }
  }
  return flat.sort((a, b) => {
    if (a.isPopular !== b.isPopular) return a.isPopular ? -1 : 1;
    if (a.isPopular && b.isPopular) return a.popularOrder - b.popularOrder;
    return `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`);
  });
}

/**
 * Compact vehicle browser — circular photos + single-line make chips + auto-scroll.
 */
export default function ShopByVehicle({ initialCatalog = null }) {
  const seeded = mapCatalogToItems(initialCatalog);
  const [items, setItems] = useState(seeded);
  const [loading, setLoading] = useState(!seeded.length);
  const [activeMake, setActiveMake] = useState("");
  const scrollerRef = useRef(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const fromProps = mapCatalogToItems(initialCatalog);
    if (fromProps.length) {
      seedCarCatalogClient(initialCatalog);
      setItems(fromProps);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    fetchCarCatalogClient()
      .then((data) => {
        if (cancelled) return;
        setItems(mapCatalogToItems(data));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialCatalog]);

  const byMake = useMemo(() => {
    const map = new Map();
    for (const v of items) {
      const make = v.make || "Other";
      if (!map.has(make)) map.set(make, []);
      map.get(make).push(v);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const visible = useMemo(() => {
    if (!activeMake) return items;
    return items.filter((i) => i.make === activeMake);
  }, [items, activeMake]);

  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTo({ left: 0, behavior: "smooth" });
  }, [activeMake]);

  function scrollByCards(dir) {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector("[data-vehicle-card]");
    const step = card ? card.getBoundingClientRect().width + 10 : el.clientWidth * 0.7;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  useEffect(() => {
    if (loading || visible.length < 4) return undefined;
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
      const card = node.querySelector("[data-vehicle-card]");
      const gap = 10;
      const step = card
        ? card.getBoundingClientRect().width + gap
        : Math.max(110, node.clientWidth * 0.28);
      if (node.scrollLeft >= max - 12) {
        node.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        node.scrollBy({ left: step, behavior: "smooth" });
      }
    };

    const id = window.setInterval(tick, 2800);
    return () => {
      window.clearInterval(id);
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
      el.removeEventListener("focusin", pause);
      el.removeEventListener("focusout", resume);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
    };
  }, [loading, visible.length, activeMake]);

  if (!loading && !items.length) return null;

  return (
    <section id="shop-by-vehicle" className="sbv overflow-x-hidden border-t border-[#EFEFEF] bg-[#F8F8F8] py-3.5 md:py-[18px]">
      <div className="store-container">
        <div className="sbv-head mb-2.5 flex items-baseline justify-between gap-3">
          <div className="sbv-head__titles flex flex-wrap items-baseline gap-x-3.5 gap-y-2">
            <h2 className="sbv-title font-heading m-0 text-[16px] font-bold leading-tight text-[#111111] md:text-[22px]">
              Shop By Your Vehicle
            </h2>
            <Link
              href="/cars"
              className="sbv-all text-[11px] font-bold whitespace-nowrap text-[#C41E1E] hover:underline md:text-xs"
            >
              View all →
            </Link>
          </div>
        </div>

        {!loading && byMake.length > 0 ? (
          <div
            className="sbv-pills mb-3 flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Filter by make"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!activeMake}
              onClick={() => setActiveMake("")}
              className={`sbv-pill h-7 shrink-0 rounded-full px-2.5 text-[10px] font-bold whitespace-nowrap transition md:text-[11px] ${
                !activeMake
                  ? "is-on border border-[#C41E1E] bg-[#C41E1E] text-white"
                  : "border border-[#E5E7EB] bg-white text-[#374151] hover:border-[#C41E1E]/45"
              }`}
            >
              All · {items.length}
            </button>
            {byMake.map(([make, list]) => (
              <button
                key={make}
                type="button"
                role="tab"
                aria-selected={activeMake === make}
                onClick={() => setActiveMake(make)}
                className={`sbv-pill h-7 shrink-0 rounded-full px-2.5 text-[10px] font-bold whitespace-nowrap transition md:text-[11px] ${
                  activeMake === make
                    ? "is-on border border-[#C41E1E] bg-[#C41E1E] text-white"
                    : "border border-[#E5E7EB] bg-white text-[#374151] hover:border-[#C41E1E]/45"
                }`}
              >
                {make} · {list.length}
              </button>
            ))}
          </div>
        ) : null}

        <div className="sbv-rail relative">
          {visible.length > 4 ? (
            <>
              <button
                type="button"
                aria-label="Scroll vehicles left"
                onClick={() => scrollByCards(-1)}
                className="sbv-nav sbv-nav--prev absolute top-[52px] left-0 z-10 hidden h-8 w-8 -translate-y-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-lg text-[#111111] shadow-sm md:flex"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Scroll vehicles right"
                onClick={() => scrollByCards(1)}
                className="sbv-nav sbv-nav--next absolute top-[52px] right-0 z-10 hidden h-8 w-8 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-lg text-[#111111] shadow-sm md:flex"
              >
                ›
              </button>
            </>
          ) : null}

          <div
            ref={scrollerRef}
            className="sbv-slider flex gap-2.5 overflow-x-auto px-1 pb-1.5 md:gap-3 md:px-9"
            style={{
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "thin",
            }}
          >
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="sbv-card flex w-[120px] shrink-0 flex-col items-center gap-1.5 md:w-[156px]"
                    aria-hidden
                  >
                    <span className="sbv-ring block h-[108px] w-[108px] animate-pulse rounded-full bg-[#E8E8E8] md:h-[148px] md:w-[148px]" />
                    <span className="h-2 w-[70%] rounded bg-[#E8E8E8]" />
                    <span className="h-2 w-[45%] rounded bg-[#E8E8E8]" />
                  </div>
                ))
              : visible.map((v) => (
                  <Link
                    key={`${v.make}-${v.slug}`}
                    href={v.href}
                    data-vehicle-card
                    className="sbv-card group flex w-[120px] shrink-0 flex-col items-center gap-1.5 text-inherit no-underline md:w-[156px]"
                    style={{ scrollSnapAlign: "start" }}
                  >
                    <span className="sbv-ring relative flex h-[108px] w-[108px] items-center justify-center overflow-hidden rounded-full border-2 border-[#E8E8E8] bg-white transition group-hover:border-[#C41E1E] group-hover:shadow-[0_8px_18px_rgba(196,30,30,0.16)] md:h-[148px] md:w-[148px]">
                      {v.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={v.image}
                          alt={`${v.make} ${v.model}`}
                          className="h-full w-full object-contain object-center p-2 transition group-hover:scale-[1.04] md:p-2.5"
                          loading="lazy"
                          decoding="async"
                          fetchPriority="low"
                          draggable={false}
                        />
                      ) : (
                        <span className="sbv-fallback text-[26px] leading-none" aria-hidden>
                          🚗
                        </span>
                      )}
                    </span>
                    <span className="sbv-make max-w-full truncate text-center text-[8px] font-extrabold tracking-wider text-[#C41E1E] uppercase md:text-[10px]">
                      {v.make}
                    </span>
                    <span className="sbv-model font-heading max-w-full truncate text-center text-[11px] font-bold leading-tight text-[#111111] md:text-sm">
                      {v.model}
                    </span>
                    {yearLabel(v) ? (
                      <span className="sbv-years max-w-full truncate text-center text-[8px] text-[#6B7280] md:text-[10px]">
                        {yearLabel(v)}
                      </span>
                    ) : null}
                  </Link>
                ))}
          </div>
        </div>
      </div>
    </section>
  );
}

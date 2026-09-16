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
 * Vehicle browser — square photo cards + auto-scrolling horizontal slider.
 * Empty generations (0 storefront products) are filtered out upstream in
 * fetchCarCatalogServer / GET /api/car-catalog — Vehicle/CarCatalog rows stay in Mongo.
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
    const step = card ? card.getBoundingClientRect().width + 12 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  // Auto-scroll: advance one card; loop to start at the end. Pause on hover/touch/focus.
  useEffect(() => {
    if (loading || visible.length < 3) return undefined;
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
      const gap = 12;
      const step = card ? card.getBoundingClientRect().width + gap : Math.max(160, node.clientWidth * 0.35);
      if (node.scrollLeft >= max - 12) {
        node.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        node.scrollBy({ left: step, behavior: "smooth" });
      }
    };

    const id = window.setInterval(tick, 3200);
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
    <section id="shop-by-vehicle" className="border-t border-[#EFEFEF] bg-[#F8F8F8] pb-5 pt-3 md:pb-10 md:pt-6">
      <div className="store-container">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#C41E1E]">
              Or browse by model
            </p>
            <h2 className="font-heading mt-0.5 text-[18px] font-bold text-[#111111] sm:text-[22px]">
              Shop By Your Vehicle
            </h2>
            <Link href="/cars" className="mt-1 inline-block text-xs font-semibold text-[#C41E1E] hover:underline">
              View all cars →
            </Link>
          </div>

          {!loading && byMake.length > 0 ? (
            <div className="shop-by-vehicle-pills -mx-1 flex gap-1.5 overflow-x-auto pb-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible">
              <button
                type="button"
                onClick={() => setActiveMake("")}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition sm:px-3 sm:text-[11px] ${
                  !activeMake
                    ? "bg-[#C41E1E] text-white"
                    : "border border-[#E5E7EB] bg-white text-[#374151] hover:border-[#C41E1E]/40"
                }`}
              >
                All · {items.length}
              </button>
              {byMake.map(([make, list]) => (
                <button
                  key={make}
                  type="button"
                  onClick={() => setActiveMake(make)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition sm:px-3 sm:text-[11px] ${
                    activeMake === make
                      ? "bg-[#C41E1E] text-white"
                      : "border border-[#E5E7EB] bg-white text-[#374151] hover:border-[#C41E1E]/40"
                  }`}
                >
                  {make} · {list.length}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="relative mt-3 md:mt-4">
          {visible.length > 3 ? (
            <>
              <button
                type="button"
                aria-label="Scroll vehicles left"
                onClick={() => scrollByCards(-1)}
                className="absolute -left-1 top-[38%] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-lg shadow-sm md:flex"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Scroll vehicles right"
                onClick={() => scrollByCards(1)}
                className="absolute -right-1 top-[38%] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-lg shadow-sm md:flex"
              >
                ›
              </button>
            </>
          ) : null}

          <div
            ref={scrollerRef}
            className="shop-by-vehicle-slider flex gap-3 overflow-x-auto pb-2"
            style={{
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "thin",
            }}
          >
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-[31%] shrink-0 animate-pulse sm:w-[18%]"
                  >
                    <div className="aspect-[4/3] rounded-xl bg-[#E8E8E8] sm:aspect-square" />
                    <div className="mt-2 h-10 rounded bg-[#E8E8E8]" />
                  </div>
                ))
              : visible.map((v) => (
                  <Link
                    key={`${v.make}-${v.slug}`}
                    href={v.href}
                    data-vehicle-card
                    className="group w-[31%] shrink-0 overflow-hidden rounded-xl border border-[#E8E8E8] bg-white transition hover:border-[#C41E1E]/45 hover:shadow-md sm:w-[18%]"
                    style={{ scrollSnapAlign: "start", contentVisibility: "auto", containIntrinsicSize: "160px" }}
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F3F4F6] sm:aspect-square">
                      {v.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={v.image}
                          alt={`${v.make} ${v.model}`}
                          className="h-full w-full object-contain object-center p-2 transition duration-300 group-hover:scale-105 sm:p-3"
                          loading="lazy"
                          decoding="async"
                          fetchPriority="low"
                        />
                      ) : (
                        /* TODO: upload real CarCatalog images for BAIC BJ40, Chery Tiggo 4/8 Pro,
                           Deepal S05, DFSK Glory 580, KIA Sorento/Stonic, Nissan Note, Proton X70.
                           Keep emoji fallback — these generations have sellable products. */
                        <div className="flex h-full items-center justify-center text-3xl text-[#9CA3AF]">🚗</div>
                      )}
                    </div>
                    <div className="px-1.5 py-1.5 sm:px-2.5 sm:py-2">
                      <p className="truncate text-[8px] font-bold uppercase tracking-wider text-[#C41E1E] sm:text-[9px]">
                        {v.make}
                      </p>
                      <p className="font-heading truncate text-[12px] font-bold leading-tight text-[#111111] sm:text-[13px]">
                        {v.model}
                      </p>
                      {yearLabel(v) ? (
                        <p className="mt-0.5 truncate text-[9px] text-[#6B7280] sm:text-[10px]">{yearLabel(v)}</p>
                      ) : null}
                    </div>
                  </Link>
                ))}
          </div>
        </div>
      </div>
    </section>
  );
}

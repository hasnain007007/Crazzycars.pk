"use client";

import Image from "next/image";
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
  // Prefer ordered full list (popular first from server), else popular slice.
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
 * Vehicle browser — horizontal slider (~4 cards visible), ordered by popular then A–Z.
 */
export default function ShopByVehicle({ initialCatalog = null }) {
  const seeded = mapCatalogToItems(initialCatalog);
  const [items, setItems] = useState(seeded);
  const [loading, setLoading] = useState(!seeded.length);
  const [activeMake, setActiveMake] = useState("");
  const scrollerRef = useRef(null);

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
    const step = card ? card.getBoundingClientRect().width + 10 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step * 2, behavior: "smooth" });
  }

  if (!loading && !items.length) return null;

  return (
    <section id="shop-by-vehicle" className="border-t border-[#EFEFEF] bg-[#F8F8F8] pb-8 pt-5 md:pb-10 md:pt-6">
      <div className="store-container">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#C41E1E]">
              Or browse by model
            </p>
            <h2 className="font-heading mt-0.5 text-[20px] font-bold text-[#111111] sm:text-[22px]">
              Shop By Your Vehicle
            </h2>
          </div>

          {!loading && byMake.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setActiveMake("")}
                className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
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
                  className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
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

        <div className="relative mt-4">
          {visible.length > 4 ? (
            <>
              <button
                type="button"
                aria-label="Scroll vehicles left"
                onClick={() => scrollByCards(-1)}
                className="absolute -left-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-lg shadow-sm md:flex"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Scroll vehicles right"
                onClick={() => scrollByCards(1)}
                className="absolute -right-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-lg shadow-sm md:flex"
              >
                ›
              </button>
            </>
          ) : null}

          <div
            ref={scrollerRef}
            className="shop-by-vehicle-slider flex gap-2.5 overflow-x-auto pb-2 sm:gap-3"
            style={{
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "thin",
            }}
          >
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[148px] w-[42%] shrink-0 animate-pulse rounded-xl bg-[#E8E8E8] sm:w-[23%]"
                  />
                ))
              : visible.map((v) => (
                  <Link
                    key={`${v.make}-${v.slug}`}
                    href={v.href}
                    data-vehicle-card
                    className="group w-[42%] shrink-0 overflow-hidden rounded-xl border border-[#E8E8E8] bg-white transition hover:border-[#C41E1E]/45 hover:shadow-md sm:w-[23%]"
                    style={{ scrollSnapAlign: "start" }}
                  >
                    <div className="relative h-[88px] w-full overflow-hidden bg-[#F3F4F6] sm:h-[100px]">
                      {v.image ? (
                        <Image
                          src={v.image}
                          alt={`${v.make} ${v.model}`}
                          fill
                          className="object-cover object-center transition duration-300 group-hover:scale-105"
                          sizes="(max-width: 768px) 42vw, 23vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xl text-[#9CA3AF]">🚗</div>
                      )}
                    </div>
                    <div className="px-2.5 py-2">
                      <p className="truncate text-[9px] font-bold uppercase tracking-wider text-[#C41E1E]">
                        {v.make}
                      </p>
                      <p className="font-heading truncate text-[13px] font-bold leading-tight text-[#111111]">
                        {v.model}
                      </p>
                      {yearLabel(v) ? (
                        <p className="mt-0.5 truncate text-[10px] text-[#6B7280]">{yearLabel(v)}</p>
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

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
 * Empty generations filtered upstream in fetchCarCatalogServer / GET /api/car-catalog.
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
    <section id="shop-by-vehicle" className="sbv">
      <div className="store-container">
        <div className="sbv-head">
          <div className="sbv-head__titles">
            <h2 className="sbv-title">Shop By Your Vehicle</h2>
            <Link href="/cars" className="sbv-all">
              View all →
            </Link>
          </div>
        </div>

        {!loading && byMake.length > 0 ? (
          <div className="sbv-pills" role="tablist" aria-label="Filter by make">
            <button
              type="button"
              role="tab"
              aria-selected={!activeMake}
              onClick={() => setActiveMake("")}
              className={`sbv-pill${!activeMake ? " is-on" : ""}`}
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
                className={`sbv-pill${activeMake === make ? " is-on" : ""}`}
              >
                {make} · {list.length}
              </button>
            ))}
          </div>
        ) : null}

        <div className="sbv-rail">
          {visible.length > 4 ? (
            <>
              <button
                type="button"
                aria-label="Scroll vehicles left"
                onClick={() => scrollByCards(-1)}
                className="sbv-nav sbv-nav--prev"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Scroll vehicles right"
                onClick={() => scrollByCards(1)}
                className="sbv-nav sbv-nav--next"
              >
                ›
              </button>
            </>
          ) : null}

          <div ref={scrollerRef} className="sbv-slider">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="sbv-card sbv-card--skeleton" aria-hidden>
                    <span className="sbv-ring" />
                    <span className="sbv-skel-line" />
                    <span className="sbv-skel-line sbv-skel-line--short" />
                  </div>
                ))
              : visible.map((v) => (
                  <Link
                    key={`${v.make}-${v.slug}`}
                    href={v.href}
                    data-vehicle-card
                    className="sbv-card"
                  >
                    <span className="sbv-ring">
                      {v.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={v.image}
                          alt={`${v.make} ${v.model}`}
                          loading="lazy"
                          decoding="async"
                          fetchPriority="low"
                          draggable={false}
                        />
                      ) : (
                        <span className="sbv-fallback" aria-hidden>
                          🚗
                        </span>
                      )}
                    </span>
                    <span className="sbv-make">{v.make}</span>
                    <span className="sbv-model">{v.model}</span>
                    {yearLabel(v) ? <span className="sbv-years">{yearLabel(v)}</span> : null}
                  </Link>
                ))}
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PremiumProductCard from "@/components/home/PremiumProductCard";

const FILTERS = [
  { id: "off50", label: "50% OFF", saleHref: "/sale?filter=50off" },
  { id: "off30", label: "30% OFF", saleHref: "/sale?filter=30off" },
  { id: "under999", label: "Under Rs. 20", saleHref: "/sale?filter=under999" },
  { id: "under1999", label: "Under Rs. 35", saleHref: "/sale?filter=under1999" },
];

function buildUrl(tabId) {
  const qs = new URLSearchParams({ status: "active", limit: "8" });
  if (tabId === "under999") qs.set("maxPrice", "20");
  if (tabId === "under1999") qs.set("maxPrice", "35");
  if (tabId === "off50") qs.set("minDiscount", "50");
  if (tabId === "off30") qs.set("minDiscount", "30");
  return `/api/products?${qs.toString()}`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatHMS(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return { h: pad(h), m: pad(m), s: pad(s) };
}

function CountdownTile({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="font-display flex h-16 min-w-[64px] items-center justify-center rounded-md border border-white/10 bg-white/5 px-3 text-3xl text-white tabular-nums backdrop-blur-sm md:h-20 md:min-w-[80px] md:text-5xl">
        {value}
      </div>
      <span className="mt-2 text-[10px] font-semibold tracking-widest text-white/50 uppercase">
        {label}
      </span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-sm">
      <div className="aspect-[4/3] animate-pulse bg-white/10" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
        <div className="h-5 w-1/2 animate-pulse rounded bg-white/10" />
      </div>
    </div>
  );
}

export default function SaleSection() {
  const [active, setActive] = useState("off50");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const load = useCallback(async (tabId) => {
    setLoading(true);
    try {
      const res = await fetch(buildUrl(tabId));
      const json = await res.json();
      setProducts(json.success ? json.products || [] : []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(active);
  }, [active, load]);

  useEffect(() => {
    const calc = () => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const sec = Math.max(0, Math.floor((end.getTime() - Date.now()) / 1000));
      setTick(sec);
    };
    calc();
    const i = setInterval(calc, 1000);
    return () => clearInterval(i);
  }, []);

  const time = formatHMS(tick);

  return (
    <section
      className="relative overflow-hidden py-20 md:py-24"
      style={{
        background:
          "linear-gradient(135deg, #1a0505 0%, #2a0707 50%, #0a0a0a 100%)",
      }}
    >
      {/* Glow accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 h-[400px] w-[400px] rounded-full opacity-50 blur-[140px]"
        style={{ background: "rgba(220,38,38,0.25)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -bottom-24 h-[400px] w-[400px] rounded-full opacity-40 blur-[120px]"
        style={{ background: "rgba(220,38,38,0.18)" }}
      />

      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <span className="mx-auto mb-4 block h-0.5 w-12 bg-[#DC2626]" />
          <p className="text-xs font-semibold tracking-[0.3em] text-red-400 uppercase">
            Limited Time Offers
          </p>
          <h2 className="font-display mt-3 text-5xl text-white uppercase md:text-6xl lg:text-7xl">
            Hot Deals
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-white/60 md:text-base">
            Limited time offers — grab them before they're gone.
          </p>
        </div>

        {/* Countdown */}
        <div className="mb-10 flex justify-center">
          <div className="flex items-center gap-3 md:gap-4">
            <CountdownTile value={time.h} label="Hours" />
            <span className="font-display text-3xl text-white/40 md:text-5xl">:</span>
            <CountdownTile value={time.m} label="Minutes" />
            <span className="font-display text-3xl text-white/40 md:text-5xl">:</span>
            <CountdownTile value={time.s} label="Seconds" />
          </div>
        </div>

        {/* Filter pills */}
        <div className="mb-10 flex flex-wrap justify-center gap-3">
          {FILTERS.map((f) => {
            const isActive = active === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActive(f.id)}
                className={`rounded-full px-5 py-2.5 text-xs font-bold tracking-[0.15em] uppercase transition-all duration-300 ${
                  isActive
                    ? "bg-white text-[#0a0a0a] shadow-lg"
                    : "border border-white/30 bg-transparent text-white hover:border-white hover:bg-white/5"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Products */}
        {loading ? (
          <div className="hidden gap-6 md:grid md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center text-sm text-white/60">
            No products in this category yet — check back soon!
          </div>
        ) : (
          <>
            {/* Mobile horizontal scroll */}
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 scrollbar-hidden md:hidden">
              {products.map((p) => (
                <div key={p.id || p.slug} className="w-[260px] shrink-0 snap-start">
                  <PremiumProductCard product={p} />
                </div>
              ))}
            </div>

            {/* Desktop grid */}
            <div className="hidden gap-6 md:grid md:grid-cols-4">
              {products.slice(0, 8).map((p) => (
                <PremiumProductCard key={p.id || p.slug} product={p} />
              ))}
            </div>
          </>
        )}

        {/* CTA */}
        <div className="mt-12 flex justify-center">
          <Link href="/sale" className="btn-outline inline-flex items-center gap-2">
            VIEW ALL DEALS
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

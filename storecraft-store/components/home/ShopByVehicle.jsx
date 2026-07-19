"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/** Shop By Your Vehicle — group GET /api/vehicles by make */
export default function ShopByVehicle() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/vehicles", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const list = data?.vehicles || data?.data || [];
        setVehicles(Array.isArray(list) ? list : []);
      })
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
  }, []);

  const byMake = useMemo(() => {
    const map = new Map();
    for (const v of vehicles) {
      const make = v.make || "Other";
      if (!map.has(make)) map.set(make, []);
      map.get(make).push(v);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [vehicles]);

  const flat = useMemo(() => vehicles.slice(0, 24), [vehicles]);

  return (
    <section className="homepage-section bg-white py-12 md:py-20">
      <div className="store-container">
        <h2 className="font-heading text-[32px] font-bold text-[#111111]">Shop By Your Vehicle</h2>
        <div style={{ width: 48, height: 3, background: "#C41E1E", marginTop: 8 }} />
        <p className="mt-2 text-sm text-[#6B7280]">Find accessories made for your exact car</p>

        {!loading && byMake.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {byMake.map(([make, list]) => (
              <span
                key={make}
                className="rounded-full border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-1 text-xs font-semibold text-[#374151]"
              >
                {make} · {list.length}
              </span>
            ))}
          </div>
        ) : null}

        <div className="scrollbar-hidden -mx-4 mt-8 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 md:grid-cols-3 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[300px] w-[240px] shrink-0 animate-pulse rounded-xl bg-[#F3F4F6] sm:w-auto" />
              ))
            : flat.map((v) => (
                <Link
                  key={String(v._id || v.slug)}
                  href={`/cars/${v.slug}`}
                  className="group relative h-[300px] w-[240px] shrink-0 overflow-hidden rounded-xl border border-[#E5E7EB] transition-all duration-200 hover:scale-[1.02] hover:border-[#C41E1E] hover:shadow-[0_0_20px_rgba(196,30,30,0.25)] sm:w-auto"
                >
                  <div className="relative h-[60%] w-full bg-[#111111]">
                    {v.image ? (
                      <Image
                        src={v.image}
                        alt={v.displayName || `${v.make} ${v.model}`}
                        fill
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                        sizes="240px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl text-white/60">🚗</div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-[42%] bg-gradient-to-t from-[#111111] to-[#1f1f1f]/90 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#F5A623]">{v.make}</p>
                    <p className="font-heading text-lg font-bold leading-tight text-white">
                      {v.generation || v.model}
                    </p>
                    <p className="mt-1 text-xs text-[#9CA3AF]">
                      {v.yearFrom}–{v.yearTo == null ? "Present" : v.yearTo}
                    </p>
                    <span className="mt-3 inline-flex rounded bg-[#C41E1E] px-3 py-1 text-xs font-semibold text-white">
                      Shop Now →
                    </span>
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}

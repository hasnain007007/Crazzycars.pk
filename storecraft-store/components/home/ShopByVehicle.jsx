"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function slugify(v) {
  return String(v || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export default function ShopByVehicle() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/car-catalog?popular=true")
      .then((r) => r.json())
      .then((data) => {
        const rows = Array.isArray(data?.popular) ? data.popular : [];
        setItems(rows.slice(0, 12));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="homepage-section bg-white py-12 md:py-20">
      <div className="store-container">
        <h2 className="font-heading text-[32px] font-bold text-[#111111]">Shop By Your Vehicle</h2>
        <div style={{ width: 48, height: 3, background: "#C41E1E", marginTop: 8 }} />
        <p className="mt-2 text-sm text-[#6B7280]">Find accessories made for your exact car</p>

        <div className="scrollbar-hidden -mx-4 mt-8 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {(loading ? Array.from({ length: 6 }).map((_, i) => ({ key: i })) : items).map((item, idx) => {
            if (loading) {
              return <div key={idx} className="h-[300px] w-[240px] shrink-0 animate-pulse rounded-xl bg-[#F3F4F6]" />;
            }
            const make = item.make || "Car";
            const model = item.nickname || item.model || "Model";
            const image = item.image || "";
            const href = `/cars/${slugify(make)}/${slugify(model)}`;
            return (
              <Link
                key={`${make}-${model}-${idx}`}
                href={href}
                className="group relative h-[300px] w-[240px] shrink-0 overflow-hidden rounded-xl border border-[#E5E7EB] transition-all duration-200 hover:scale-[1.02] hover:border-[#C41E1E] hover:shadow-[0_0_20px_rgba(196,30,30,0.25)]"
              >
                <div className="h-[60%] w-full bg-[#111111]">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt={`${make} ${model}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl text-white/60">🚗</div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-[42%] bg-gradient-to-t from-[#111111] to-[#1f1f1f]/90 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#F5A623]">{make}</p>
                  <p className="font-heading text-2xl font-bold text-white">{model}</p>
                  <p className="mt-1 text-xs text-[#9CA3AF]">{Number(item.accessoriesCount || item.productsCount || 0)} accessories</p>
                  <span className="mt-3 inline-flex rounded bg-[#C41E1E] px-3 py-1 text-xs font-semibold text-white">Shop Now →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

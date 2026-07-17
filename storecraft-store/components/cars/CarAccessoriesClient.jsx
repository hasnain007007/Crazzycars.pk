"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/store/ProductCard";
import {
  activeVariants,
  fitmentModelName,
  formatModelShortLabel,
  formatModelSubtitle,
  formatModelTitle,
  yearsForCatalogEntry,
} from "@/lib/carCatalogDisplay";

const ACCESSORY_FILTERS = [
  { id: "", label: "All" },
  { id: "seat", label: "Seat Covers", keywords: ["seat cover", "seat"] },
  { id: "floor", label: "Floor Mats", keywords: ["floor mat", "floor", "mat"] },
  { id: "steering", label: "Steering", keywords: ["steering"] },
  { id: "lighting", label: "Lighting", keywords: ["light", "led", "lamp"] },
  { id: "care", label: "Care", keywords: ["polish", "wax", "cleaner", "care", "shampoo"] },
];

function pillClass(active) {
  return [
    "rounded-full border px-3 py-1.5 text-sm font-medium transition",
    active
      ? "border-[#C41E1E] bg-[#C41E1E] text-white"
      : "border-[#E5E7EB] bg-white text-[#374151] hover:border-[#C41E1E]",
  ].join(" ");
}

export function CarAccessoriesClient({ makeSlug, modelSlug, carContext, initialYear, initialVariant }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");

  const year = searchParams.get("year") || initialYear || "";
  const variant = searchParams.get("variant") || initialVariant || "";

  const { makeName, entry } = carContext || {};
  const displayName = formatModelShortLabel(entry) || entry?.model || modelSlug;
  const fitmentModel = fitmentModelName(entry) || entry?.model || displayName;
  const years = useMemo(() => yearsForCatalogEntry(entry), [entry]);
  const variants = useMemo(() => activeVariants(entry, year || null), [entry, year]);

  const updateQuery = useCallback(
    (patch) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, val]) => {
        if (val == null || val === "") params.delete(key);
        else params.set(key, String(val));
      });
      router.replace(`/cars/${makeSlug}/${modelSlug}?${params.toString()}`, { scroll: false });
    },
    [router, makeSlug, modelSlug, searchParams]
  );

  const loadProducts = useCallback(async () => {
    if (!makeName || !fitmentModel) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        make: makeName,
        model: fitmentModel,
        limit: "48",
      });
      if (year) qs.set("year", year);
      if (variant) qs.set("variant", variant);
      const res = await fetch(`/api/products/fitment?${qs.toString()}`);
      const json = await res.json();
      setProducts(json.success ? json.products || [] : []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [makeName, fitmentModel, year, variant]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const filter = ACCESSORY_FILTERS.find((f) => f.id === category);
    if (!filter?.keywords?.length) return products;
    return products.filter((p) => {
      const hay = `${p.name || ""} ${(p.tags || []).join(" ")} ${p.shortDescription || ""}`.toLowerCase();
      return filter.keywords.some((kw) => hay.includes(kw));
    });
  }, [products, category]);

  const summaryParts = [makeName, displayName];
  if (year) summaryParts.push(String(year));
  if (variant) summaryParts.push(variant);
  const summaryLine = summaryParts.filter(Boolean).join(" ");

  if (!carContext?.entry) {
    return (
      <div className="store-container mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-[#111111]">Vehicle not found</h1>
        <p className="mt-2 text-[#6B7280]">We could not find this car in our catalog.</p>
        <Link href="/" className="mt-6 inline-block text-[#C41E1E] font-semibold hover:underline">
          ← Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <div className="store-container mx-auto max-w-6xl px-4 py-8">
        <nav className="mb-6 text-sm text-[#6B7280]">
          <Link href="/" className="hover:text-[#C41E1E]">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#111111]">
            {makeName} {displayName}
          </span>
        </nav>

        <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
          <div className="flex flex-col sm:flex-row">
            <div className="relative h-48 w-full shrink-0 bg-[#F3F4F6] sm:h-auto sm:w-64">
              {entry.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full min-h-[192px] items-center justify-center bg-gradient-to-br from-[#1A1A1A] to-[#C41E1E] text-5xl font-bold text-white">
                  {displayName.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col justify-center p-6">
              <h1 className="font-heading text-2xl font-bold text-[#111111] sm:text-3xl">
                {makeName} {formatModelTitle(entry)}
              </h1>
              <p className="mt-1 text-[#6B7280]">{formatModelSubtitle(entry)}</p>
              {variants.length ? (
                <p className="mt-2 text-sm text-[#9CA3AF]">Available variants below ↓</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-[#E5E7EB] bg-white p-4 sm:p-5">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Year</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={pillClass(!year)} onClick={() => updateQuery({ year: "", variant: "" })}>
                  All
                </button>
                {years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    className={pillClass(String(year) === String(y))}
                    onClick={() => updateQuery({ year: y, variant: "" })}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {variants.length ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Variant</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={pillClass(!variant)}
                    onClick={() => updateQuery({ variant: "" })}
                  >
                    All
                  </button>
                  {variants.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      className={pillClass(variant === v.name)}
                      onClick={() => updateQuery({ variant: v.name })}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <p className="border-t border-[#F3F4F6] pt-3 text-sm text-[#374151]">
              Showing accessories for: <strong>{summaryLine}</strong>
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-6 lg:flex-row">
          <aside className="lg:w-48 lg:shrink-0">
            <p className="mb-3 text-sm font-semibold text-[#111111]">Categories</p>
            <div className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
              {ACCESSORY_FILTERS.map((f) => (
                <button
                  key={f.id || "all"}
                  type="button"
                  onClick={() => setCategory(f.id)}
                  className={`text-left ${pillClass(category === f.id)} lg:w-full`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-[#111111]">
              Accessories for {makeName} {displayName}
            </h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              {loading ? "Loading…" : `${filteredProducts.length} product${filteredProducts.length === 1 ? "" : "s"}`}
            </p>

            {loading ? (
              <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-[#E5E7EB]" />
                ))}
              </div>
            ) : filteredProducts.length ? (
              <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {filteredProducts.map((p) => (
                  <ProductCard key={p.id || p.slug} product={p} />
                ))}
              </div>
            ) : (
              <div className="mt-10 rounded-xl border border-dashed border-[#E5E7EB] bg-white p-10 text-center">
                <p className="text-[#374151]">No accessories found for this selection yet.</p>
                <Link href="/shop" className="mt-4 inline-block text-sm font-semibold text-[#C41E1E] hover:underline">
                  Browse all products →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

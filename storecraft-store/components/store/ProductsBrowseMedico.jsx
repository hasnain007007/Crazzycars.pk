"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatPrice } from "@/lib/currency";
import { ProductCard } from "./ProductCard";
import { CAR_MAKES } from "@/lib/carCatalog";

function Section({ title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-[rgba(0,0,0,0.1)] py-3">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left text-sm font-semibold text-[#111111]">
        {title} <span className="text-[#666666]">{open ? "▲" : "▼"}</span>
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

export function ProductsBrowseMedico({
  initialProducts = [],
  initialTotal = 0,
}) {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || "";
  const saleOnly = searchParams.get("sale") === "true";
  const dealsParam = searchParams.get("deals") === "true";
  const carMake = searchParams.get("make") || searchParams.get("carMake") || "";
  const carModel = searchParams.get("model") || searchParams.get("carModel") || "";
  const carYear = searchParams.get("year") || searchParams.get("carYear") || "";
  const searchQ = searchParams.get("q") || "";
  const hasUrlFilters = Boolean(
    category || saleOnly || dealsParam || carMake || carModel || carYear || searchQ.trim()
  );
  const hasInitial = !hasUrlFilters && initialProducts.length > 0;
  const [products, setProducts] = useState(hasInitial ? initialProducts : []);
  const [allProducts, setAllProducts] = useState(hasInitial ? initialProducts : []);
  const [totalCount, setTotalCount] = useState(
    hasInitial ? initialTotal || initialProducts.length : 0
  );
  const [loading, setLoading] = useState(!hasInitial);
  const [sort, setSort] = useState("newest");
  const [inStock, setInStock] = useState(false);
  const [outOfStock, setOutOfStock] = useState(false);
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [filterCategory, setFilterCategory] = useState(category);
  const [filterBrand, setFilterBrand] = useState("");
  const [filterMake, setFilterMake] = useState(carMake);
  const [grid, setGrid] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (carMake) {
        const fitQs = new URLSearchParams({ make: carMake, limit: "48" });
        if (carModel) fitQs.set("model", carModel);
        if (carYear) fitQs.set("year", carYear);
        const res = await fetch(`/api/products/fitment?${fitQs.toString()}`);
        const json = await res.json();
        if (json.success) {
          setAllProducts(json.products || []);
          setTotalCount(json.total ?? json.products?.length ?? 0);
        } else {
          setAllProducts([]);
          setTotalCount(0);
        }
        return;
      }

      const qs = new URLSearchParams({ limit: "48" });
      if (category) qs.set("category", category);
      if (saleOnly) qs.set("sale", "true");
      if (dealsParam) qs.set("deals", "true");
      const res = await fetch(`/api/products?${qs.toString()}`);
      const json = await res.json();
      if (json.success) {
        setAllProducts(json.products || []);
        setTotalCount(json.total ?? json.products?.length ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [category, saleOnly, dealsParam, carMake, carModel, carYear]);

  useEffect(() => {
    if (hasInitial) return;
    void load();
  }, [load, hasInitial]);

  useEffect(() => {
    let next = [...allProducts];
    if (saleOnly) {
      next = next.filter((p) => {
        const regular = Number(p.regularPrice ?? p.compareAt ?? p.price ?? 0);
        const sale = Number(p.salePrice ?? 0);
        return Boolean(sale && regular && sale < regular);
      });
    }
    if (inStock && !outOfStock) next = next.filter((p) => p.inStock);
    if (outOfStock && !inStock) next = next.filter((p) => !p.inStock);
    const min = Number(priceFrom || 0);
    const max = Number(priceTo || Number.MAX_SAFE_INTEGER);
    next = next.filter((p) => (Number(p.price) || 0) >= min && (Number(p.price) || 0) <= max);
    if (filterCategory) {
      const fc = filterCategory.toLowerCase();
      next = next.filter((p) => {
        const cat = String(p.category || p.categorySlug || "").toLowerCase();
        const tags = (p.tags || []).join(" ").toLowerCase();
        return cat.includes(fc) || tags.includes(fc) || String(p.name).toLowerCase().includes(fc);
      });
    }
    if (filterBrand) {
      const fb = filterBrand.toLowerCase();
      next = next.filter((p) => {
        const brand = String(p.brand || p.vendor || "").toLowerCase();
        return brand.includes(fb);
      });
    }
    if (filterMake) {
      const fm = filterMake.toLowerCase();
      next = next.filter((p) => {
        const hay = `${p.name || ""} ${(p.tags || []).join(" ")} ${p.description || ""}`.toLowerCase();
        return hay.includes(fm);
      });
    }
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      next = next.filter((p) => {
        const hay = `${p.name || ""} ${(p.tags || []).join(" ")} ${p.shortDescription || ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    if (sort === "name") next.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (sort === "price-asc") next.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    if (sort === "price-desc") next.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    if (sort === "newest") next.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    if (sort === "popular") next.sort((a, b) => (Number(b.reviewCount) || 0) - (Number(a.reviewCount) || 0));
    setProducts(next);
  }, [allProducts, inStock, outOfStock, priceFrom, priceTo, sort, saleOnly, filterCategory, filterBrand, filterMake, searchQ]);

  const inCount = useMemo(() => allProducts.filter((p) => p.inStock).length, [allProducts]);
  const outCount = Math.max(0, allProducts.length - inCount);
  const highest = useMemo(() => Math.max(0, ...allProducts.map((p) => Number(p.price) || 0)), [allProducts]);

  return (
    <div>
      <div className="border-b border-[rgba(0,0,0,0.08)] bg-[#F5F5F5] py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
          <h1
            className="font-heading text-2xl font-bold uppercase tracking-[0.05em]"
            style={{ color: "#111111", letterSpacing: "0.06em" }}
          >
            {saleOnly || dealsParam
              ? "Hot Deals"
              : carMake
                ? `Parts for ${carMake}${carModel ? ` ${carModel}` : ""}${carYear ? ` ${carYear}` : ""}`
                : "Products"}
          </h1>
          <p className="text-sm text-[#555555]">Home / Shop</p>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
        <aside className="hidden w-64 shrink-0 rounded border border-[rgba(0,0,0,0.12)] bg-[#FFFFFF] p-4 lg:block">
          <h3 className="text-base font-bold" style={{ color: "#111111" }}>Filter:</h3>
          <Section title="Availability">
            <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm text-[#333333]">
              <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="accent-[#D72323]" /> In stock ({inCount})
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#333333]">
              <input type="checkbox" checked={outOfStock} onChange={(e) => setOutOfStock(e.target.checked)} className="accent-[#D72323]" /> Out of stock ({outCount})
            </label>
          </Section>
          <Section title="Price">
            <p className="text-xs text-[#555555]">
              The highest price is <span className="price">{formatPrice(highest)}</span>
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                value={priceFrom}
                onChange={(e) => setPriceFrom(e.target.value)}
                placeholder="From"
                className="rounded border border-[rgba(0,0,0,0.12)] bg-[#FFFFFF] px-2 py-1.5 text-sm text-[#111111] placeholder:text-[#777777]"
              />
              <input
                value={priceTo}
                onChange={(e) => setPriceTo(e.target.value)}
                placeholder="To"
                className="rounded border border-[rgba(0,0,0,0.12)] bg-[#FFFFFF] px-2 py-1.5 text-sm text-[#111111] placeholder:text-[#777777]"
              />
            </div>
          </Section>
          <Section title="Category">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full min-h-[44px] rounded border border-[rgba(0,0,0,0.12)] px-2 text-sm"
            >
              <option value="">All categories</option>
              {([] || []).map((c) => (
                <option key={c.slug || c.id} value={c.slug || c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </Section>
          <Section title="Brand">
            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="w-full min-h-[44px] rounded border border-[rgba(0,0,0,0.12)] px-2 text-sm"
            >
              <option value="">All brands</option>
              {["Honda", "Toyota", "Suzuki", "KIA", "Universal", "Premium"].map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Section>
          <Section title="Car Make">
            <select
              value={filterMake}
              onChange={(e) => setFilterMake(e.target.value)}
              className="w-full min-h-[44px] rounded border border-[rgba(0,0,0,0.12)] px-2 text-sm"
            >
              <option value="">Any vehicle</option>
              {CAR_MAKES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Section>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between rounded border border-[rgba(0,0,0,0.12)] bg-[#FFFFFF] px-4 py-3">
            <p className="text-sm text-[#333333]">
              Showing {products.length} of {totalCount || allProducts.length} products
            </p>
            <div className="flex items-center gap-3">
              <label className="text-sm text-[#333333]">Sort by</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded border border-[rgba(0,0,0,0.12)] bg-[#FFFFFF] px-2 py-1.5 text-sm text-[#111111]"
              >
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="popular">Popular</option>
                <option value="name">Alphabetically A-Z</option>
              </select>
              <button
                type="button"
                className={`rounded border px-2 py-1 text-[#555555] ${grid ? "border-[#D72323] text-[#D72323]" : "border-[rgba(0,0,0,0.12)]"}`}
                onClick={() => setGrid(true)}
              >
                ⊞
              </button>
              <button
                type="button"
                className={`rounded border px-2 py-1 text-[#555555] ${!grid ? "border-[#D72323] text-[#D72323]" : "border-[rgba(0,0,0,0.12)]"}`}
                onClick={() => setGrid(false)}
              >
                ☰
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-72 animate-pulse rounded border border-[rgba(0,0,0,0.12)] bg-[#EFEFEF]" />
              ))}
            </div>
          ) : (
            <div className={`grid gap-4 ${grid ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1"}`}>
              {products.map((p) => (
                <div key={p.id} className={!grid ? "max-w-md" : ""}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          )}
          {!products.length && !loading ? <p className="mt-6 text-sm text-[#555555]">No products match current filters.</p> : null}
          <div className="mt-6">
            <Link href="/shop" className="text-sm text-[#D72323] underline underline-offset-2 hover:text-[#a01818]">
              Reset filters
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

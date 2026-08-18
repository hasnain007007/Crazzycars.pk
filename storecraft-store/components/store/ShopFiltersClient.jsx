"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/currency";
import { CAR_MAKES } from "@/lib/carCatalog";
import { hrefFromUrlState } from "@/lib/listingQuery";

const SHOP_BRANDS = ["Honda", "Toyota", "Suzuki", "KIA", "Hyundai", "Changan", "MG"];

function Section({ title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-[rgba(0,0,0,0.1)] py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-[#111111]"
      >
        {title} <span className="text-[#666666]">{open ? "▲" : "▼"}</span>
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

/**
 * Shop filter sidebar. Updates the URL; the server page re-renders the grid.
 * Does not call useSearchParams().
 */
export function ShopFiltersClient({ pathname = "/shop", urlState = {}, highest = 0 }) {
  const router = useRouter();

  function push(patch, { resetPage = true } = {}) {
    const next = { ...urlState, ...patch };
    Object.entries(patch).forEach(([key, val]) => {
      if (val == null || val === "" || val === false) delete next[key];
    });
    if (resetPage) delete next.page;
    router.push(hrefFromUrlState(pathname, next), { scroll: false });
  }

  return (
    <aside className="hidden w-64 shrink-0 rounded border border-[rgba(0,0,0,0.12)] bg-[#FFFFFF] p-4 lg:block">
      <h3 className="text-base font-bold text-[#111111]">Filter:</h3>
      <Section title="Availability">
        <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm text-[#333333]">
          <input
            type="checkbox"
            checked={urlState.inStock === "true"}
            onChange={(e) => push({ inStock: e.target.checked ? "true" : "" })}
            className="accent-[#D72323]"
          />{" "}
          In stock
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#333333]">
          <input
            type="checkbox"
            checked={urlState.outOfStock === "true"}
            onChange={(e) => push({ outOfStock: e.target.checked ? "true" : "" })}
            className="accent-[#D72323]"
          />{" "}
          Out of stock
        </label>
      </Section>
      <Section title="Price">
        {highest > 0 ? (
          <p className="text-xs text-[#555555]">
            The highest price on this page is <span className="price">{formatPrice(highest)}</span>
          </p>
        ) : null}
        <form
          className="mt-2 grid grid-cols-2 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            push({
              minPrice: String(fd.get("minPrice") || "").trim(),
              maxPrice: String(fd.get("maxPrice") || "").trim(),
            });
          }}
        >
          <input
            name="minPrice"
            defaultValue={urlState.minPrice || ""}
            placeholder="From"
            className="rounded border border-[rgba(0,0,0,0.12)] bg-[#FFFFFF] px-2 py-1.5 text-sm text-[#111111] placeholder:text-[#777777]"
          />
          <input
            name="maxPrice"
            defaultValue={urlState.maxPrice || ""}
            placeholder="To"
            className="rounded border border-[rgba(0,0,0,0.12)] bg-[#FFFFFF] px-2 py-1.5 text-sm text-[#111111] placeholder:text-[#777777]"
          />
          <button type="submit" className="col-span-2 text-left text-xs font-semibold text-[#C41E1E]">
            Apply price
          </button>
        </form>
      </Section>
      <Section title="Brand">
        <select
          value={urlState.brand || ""}
          onChange={(e) => push({ brand: e.target.value })}
          className="w-full min-h-[44px] rounded border border-[rgba(0,0,0,0.12)] px-2 text-sm"
        >
          <option value="">All brands</option>
          {SHOP_BRANDS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </Section>
      <Section title="Car Make">
        <select
          value={urlState.make || ""}
          onChange={(e) => push({ make: e.target.value })}
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
  );
}

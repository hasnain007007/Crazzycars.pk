"use client";

import { useEffect, useState } from "react";

const MAX = 6;

function thumb(p) {
  const imgs = p?.media?.images || [];
  const main = imgs.find((i) => i?.isMain) || imgs[0];
  return main?.url || p?.image || "";
}

function asRow(p) {
  return {
    _id: String(p._id || p.id),
    name: p.name || "",
    slug: p.slug || "",
    image: thumb(p),
    status: p.status || "",
  };
}

/**
 * Search-and-order picker for PDP quick-add recommendations.
 * These are other catalog products, not named extra-fee add-ons.
 */
export function RecommendedProductPicker({
  value = [],
  onChange,
  excludeId = "",
  fieldClass = "",
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState([]);
  const [searching, setSearching] = useState(false);
  const selected = Array.isArray(value) ? value : [];
  const selectedIds = selected.map((p) => String(p._id));

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return undefined;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/products?lite=1&limit=12&search=${encodeURIComponent(term)}&status=active`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (cancelled) return;
        const list = Array.isArray(data?.products) ? data.products : data?.data || [];
        setHits(list.map(asRow).filter((p) => p._id && p._id !== String(excludeId || "")));
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, excludeId]);

  function addProduct(p) {
    if (!p._id || selectedIds.includes(p._id) || selectedIds.length >= MAX) return;
    onChange([...selected, p]);
    setQ("");
    setHits([]);
  }

  function removeAt(idx) {
    onChange(selected.filter((_, i) => i !== idx));
  }

  function move(idx, dir) {
    const next = [...selected];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-[#111827]">Recommended products</p>
        <p className="mt-1 text-xs text-[#6b7280]">
          Shown on the product page above Add to Cart with a + Add button. Customers add these as
          separate cart items (e.g. lubricant, fitting kit). Max {MAX}. This is not the extra-fee
          add-ons table below.
        </p>
      </div>

      <ul className="space-y-1">
        {selected.map((p, i) => (
          <li
            key={p._id || i}
            className="flex items-center gap-2 rounded border border-[#e5e7eb] px-2 py-1.5 text-sm"
          >
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt="" className="h-9 w-9 rounded object-cover" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded bg-[#f3f4f6] text-xs text-[#9ca3af]">
                —
              </span>
            )}
            <span className="min-w-0 flex-1 truncate">{p.name || p._id}</span>
            <button type="button" className="px-1 text-[#6b7280]" onClick={() => move(i, -1)} aria-label="Move up">
              ↑
            </button>
            <button type="button" className="px-1 text-[#6b7280]" onClick={() => move(i, 1)} aria-label="Move down">
              ↓
            </button>
            <button type="button" className="px-1 text-red-600" onClick={() => removeAt(i)} aria-label="Remove">
              ×
            </button>
          </li>
        ))}
        {!selected.length ? (
          <li className="text-xs text-[#9ca3af]">None yet — search below to attach accessories.</li>
        ) : null}
      </ul>

      <input
        className={fieldClass || "w-full rounded border border-[#d1d5db] px-3 py-2 text-sm"}
        placeholder={selected.length >= MAX ? `Maximum ${MAX} reached` : "Search catalog to add…"}
        value={q}
        disabled={selected.length >= MAX}
        onChange={(e) => setQ(e.target.value)}
      />
      {searching ? <p className="text-xs text-[#9ca3af]">Searching…</p> : null}
      {hits.length ? (
        <ul className="max-h-44 overflow-y-auto rounded border border-[#e5e7eb]">
          {hits.map((p) => {
            const already = selectedIds.includes(p._id);
            return (
              <li key={p._id}>
                <button
                  type="button"
                  disabled={already || selected.length >= MAX}
                  onClick={() => addProduct(p)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-[#f9fafb] disabled:opacity-40"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 text-xs text-[#6b7280]">{already ? "Added" : "+ Add"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

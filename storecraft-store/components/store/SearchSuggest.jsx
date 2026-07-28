"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/currency";

/** Session memory cache — instant results for repeated / backspaced queries. */
const suggestCache = new Map();
const SUGGEST_CACHE_MAX = 40;

function cacheGet(q) {
  return suggestCache.get(q) || null;
}

function cacheSet(q, payload) {
  if (suggestCache.size >= SUGGEST_CACHE_MAX) {
    const first = suggestCache.keys().next().value;
    suggestCache.delete(first);
  }
  suggestCache.set(q, payload);
}

function productHref(product) {
  const slug = product?.slug || product?.handle || "";
  if (!slug) return "/products";
  if (product?.source === "shopify" || product?.handle) return `/products/${slug}`;
  return `/${slug}`;
}

function productImage(product) {
  if (typeof product?.image === "string" && product.image) return product.image;
  if (product?.image?.url) return product.image.url;
  const fromList = (product?.images || []).find(Boolean);
  if (typeof fromList === "string") return fromList;
  if (fromList?.url) return fromList.url;
  return product?.media?.images?.[0]?.url || "";
}

/**
 * Live product suggestions while typing — no Enter required.
 * Renders the panel in a portal so sticky header / nav never covers it.
 */
export function SearchSuggest({
  value,
  onChange,
  onSubmit,
  placeholder = "Search products...",
  autoFocus = false,
  inputClassName = "",
  inputStyle,
  variant = "desktop",
}) {
  const router = useRouter();
  const listId = useId();
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchedFor, setSearchedFor] = useState("");
  const [panelBox, setPanelBox] = useState(null);
  const [mounted, setMounted] = useState(false);
  const term = String(value || "").trim();

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePanelBox = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPanelBox({
      top: r.bottom + 6,
      left: r.left,
      width: Math.max(r.width, variant === "mobile" ? r.width : 320),
    });
  }, [variant]);

  useLayoutEffect(() => {
    if (!open || term.length < 2) {
      setPanelBox(null);
      return undefined;
    }
    updatePanelBox();
    const onReposition = () => updatePanelBox();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, term, updatePanelBox]);

  const applyPayload = useCallback((q, payload) => {
    setHits(payload.products);
    setHasMore(Boolean(payload.hasMore));
    setActiveIndex(-1);
    setSearchedFor(q);
  }, []);

  const fetchSuggestions = useCallback(
    async (q) => {
      if (abortRef.current) abortRef.current.abort();
      if (q.length < 2) {
        setHits([]);
        setHasMore(false);
        setLoading(false);
        setSearchedFor("");
        return;
      }

      const cached = cacheGet(q);
      if (cached) {
        applyPayload(q, cached);
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/products/suggest?q=${encodeURIComponent(q)}&limit=8`,
          { signal: controller.signal }
        );
        const json = await res.json();
        if (!json.success) {
          applyPayload(q, { products: [], hasMore: false });
          return;
        }
        const payload = {
          products: Array.isArray(json.products) ? json.products : [],
          hasMore:
            Boolean(json.hasMore) ||
            (Number(json.total) || 0) > (json.products?.length || 0),
        };
        cacheSet(q, payload);
        applyPayload(q, payload);
      } catch (err) {
        if (err?.name === "AbortError") return;
        applyPayload(q, { products: [], hasMore: false });
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    },
    [applyPayload]
  );

  useEffect(() => {
    if (term.length < 2) {
      setHits([]);
      setHasMore(false);
      setSearchedFor("");
      setLoading(false);
      return undefined;
    }
    setOpen(true);

    const cached = cacheGet(term);
    if (cached) {
      applyPayload(term, cached);
      setLoading(false);
      return undefined;
    }

    const t = setTimeout(() => {
      void fetchSuggestions(term);
    }, 120);
    return () => clearTimeout(t);
  }, [term, fetchSuggestions, applyPayload]);

  useEffect(() => {
    function onDoc(e) {
      if (!wrapRef.current?.contains(e.target)) {
        const panel = document.getElementById(listId);
        if (panel?.contains(e.target)) return;
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [listId]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const showPanel = open && term.length >= 2 && panelBox;
  const displayHits = hits;
  const awaitingFresh = term.length >= 2 && searchedFor !== term;
  const displayLoading = term.length >= 2 && loading && hits.length === 0;
  const showEmpty =
    !loading && !awaitingFresh && searchedFor === term && displayHits.length === 0;

  function goToProduct(product) {
    setOpen(false);
    router.push(productHref(product));
  }

  function goToAll() {
    setOpen(false);
    if (onSubmit) onSubmit(term);
    else router.push(`/products?q=${encodeURIComponent(term)}`);
  }

  function handleKeyDown(e) {
    if (!showPanel) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, displayHits.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      if (activeIndex < displayHits.length) goToProduct(displayHits[activeIndex]);
      else goToAll();
    }
  }

  const panel =
    showPanel && mounted
      ? createPortal(
          <div
            id={listId}
            role="listbox"
            style={{
              position: "fixed",
              top: panelBox.top,
              left: panelBox.left,
              width: panelBox.width,
              zIndex: 90050,
            }}
            className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
          >
            {displayLoading ? (
              <p className="px-4 py-3 text-sm text-[#6B7280]">Searching…</p>
            ) : null}

            {awaitingFresh && hits.length > 0 ? (
              <p className="border-b border-[#F3F4F6] px-4 py-1.5 text-[11px] text-[#9CA3AF]">
                Updating…
              </p>
            ) : null}

            {showEmpty ? (
              <p className="px-4 py-3 text-sm text-[#6B7280]">
                No products match “{term}”
              </p>
            ) : null}

            {displayHits.length > 0 ? (
              <ul className="max-h-[min(70vh,22rem)] overflow-y-auto overscroll-contain py-1">
                {displayHits.map((p, idx) => {
                  const img = productImage(p);
                  const active = idx === activeIndex;
                  return (
                    <li key={p.id || p._id || p.slug || idx} role="option" aria-selected={active}>
                      <button
                        type="button"
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                          active ? "bg-[#FEF2F2]" : "hover:bg-[#F9FAFB]"
                        }`}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => goToProduct(p)}
                      >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F3F4F6]">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <span className="text-xs text-[#9CA3AF]">—</span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-sm font-medium text-[#111111]">
                            {p.name}
                          </span>
                          <span className="mt-0.5 block text-sm font-semibold text-[#C41E1E]">
                            {formatPrice(p.price ?? p.salePrice ?? p.regularPrice ?? 0)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {term.length >= 2 ? (
              <div className="border-t border-[#F3F4F6] bg-[#FAFAFA]">
                <button
                  type="button"
                  role="option"
                  aria-selected={activeIndex === displayHits.length}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold transition ${
                    activeIndex === displayHits.length
                      ? "bg-[#FEF2F2] text-[#C41E1E]"
                      : "text-[#C41E1E] hover:bg-[#FEF2F2]"
                  }`}
                  onMouseEnter={() => setActiveIndex(displayHits.length)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={goToAll}
                >
                  <span>
                    {hasMore || displayHits.length >= 8
                      ? `View all results for “${term}”`
                      : `Search “${term}”`}
                  </span>
                  <span aria-hidden>→</span>
                </button>
              </div>
            ) : null}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={wrapRef} className="relative w-full">
      <input
        ref={inputRef}
        type="search"
        value={value}
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={Boolean(showPanel)}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={placeholder}
        className={inputClassName}
        style={inputStyle}
        onChange={(e) => {
          onChange?.(e.target.value);
          setOpen(true);
        }}
        onFocus={(e) => {
          setOpen(true);
          updatePanelBox();
          if (inputStyle) e.target.style.borderColor = "#C41E1E";
        }}
        onBlur={(e) => {
          if (inputStyle) e.target.style.borderColor = "#E5E7EB";
        }}
        onKeyDown={handleKeyDown}
      />
      {panel}
    </div>
  );
}

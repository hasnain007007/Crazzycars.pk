"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/currency";
import { productPath } from "@/lib/productPath";

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
  return productPath(product);
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
 * Header mounts a desktop and a mobile search that share one query string, so
 * both can try to portal a panel at once. Ownership is global: the last input
 * the user actually touched wins and every other instance closes.
 */
const OWNER_EVENT = "storecraft-search-owner";

function claimSearchOwner(id) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OWNER_EVENT, { detail: id }));
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
  const [isOwner, setIsOwner] = useState(false);
  const safeValue = value == null ? "" : String(value);
  const term = safeValue.trim();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onOwnerChange(e) {
      const owner = e.detail;
      setIsOwner(owner === listId);
      if (owner !== listId) {
        setOpen(false);
        setPanelBox(null);
      }
    }
    window.addEventListener(OWNER_EVENT, onOwnerChange);
    return () => window.removeEventListener(OWNER_EVENT, onOwnerChange);
  }, [listId]);

  /** True only when this input is really painted (not a CSS-`hidden` twin). */
  const isInputVisible = useCallback(() => {
    const el = inputRef.current;
    if (!el || typeof window === "undefined") return false;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return false;
    // Off-screen / zero-area parents (e.g. `hidden md:block` on mobile)
    if (r.bottom < 0 || r.top > window.innerHeight + 40) return false;
    const style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number(style.opacity || 1) === 0
    ) {
      return false;
    }
    // Walk ancestors for display:none / visibility — getBoundingClientRect can
    // still report size for some hidden trees in WebKit.
    let node = el.parentElement;
    while (node && node !== document.body) {
      const ps = window.getComputedStyle(node);
      if (ps.display === "none" || ps.visibility === "hidden") return false;
      node = node.parentElement;
    }
    return true;
  }, []);

  const updatePanelBox = useCallback(() => {
    const el = inputRef.current;
    if (!el || !isInputVisible()) {
      setPanelBox(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const vv = window.visualViewport;
    // Prefer visualViewport so iOS keyboard doesn't leave the panel off-screen.
    const viewportLeft = vv ? vv.offsetLeft : 0;
    const viewportTop = vv ? vv.offsetTop : 0;
    const viewportWidth = vv ? vv.width : window.innerWidth;
    const viewportBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
    const top = Math.max(viewportTop + 4, r.bottom + 6);
    const maxHeight = Math.max(
      120,
      Math.min(viewportBottom - top - 12, variant === "mobile" ? 280 : 360)
    );
    const maxWidth = Math.min(
      Math.max(r.width, variant === "mobile" ? r.width : 320),
      Math.max(160, viewportWidth - 16)
    );
    const left = Math.min(
      Math.max(viewportLeft + 8, r.left),
      Math.max(viewportLeft + 8, viewportLeft + viewportWidth - maxWidth - 8)
    );
    setPanelBox({ top, left, width: maxWidth, maxHeight });
  }, [variant, isInputVisible]);

  useLayoutEffect(() => {
    if (!open || term.length < 2) {
      setPanelBox(null);
      return undefined;
    }
    updatePanelBox();
    const onReposition = () => updatePanelBox();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    if (typeof window !== "undefined" && window.visualViewport) {
      window.visualViewport.addEventListener("resize", onReposition);
      window.visualViewport.addEventListener("scroll", onReposition);
    }
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      if (typeof window !== "undefined" && window.visualViewport) {
        window.visualViewport.removeEventListener("resize", onReposition);
        window.visualViewport.removeEventListener("scroll", onReposition);
      }
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
      setOpen(false);
      return undefined;
    }

    // Don't open / fetch for an invisible twin (desktop search while mobile is active).
    if (!isInputVisible()) {
      setOpen(false);
      setPanelBox(null);
      return undefined;
    }

    // Covers a search opened with a term already in the box (e.g. ?q= in the URL),
    // where no focus event ever fires to claim ownership.
    claimSearchOwner(listId);
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
  }, [term, fetchSuggestions, applyPayload, isInputVisible, listId]);

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

  const showPanel = open && isOwner && term.length >= 2 && panelBox;
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
    else router.push(`/shop?q=${encodeURIComponent(term)}`);
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
              maxHeight: panelBox.maxHeight,
              zIndex: 90050,
              display: "flex",
              flexDirection: "column",
            }}
            className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
                <ul className="py-1">
                  {displayHits.map((p, idx) => {
                    const img = productImage(p);
                    const active = idx === activeIndex;
                    return (
                      <li key={p.id || p._id || p.slug || idx} role="option" aria-selected={active}>
                        <button
                          type="button"
                          className={`search-suggest-row flex w-full items-center gap-3 px-3 py-2 text-left transition ${
                            active ? "bg-[#FEF2F2]" : "hover:bg-[#F9FAFB]"
                          }`}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => goToProduct(p)}
                        >
                          <span className="search-suggest-thumb flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#F3F4F6]">
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <span className="text-xs text-[#9CA3AF]">—</span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="search-suggest-name line-clamp-2">
                              {p.name}
                            </span>
                            <span className="search-suggest-price mt-0.5 block">
                              {formatPrice(p.price ?? p.salePrice ?? p.regularPrice ?? 0)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>

            {term.length >= 2 ? (
              <div className="shrink-0 border-t border-[#F3F4F6] bg-[#FAFAFA]">
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
                  <span className="min-w-0 truncate">
                    {hasMore || displayHits.length >= 8
                      ? `View all results for “${term}”`
                      : `Search “${term}”`}
                  </span>
                  <span aria-hidden className="ml-2 shrink-0">
                    →
                  </span>
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
        enterKeyHint="search"
        value={safeValue}
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
          if (isInputVisible()) {
            claimSearchOwner(listId);
            setOpen(true);
          }
        }}
        onFocus={(e) => {
          if (isInputVisible()) {
            claimSearchOwner(listId);
            setOpen(true);
            updatePanelBox();
          }
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

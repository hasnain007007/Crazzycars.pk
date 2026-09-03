"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { categoryHref } from "@/lib/categories";

/** Category display picture (main image → icon → homepage icon). */
function catImage(node) {
  if (!node) return "";
  if (typeof node.image === "string" && node.image) return node.image;
  if (node.image?.url) return node.image.url;
  if (typeof node.icon === "string" && node.icon) return node.icon;
  if (typeof node.homepageIcon === "string" && node.homepageIcon) return node.homepageIcon;
  return "";
}

/**
 * AutoJin-style mega-menu:
 *  left  — parent categories + chevrons
 *  center — compact 2-col subcategory rows (label + small thumb)
 *  right  — one display picture for the hovered category (sub → parent)
 */
export default function MegaMenu({ isOpen, onClose, initialCategories = null }) {
  const [menuCategories, setMenuCategories] = useState(() =>
    Array.isArray(initialCategories) ? initialCategories : []
  );
  const [activeCategory, setActiveCategory] = useState(() =>
    Array.isArray(initialCategories) && initialCategories[0]?._id
      ? initialCategories[0]._id
      : null
  );
  const [hoveredSubId, setHoveredSubId] = useState(null);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (Array.isArray(initialCategories) && initialCategories.length) {
      setMenuCategories(initialCategories);
      setActiveCategory((prev) => {
        if (prev && initialCategories.some((c) => String(c._id) === String(prev))) return prev;
        return initialCategories[0]._id;
      });
    }
  }, [initialCategories]);

  const loadCategories = useCallback(() => {
    if (Array.isArray(initialCategories) && initialCategories.length) {
      setMenuCategories(initialCategories);
      setActiveCategory((prev) => {
        if (prev && initialCategories.some((c) => String(c._id) === String(prev))) return prev;
        return initialCategories[0]._id;
      });
      return;
    }
    setLoading(true);
    import("@/lib/fetchCategoryTree")
      .then(({ fetchCategoryTree }) => fetchCategoryTree())
      .then((list) => {
        const cats = Array.isArray(list) ? list : [];
        setMenuCategories(cats);
        if (cats.length > 0) {
          setActiveCategory((prev) => {
            if (prev && cats.some((c) => String(c._id) === String(prev))) return prev;
            return cats[0]._id;
          });
        } else {
          setActiveCategory(null);
        }
      })
      .catch(() => {
        setMenuCategories([]);
        setActiveCategory(null);
      })
      .finally(() => setLoading(false));
  }, [initialCategories]);

  useEffect(() => {
    if (isOpen) loadCategories();
  }, [isOpen, loadCategories]);

  useEffect(() => {
    setHoveredSubId(null);
  }, [activeCategory]);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose?.();
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  const activeParent = menuCategories.find((c) => String(c._id) === String(activeCategory));
  const activeSubs = activeParent?.children || [];

  const hoveredSub = useMemo(
    () => activeSubs.find((s) => String(s._id) === String(hoveredSubId)) || null,
    [activeSubs, hoveredSubId]
  );

  /** Right panel shows hovered subcategory display pic, else parent. */
  const focusCat = hoveredSub || activeParent || null;
  const focusImage = catImage(focusCat) || catImage(activeParent);
  const focusHref = focusCat?.slug ? categoryHref(focusCat.slug) : "/categories";
  const focusLabel = focusCat?.name || "Shop";

  if (!isOpen) return null;
  if (!loading && menuCategories.length === 0) return null;

  return (
    <div ref={menuRef} className="mega-menu">
      <div className="store-container mega-menu__grid">
        <aside className="mega-menu__parents">
          {loading && !menuCategories.length ? (
            <p className="mega-menu__loading">Loading…</p>
          ) : null}
          {menuCategories.map((cat) => {
            const active = String(activeCategory) === String(cat._id);
            return (
              <button
                key={String(cat._id)}
                type="button"
                className={`mega-menu__parent${active ? " is-active" : ""}`}
                onMouseEnter={() => {
                  setActiveCategory(cat._id);
                  setHoveredSubId(null);
                }}
                onFocus={() => {
                  setActiveCategory(cat._id);
                  setHoveredSubId(null);
                }}
                onClick={() => {
                  setActiveCategory(cat._id);
                  setHoveredSubId(null);
                }}
              >
                <span>{cat.name}</span>
                {cat.children?.length > 0 ? <span className="mega-menu__chevron">›</span> : null}
              </button>
            );
          })}
          <div className="mega-menu__parents-foot">
            <Link href="/categories" onClick={() => onClose?.()} className="mega-menu__all-link">
              Shop by Category →
            </Link>
          </div>
        </aside>

        <div className="mega-menu__subs" onMouseLeave={() => setHoveredSubId(null)}>
          {activeParent ? (
            <>
              <div className="mega-menu__subs-head">
                <p className="mega-menu__subs-title">{activeParent.name}</p>
                <Link
                  href={categoryHref(activeParent.slug)}
                  onClick={() => onClose?.()}
                  className="mega-menu__view-all"
                >
                  View all →
                </Link>
              </div>

              {activeSubs.length > 0 ? (
                <div className="mega-menu__subs-grid">
                  {activeSubs.map((sub) => {
                    const img = catImage(sub);
                    const isHover = String(hoveredSubId) === String(sub._id);
                    return (
                      <Link
                        key={String(sub._id)}
                        href={categoryHref(sub.slug)}
                        onClick={() => onClose?.()}
                        onMouseEnter={() => setHoveredSubId(sub._id)}
                        onFocus={() => setHoveredSubId(sub._id)}
                        className={`mega-menu__sub-row${isHover ? " is-hover" : ""}`}
                      >
                        <span className="mega-menu__sub-name">{sub.name}</span>
                        <span className="mega-menu__sub-thumb">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <span className="mega-menu__sub-thumb-empty">·</span>
                          )}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="mega-menu__empty">
                  <p>Browse all {activeParent.name} products.</p>
                  <Link
                    href={categoryHref(activeParent.slug)}
                    onClick={() => onClose?.()}
                    className="mega-menu__shop-btn"
                  >
                    Shop {activeParent.name}
                  </Link>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Single contained display picture — updates on hover */}
        <div className="mega-menu__promo">
          <Link href={focusHref} onClick={() => onClose?.()} className="mega-menu__promo-card">
            {focusImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={focusImage}
                src={focusImage}
                alt={focusLabel}
                className="h-full w-full object-cover"
                loading="eager"
                decoding="async"
              />
            ) : (
              <span className="mega-menu__promo-fallback" />
            )}
            <span className="mega-menu__promo-scrim" />
            <span className="mega-menu__promo-label">{focusLabel}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

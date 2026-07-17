"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

const buildMenuCategories = (cats) => {
  if (!Array.isArray(cats)) return [];

  const getParentId = (c) => {
    const pid = c.parentId || c.parent || c.parentCategory?._id || c.parentCategory;
    return pid ? String(pid) : null;
  };

  const parents = cats.filter((c) => !getParentId(c));

  return parents.map((parent) => {
    const parentId = String(parent._id);

    const subs = cats.filter((c) => getParentId(c) === parentId);

    const subsWithChildren = subs.map((sub) => {
      const subId = String(sub._id);
      const subSubs = cats.filter((c) => getParentId(c) === subId);
      return { ...sub, subcategories: subSubs };
    });

    return {
      ...parent,
      subcategories: subsWithChildren,
    };
  });
};

export default function MegaMenu({ isOpen, onClose, settings }) {
  const [menuCategories, setMenuCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [localSettings, setLocalSettings] = useState(null);
  const menuRef = useRef(null);

  const loadCategories = useCallback(() => {
    fetch("/api/categories", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const cats = data?.categories || data?.data || [];
        const withSubs = buildMenuCategories(cats);

        setMenuCategories(withSubs);
        if (withSubs.length > 0) {
          setActiveCategory((prev) => {
            if (prev && withSubs.some((c) => String(c._id) === String(prev))) return prev;
            return withSubs[0]._id;
          });
        } else {
          setActiveCategory(null);
        }
      })
      .catch(() => {
        setMenuCategories([]);
        setActiveCategory(null);
      });
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (isOpen) loadCategories();
  }, [isOpen, loadCategories]);

  useEffect(() => {
    if (menuCategories.length > 0 && !activeCategory) {
      setActiveCategory(menuCategories[0]._id);
    }
  }, [menuCategories, activeCategory]);

  useEffect(() => {
    if (!isOpen) return;
    fetch(`/api/settings?_=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const mm = data?.data?.megaMenu || {};
        setLocalSettings({
          showSubcategories: mm.showSubcategories !== false,
          featuredTitle: mm.featuredTitle || "",
        });
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  if (!isOpen || menuCategories.length === 0) return null;

  const showSubcategories = localSettings?.showSubcategories ?? settings?.showSubcategories ?? true;
  const activeParent = menuCategories.find((c) => String(c._id) === String(activeCategory));
  const activeSubs = showSubcategories ? activeParent?.subcategories || [] : [];

  return (
    <div
      ref={menuRef}
      className="mega-menu"
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        background: "#FFFFFF",
        border: "1px solid #E5E5E5",
        borderTop: "2px solid #111111",
        boxShadow: "0 8px 20px rgba(0,0,0,0.10)",
        zIndex: 9999,
        animation: "fadeSlideDown 0.18s ease",
        display: "flex",
        width: "auto",
        minWidth: 180,
      }}
    >
      <div className="mega-menu-left" style={{ minWidth: 180, padding: "6px 0" }}>
        {menuCategories.map((cat) => (
          <Link
            key={String(cat._id)}
            href={`/${cat.slug}`}
            onClick={onClose}
            onMouseEnter={() => setActiveCategory(cat._id)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 500,
              color: String(activeCategory) === String(cat._id) ? "#111111" : "#444444",
              textDecoration: "none",
              background: String(activeCategory) === String(cat._id) ? "#F8F8F8" : "transparent",
              borderLeft: String(activeCategory) === String(cat._id) ? "2px solid #D72323" : "2px solid transparent",
              gap: 24,
              whiteSpace: "nowrap",
              transition: "all 0.1s",
              borderRadius: 4,
            }}
          >
            <span>{cat.name}</span>
            {cat.subcategories?.length > 0 && showSubcategories ? (
              <span style={{ fontSize: 10, color: "#AAAAAA" }}>›</span>
            ) : null}
          </Link>
        ))}

        <div style={{ borderTop: "1px solid #F0F0F0", margin: "4px 0 0" }}>
          <Link
            href="/categories"
            onClick={onClose}
            style={{
              display: "block",
              padding: "9px 16px",
              fontSize: 12,
              fontWeight: 700,
              color: "#D72323",
              textDecoration: "none",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            View All →
          </Link>
        </div>
      </div>

      {activeSubs.length > 0 ? (
        <div className="mega-menu-right" style={{ minWidth: 200, borderLeft: "1px solid #F0F0F0", padding: "6px 0", background: "#FAFAFA" }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#D72323",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              margin: "6px 16px 8px",
              whiteSpace: "nowrap",
            }}
          >
            {activeParent?.name}
          </p>
          {activeSubs.map((sub) => (
            <div key={String(sub._id)} style={{ marginBottom: 12 }}>
              <Link
                href={`/${sub.slug}`}
                onClick={onClose}
                style={{
                  display: "block",
                  padding: "6px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#111111",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {sub.name}
              </Link>
              {sub.subcategories?.map((subsub) => (
                <Link
                  key={String(subsub._id)}
                  href={`/${subsub.slug}`}
                  onClick={onClose}
                  style={{
                    display: "block",
                    padding: "4px 16px 4px 28px",
                    fontSize: 12,
                    color: "#666666",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#111111";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#666666";
                  }}
                >
                  › {subsub.name}
                </Link>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

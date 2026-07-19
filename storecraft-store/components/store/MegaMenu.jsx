"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { categoryHref } from "@/lib/categories";

/**
 * AutoJin-style mega-menu: parents left, children (name + image) on hover.
 * Fed by GET /api/categories/tree
 */
export default function MegaMenu({ isOpen, onClose }) {
  const [menuCategories, setMenuCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  const loadCategories = useCallback(() => {
    setLoading(true);
    fetch("/api/categories/tree", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const cats = data?.categories || data?.data || [];
        const list = Array.isArray(cats) ? cats : [];
        setMenuCategories(list);
        if (list.length > 0) {
          setActiveCategory((prev) => {
            if (prev && list.some((c) => String(c._id) === String(prev))) return prev;
            return list[0]._id;
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
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (isOpen) loadCategories();
  }, [isOpen, loadCategories]);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose?.();
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (!loading && menuCategories.length === 0) return null;

  const activeParent = menuCategories.find((c) => String(c._id) === String(activeCategory));
  const activeSubs = activeParent?.children || [];

  return (
    <div
      ref={menuRef}
      className="mega-menu"
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        background: "#FFFFFF",
        borderTop: "2px solid #C41E1E",
        boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
        zIndex: 7010,
      }}
    >
      <div className="store-container flex" style={{ minHeight: 300 }}>
        <div
          style={{
            minWidth: 220,
            maxWidth: 280,
            padding: "12px 0",
            borderRight: "1px solid #F0F0F0",
            flexShrink: 0,
          }}
        >
          {loading && !menuCategories.length ? (
            <p style={{ padding: "12px 18px", fontSize: 13, color: "#9CA3AF" }}>Loading…</p>
          ) : null}
          {menuCategories.map((cat) => {
            const active = String(activeCategory) === String(cat._id);
            return (
              <Link
                key={String(cat._id)}
                href={categoryHref(cat.slug)}
                onClick={() => onClose?.()}
                onMouseEnter={() => setActiveCategory(cat._id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "11px 18px",
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: active ? "#111111" : "#444444",
                  textDecoration: "none",
                  background: active ? "#F8F8F8" : "transparent",
                  borderLeft: active ? "3px solid #C41E1E" : "3px solid transparent",
                  gap: 16,
                }}
              >
                <span>{cat.name}</span>
                {cat.children?.length > 0 ? <span style={{ fontSize: 12, color: "#AAAAAA" }}>›</span> : null}
              </Link>
            );
          })}
          <div style={{ borderTop: "1px solid #F0F0F0", marginTop: 8 }}>
            <Link
              href="/categories"
              onClick={() => onClose?.()}
              style={{
                display: "block",
                padding: "12px 18px",
                fontSize: 12,
                fontWeight: 700,
                color: "#C41E1E",
                textDecoration: "none",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Shop by Category →
            </Link>
          </div>
        </div>

        <div style={{ flex: 1, padding: "16px 28px 24px", background: "#FAFAFA", minHeight: 300 }}>
          {activeParent ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#C41E1E",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    margin: 0,
                  }}
                >
                  {activeParent.name}
                </p>
                <Link
                  href={categoryHref(activeParent.slug)}
                  onClick={() => onClose?.()}
                  style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", textDecoration: "none" }}
                >
                  View all
                </Link>
              </div>

              {activeSubs.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: 16,
                  }}
                >
                  {activeSubs.map((sub) => {
                    const img = typeof sub.image === "string" ? sub.image : sub.image?.url || "";
                    return (
                      <Link
                        key={String(sub._id)}
                        href={categoryHref(sub.slug)}
                        onClick={() => onClose?.()}
                        style={{ textDecoration: "none", color: "#111111" }}
                        className="group"
                      >
                        <div
                          style={{
                            position: "relative",
                            width: "100%",
                            aspectRatio: "1",
                            borderRadius: 8,
                            overflow: "hidden",
                            background: "#EEE",
                            border: "1px solid #E5E7EB",
                            marginBottom: 8,
                          }}
                        >
                          {img ? (
                            <Image
                              src={img}
                              alt={sub.name}
                              fill
                              className="object-cover transition group-hover:scale-105"
                              sizes="140px"
                            />
                          ) : (
                            <div style={{ display: "grid", placeItems: "center", height: "100%", fontSize: 24 }}>📦</div>
                          )}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{sub.name}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 8 }}>
                  Browse all {activeParent.name} products.
                </p>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

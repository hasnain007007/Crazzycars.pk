"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/currency";

const COMPARE_KEY = "sialkot_compare";

function loadCompare() {
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistCompare(items) {
  try {
    localStorage.setItem(COMPARE_KEY, JSON.stringify(items));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("sialkot-compare-change"));
    }
  } catch {
    /* ignore */
  }
}

function specValue(specs, labelNorm) {
  const row = (specs || []).find((s) => String(s?.label || "").trim().toLowerCase() === labelNorm);
  return row?.value != null && String(row.value).trim() !== "" ? String(row.value).trim() : "—";
}

function collectSpecLabels(products) {
  const seen = new Set();
  const ordered = [];
  for (const p of products) {
    for (const s of p.specifications || []) {
      const lab = String(s?.label || "").trim();
      if (!lab) continue;
      const key = lab.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        ordered.push({ display: lab, norm: key });
      }
    }
  }
  ordered.sort((a, b) => a.display.localeCompare(b.display, undefined, { sensitivity: "base" }));
  return ordered;
}

export default function ComparePage() {
  const { addItem } = useCart();
  const [items, setItems] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setItems(loadCompare());
  }, []);

  const specRows = useMemo(() => collectSpecLabels(items), [items]);

  const updateItems = useCallback((next) => {
    setItems(next);
    persistCompare(next);
  }, []);

  const removeProduct = (id) => {
    const next = items.filter((p) => String(p.id) !== String(id));
    updateItems(next);
    toast.success("Removed from compare");
  };

  const handleAddToCart = (row) => {
    const stocked = typeof row.inStock === "boolean" ? row.inStock : true;
    if (!stocked) {
      toast.error("This product is out of stock.");
      return;
    }
    addItem({
      productId: row.id,
      slug: row.slug,
      name: row.name,
      image: row.image || "",
      unitPrice: Number(row.price) || 0,
      price: Number(row.price) || 0,
      quantity: 1,
      variationLabel: "",
    });
    toast.success("Added to cart");
  };

  if (!mounted) return null;

  const thBase = {
    borderBottom: "2px solid #E5E5E5",
    padding: "14px 12px",
    textAlign: "left",
    verticalAlign: "bottom",
    background: "#FAFAFA",
    fontSize: 12,
    fontWeight: 700,
    color: "#111111",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  };

  const tdLabel = {
    borderBottom: "1px solid #E5E5E5",
    padding: "12px 14px",
    fontSize: 12,
    fontWeight: 700,
    color: "#555555",
    background: "#FAFAFA",
    whiteSpace: "nowrap",
    width: 140,
    minWidth: 120,
  };

  const tdCell = {
    borderBottom: "1px solid #E5E5E5",
    padding: "12px 14px",
    textAlign: "center",
    verticalAlign: "middle",
    fontSize: 14,
    color: "#111111",
    minWidth: 160,
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 16px 64px", minHeight: "60vh" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 8 }}>
        <h1
          style={{
            fontFamily: "var(--font-heading), 'Libre Baskerville', Georgia, serif",
            fontSize: 28,
            fontWeight: 700,
            color: "#111111",
            margin: 0,
          }}
        >
          Compare products
        </h1>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              updateItems([]);
              toast.success("Compare list cleared");
            }}
            style={{
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 600,
              color: "#6b7280",
              background: "#fff",
              border: "1px solid #E5E5E5",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Clear all
          </button>
        ) : null}
      </div>
      <p style={{ fontSize: 13, color: "#888888", marginBottom: 28 }}>
        {items.length === 0
          ? "Add up to 4 products from any product page using Compare."
          : `${items.length} product${items.length !== 1 ? "s" : ""} · Up to 4`}
      </p>

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", border: "1px dashed #E5E5E5", borderRadius: 12, background: "#FAFAFA" }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>⇄</p>
          <p style={{ fontSize: 15, color: "#6b7280", marginBottom: 20 }}>Nothing to compare yet.</p>
          <Link
            href="/products"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              background: "#111111",
              color: "#fff",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              borderRadius: 6,
            }}
          >
            Browse shop
          </Link>
        </div>
      ) : (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", border: "1px solid #E5E5E5", borderRadius: 10, background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: Math.max(480, 140 + items.length * 180) }}>
            <thead>
              <tr>
                <th scope="col" style={{ ...thBase, width: 140, minWidth: 120 }} />
                {items.map((p) => (
                  <th key={String(p.id)} scope="col" style={{ ...thBase, minWidth: 180, textAlign: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <Link
                        href={`/${p.slug}`}
                        style={{
                          fontFamily: "var(--font-heading), 'Libre Baskerville', Georgia, serif",
                          fontSize: 15,
                          fontWeight: 700,
                          color: "#111111",
                          textDecoration: "none",
                          textTransform: "none",
                          letterSpacing: "0.02em",
                          lineHeight: 1.3,
                          textAlign: "center",
                        }}
                      >
                        {p.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeProduct(p.id)}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#D72323",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          textDecoration: "underline",
                          textTransform: "none",
                          letterSpacing: "0.02em",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" style={tdLabel}>
                  Image
                </th>
                {items.map((p) => (
                  <td key={`img-${p.id}`} style={tdCell}>
                    <Link href={`/${p.slug}`} style={{ display: "block" }}>
                      {p.image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={p.image}
                          alt=""
                          style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8, margin: "0 auto", display: "block" }}
                        />
                      ) : (
                        <span style={{ fontSize: 32 }} aria-hidden>
                          🖼️
                        </span>
                      )}
                    </Link>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" style={tdLabel}>
                  Price
                </th>
                {items.map((p) => (
                  <td key={`price-${p.id}`} style={{ ...tdCell, fontFamily: "var(--font-price), 'Bebas Neue', sans-serif", fontSize: 20, fontWeight: 700, color: "#D72323" }}>
                    {formatPrice(p.price)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" style={tdLabel}>
                  In stock
                </th>
                {items.map((p) => {
                  const stocked = typeof p.inStock === "boolean" ? p.inStock : true;
                  return (
                  <td key={`stock-${p.id}`} style={{ ...tdCell, fontSize: 18, fontWeight: 700, color: stocked ? "#059669" : "#9ca3af" }}>
                    {stocked ? "✓" : "✗"}
                  </td>
                );
                })}
              </tr>
              {specRows.map(({ display, norm }) => (
                <tr key={norm}>
                  <th scope="row" style={tdLabel}>
                    {display}
                  </th>
                  {items.map((p) => (
                    <td key={`${p.id}-${norm}`} style={tdCell}>
                      {specValue(p.specifications, norm)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row" style={{ ...tdLabel, borderBottom: "none" }}>
                  Add to cart
                </th>
                {items.map((p) => {
                  const stocked = typeof p.inStock === "boolean" ? p.inStock : true;
                  return (
                  <td key={`cart-${p.id}`} style={{ ...tdCell, borderBottom: "none", paddingBottom: 20 }}>
                    <button
                      type="button"
                      disabled={!stocked}
                      onClick={() => handleAddToCart(p)}
                      style={{
                        padding: "10px 20px",
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        border: "none",
                        borderRadius: 6,
                        cursor: stocked ? "pointer" : "not-allowed",
                        background: stocked ? "#111111" : "#E5E5E5",
                        color: stocked ? "#fff" : "#9ca3af",
                      }}
                    >
                      Add to cart
                    </button>
                  </td>
                );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

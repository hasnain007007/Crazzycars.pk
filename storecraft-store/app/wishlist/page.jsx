"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/currency";

const WISHLIST_KEY = "sialkot_wishlist";

export default function WishlistPage() {
  const [items, setItems] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(WISHLIST_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setItems([]);
    }
  }, []);

  const removeItem = (id) => {
    const updated = items.filter((item) => String(item.id) !== String(id));
    setItems(updated);
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("sialkot-wishlist-change"));
    } catch {
      /* ignore */
    }
  };

  if (!mounted) return null;

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "40px 24px",
        minHeight: "60vh",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-heading), 'Libre Baskerville', Georgia, serif",
          fontSize: 28,
          fontWeight: 700,
          color: "#111111",
          marginBottom: 8,
        }}
      >
        My Wishlist
      </h1>
      <p style={{ fontSize: 13, color: "#888888", marginBottom: 32 }}>
        {items.length} item{items.length !== 1 ? "s" : ""}
      </p>

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>♡</p>
          <p style={{ fontSize: 16, color: "#888888", marginBottom: 24 }}>Your wishlist is empty</p>
          <Link
            href="/products"
            style={{
              display: "inline-block",
              padding: "12px 32px",
              background: "#111111",
              color: "#FFFFFF",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              borderRadius: 4,
            }}
          >
            Shop Now
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: 24,
          }}
        >
          {items.map((item) => (
            <div
              key={String(item.id)}
              style={{
                border: "1px solid #E5E5E5",
                borderRadius: 8,
                overflow: "hidden",
                background: "#FFFFFF",
              }}
            >
              <Link href={`/${item.slug}`}>
                <div style={{ aspectRatio: "1", background: "#F8F8F8", overflow: "hidden" }}>
                  {item.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.image}
                      alt={item.name || ""}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : null}
                </div>
              </Link>
              <div style={{ padding: 16 }}>
                <Link
                  href={`/${item.slug}`}
                  style={{
                    textDecoration: "none",
                    fontFamily: "var(--font-heading), 'Libre Baskerville', Georgia, serif",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#111111",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  {item.name}
                </Link>
                <p
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#111111",
                    marginBottom: 12,
                    fontFamily: "var(--font-price), 'Bebas Neue', sans-serif",
                  }}
                >
                  {formatPrice(item.price)}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link
                    href={`/${item.slug}`}
                    style={{
                      flex: 1,
                      padding: "8px",
                      background: "#111111",
                      color: "#FFFFFF",
                      textDecoration: "none",
                      fontSize: 12,
                      fontWeight: 700,
                      textAlign: "center",
                      borderRadius: 4,
                      letterSpacing: "0.06em",
                    }}
                  >
                    View
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    style={{
                      padding: "8px 12px",
                      background: "#fee2e2",
                      border: "none",
                      borderRadius: 4,
                      color: "#dc2626",
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

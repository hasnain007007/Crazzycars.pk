"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const getLink = (item) => {
  if (!item.link || !item.link.trim()) return null;

  const raw = item.link.trim();

  // Full external URL — extract pathname so same-origin navigation works
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const url = new URL(raw);
      const path = url.pathname;
      return path || "/";
    } catch {
      return raw;
    }
  }

  // Relative path — ensure leading slash
  if (raw.startsWith("/")) return raw;
  return `/${raw}`;
};

export default function FeaturedMedia() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/featured-media")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || items.length === 0) return null;

  const gridTemplateColumns =
    items.length === 1 ? "1fr" : items.length === 2 ? "repeat(2, 1fr)" : "repeat(3, 1fr)";

  return (
    <section
      style={{
        background: "#F8F8F8",
        padding: "60px 24px",
        borderTop: "1px solid #E5E5E5",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#D72323",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              margin: "0 0 8px",
            }}
          >
            Featured
          </p>
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 22,
              fontWeight: 700,
              color: "#111111",
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
            }}
          >
            Discover Our Collection
          </h2>
        </div>

        {/* Grid - all equal squares */}
        <div
          className="featured-media-grid"
          style={{
            display: "grid",
            gridTemplateColumns,
            gap: 16,
          }}
        >
          {items.map((item) => {
            const link = getLink(item);

            const card = (
              <div
                className="card-image-wrap"
                style={{
                  position: "relative",
                  width: "100%",
                  paddingBottom: "100%",
                  overflow: "hidden",
                  background: "#111111",
                  borderRadius: 4,
                  cursor: link ? "pointer" : "default",
                }}
              >
                {item.type === "video" ? (
                  <video
                    src={item.mediaUrl}
                    poster={item.thumbnailUrl || undefined}
                    autoPlay
                    muted
                    loop
                    playsInline
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.mediaUrl}
                    alt={item.title || "Featured"}
                    loading="lazy"
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center",
                      display: "block",
                      transition: "transform 0.4s ease",
                    }}
                  />
                )}

                {(item.title || item.caption || link) ? (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)",
                      padding: "24px 14px 14px",
                      zIndex: 2,
                    }}
                  >
                    {item.title ? (
                      <h3
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#FFFFFF",
                          margin: "0 0 4px",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          lineHeight: 1.3,
                        }}
                      >
                        {item.title}
                      </h3>
                    ) : null}
                    {item.caption ? (
                      <p
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.85)",
                          margin: link ? "0 0 8px" : 0,
                          lineHeight: 1.4,
                        }}
                      >
                        {item.caption}
                      </p>
                    ) : null}
                    {link ? (
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#FFFFFF",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          borderBottom: "1px solid rgba(255,255,255,0.6)",
                          paddingBottom: 1,
                        }}
                      >
                        Shop Now →
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );

            if (link) {
              return (
                <Link key={String(item._id)} href={link} style={{ textDecoration: "none", display: "block" }}>
                  {card}
                </Link>
              );
            }

            return <div key={String(item._id)}>{card}</div>;
          })}
        </div>
      </div>
    </section>
  );
}

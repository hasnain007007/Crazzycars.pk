"use client";

import { useState } from "react";
import Link from "next/link";

export default function InfoBarMobile({ pages, currentSlug }) {
  const [open, setOpen] = useState(false);

  if (!pages || pages.length === 0) return null;

  const currentPage = pages.find((p) => p.slug === currentSlug);

  return (
    <div style={{ marginBottom: 8 }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%",
          padding: "12px 16px",
          background: "#F5F5F5",
          border: "1px solid #E5E5E5",
          borderRadius: open ? "6px 6px 0 0" : 6,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#FFFFFF",
              background: "#111111",
              padding: "3px 10px",
              borderRadius: 3,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Information
          </span>
          {currentPage ? (
            <span style={{ fontSize: 13, color: "#D72323", fontWeight: 600 }}>
              {currentPage.title}
            </span>
          ) : null}
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#888888"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{
            flexShrink: 0,
            transition: "transform 0.25s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open ? (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E5E5",
            borderTop: "none",
            borderRadius: "0 0 6px 6px",
            overflow: "hidden",
          }}
        >
          {pages.map((page, i) => {
            const isActive = currentSlug === page.slug;
            return (
              <Link
                key={String(page._id || i)}
                href={`/${page.slug}`}
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 16px",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#D72323" : "#555555",
                  textDecoration: "none",
                  borderBottom: i < pages.length - 1 ? "1px solid #F5F5F5" : "none",
                  background: isActive ? "#FFFDF5" : "#FFFFFF",
                }}
              >
                <span style={{ fontSize: 10, color: isActive ? "#D72323" : "#CCCCCC" }}>
                  {isActive ? "▶" : "›"}
                </span>
                {page.title}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import OptionForm from "@/components/product-options/OptionForm";

export default function NewProductOptionPage() {
  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 14, color: "#6b7280" }}>
          <Link href="/product-options" style={{ color: "#2563eb", textDecoration: "none" }}>
            Product Options
          </Link>
          {" >> Add New Option"}
        </div>
        <Link href="/product-options">
          <button
            style={{
              background: "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            View All Options
          </button>
        </Link>
      </div>
      <OptionForm />
    </div>
  );
}

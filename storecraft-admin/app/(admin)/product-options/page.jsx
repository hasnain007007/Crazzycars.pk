"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function ProductOptionsPage() {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("adminToken") ||
        localStorage.getItem("authToken");
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/product-options", { headers });
      if (res.status === 401) {
        console.error("Unauthorized - check token");
        setOptions([]);
        return;
      }
      const data = await res.json();
      if (data.success) setOptions(data.options || []);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  const handleDelete = async (id, name) => {
    const confirmed = window.confirm(`Delete "${name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("adminToken") ||
        localStorage.getItem("authToken") ||
        "";

      const res = await fetch(`/api/product-options/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        setOptions((prev) => prev.filter((o) => o._id !== id));
      } else {
        alert(`Delete failed: ${data.error || "Unknown error"}`);
      }
    } catch (e) {
      console.error("Delete error:", e);
      alert(`Delete failed: ${e.message}`);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>⚙️</span>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>Product Options</h1>
        </div>
        <Link href="/product-options/new">
          <button
            style={{
              background: "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            + Add New Option
          </button>
        </Link>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "#9ca3af" }}>Loading...</div>
        ) : options.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "#9ca3af" }}>
            <p style={{ fontSize: 16, margin: 0 }}>No options yet.</p>
            <Link href="/product-options/new">
              <button
                style={{
                  marginTop: 12,
                  background: "#16a34a",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Add your first option
              </button>
            </Link>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["#", "Product Option", "Track Inventory", "Sort Order", "Status", "Actions"].map((col) => (
                  <th
                    key={col}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#374151",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {options.map((opt, idx) => (
                <tr key={opt._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#6b7280" }}>{idx + 1}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <Link href={`/product-options/${opt._id}/edit`}>
                      <span style={{ color: "#2563eb", fontWeight: 500, fontSize: 14, cursor: "pointer" }}>
                        {opt.name || "(unnamed)"}
                      </span>
                    </Link>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        background: opt.trackInventory ? "#16a34a" : "#ef4444",
                        color: "#fff",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {opt.trackInventory ? "Yes" : "No"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#374151" }}>{opt.sortOrder}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        background: opt.status === "published" ? "#16a34a" : "#3b82f6",
                        color: "#fff",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {opt.status === "published" ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Link href={`/product-options/${opt._id}/edit`}>
                        <button
                          style={{
                            padding: "5px 12px",
                            border: "1px solid #d1d5db",
                            borderRadius: 6,
                            background: "#fff",
                            fontSize: 12,
                            cursor: "pointer",
                            color: "#374151",
                          }}
                        >
                          Edit
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDelete(opt._id, opt.name)}
                        style={{
                          padding: "5px 12px",
                          background: "#ef4444",
                          border: "none",
                          borderRadius: 6,
                          color: "#fff",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

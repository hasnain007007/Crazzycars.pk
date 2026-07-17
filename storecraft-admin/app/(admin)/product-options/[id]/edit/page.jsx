"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function EditProductOptionPage() {
  const { id } = useParams();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    trackInventory: true,
    status: "published",
    sortOrder: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchOption = async () => {
      try {
        const token =
          localStorage.getItem("token") ||
          localStorage.getItem("adminToken") ||
          localStorage.getItem("authToken") ||
          "";
        const res = await fetch(`/api/product-options/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.option) {
          setForm({
            name: data.option.name || "",
            trackInventory: data.option.trackInventory ?? true,
            status: data.option.status || "published",
            sortOrder: data.option.sortOrder ?? 0,
          });
        } else {
          setError("Option not found");
        }
      } catch (_e) {
        setError("Failed to load option");
      } finally {
        setLoading(false);
      }
    };
    fetchOption();
  }, [id]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert("Option name is required");
      return;
    }
    setSaving(true);
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("adminToken") ||
        localStorage.getItem("authToken") ||
        "";
      const statusValue = ["published", "draft"].includes(form.status) ? form.status : "published";
      const res = await fetch(`/api/product-options/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          trackInventory: form.trackInventory,
          status: statusValue,
          sortOrder: Number(form.sortOrder) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/product-options");
      } else {
        alert(`Save failed: ${data.error || "Unknown"}`);
      }
    } catch (e) {
      alert(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    fontSize: 14,
    color: "#111827",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
  };

  const labelStyle = {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: "#374151",
    marginBottom: 6,
  };

  if (loading) return <div style={{ padding: 40, color: "#9ca3af" }}>Loading option...</div>;

  if (error) return <div style={{ padding: 40, color: "#ef4444" }}>{error}</div>;

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
          {" >> Edit Option"}
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

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 28,
          maxWidth: 640,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <label style={labelStyle}>Option Name *</label>
            <input
              style={inputStyle}
              placeholder="e.g. Color"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  name: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <label style={labelStyle}>Track Inventory *</label>
            <select
              style={inputStyle}
              value={form.trackInventory ? "yes" : "no"}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  trackInventory: e.target.value === "yes",
                }))
              }
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr auto",
            gap: 16,
            alignItems: "flex-end",
          }}
        >
          <div>
            <label style={labelStyle}>Status *</label>
            <select
              style={inputStyle}
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value,
                }))
              }
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Sort Order *</label>
            <input
              type="number"
              style={inputStyle}
              value={form.sortOrder}
              min="0"
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  sortOrder: parseInt(e.target.value, 10) || 0,
                }))
              }
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "9px 24px",
              background: saving ? "#9ca3af" : "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? "default" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {saving ? "Saving..." : "💾 Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function OptionForm({ initialData = null, optionId = null }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initialData?.name || "",
    trackInventory: initialData?.trackInventory ?? true,
    status: initialData?.status || "published",
    sortOrder: initialData?.sortOrder ?? 0,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Option name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  useEffect(() => {
    const keys = ["token", "adminToken", "authToken", "jwt"];
    keys.forEach((k) => {
      const val = localStorage.getItem(k);
      if (val) console.log("Found token at key:", k, "value:", `${val.substring(0, 20)}...`);
    });
  }, []);

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("adminToken") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("jwt") ||
        sessionStorage.getItem("token");

      console.log("Token found:", !!token);
      console.log("Saving form:", form);

      const url = optionId ? `/api/product-options/${optionId}` : "/api/product-options";
      const method = optionId ? "PUT" : "POST";

      console.log("Calling:", method, url);

      const statusValue = ["published", "draft"].includes(form.status) ? form.status : "published";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: form.name.trim(),
          trackInventory: form.trackInventory,
          status: statusValue,
          sortOrder: Number(form.sortOrder) || 0,
        }),
      });

      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("Response data:", data);

      if (data.success) {
        router.push("/product-options");
      } else {
        alert(`Error: ${data.error || "Unknown error"}`);
      }
    } catch (e) {
      console.error("Save error:", e);
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
  };

  const labelStyle = {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: "#374151",
    marginBottom: 6,
  };

  return (
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
            style={{
              ...inputStyle,
              borderColor: errors.name ? "#ef4444" : "#e5e7eb",
            }}
            placeholder="e.g. Color"
            value={form.name}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }));
              setErrors((e2) => ({ ...e2, name: "" }));
            }}
          />
          {errors.name && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{errors.name}</p>}
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
  );
}

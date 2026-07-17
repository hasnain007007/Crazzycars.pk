"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PAKISTAN_PROVINCES } from "@/lib/constants";

function buildEmptyForm() {
  return {
    name: "",
    provinces: [],
    isDefault: false,
    status: "active",
    freeShipping: { enabled: false, threshold: 0 },
    freeShippingThreshold: 0,
    weightRanges: [
      { minWeight: 0, maxWeight: 100, price: 3.99 },
      { minWeight: 101, maxWeight: 250, price: 4.99 },
      { minWeight: 251, maxWeight: 500, price: 6.99 },
      { minWeight: 501, maxWeight: 1000, price: 9.99 },
      { minWeight: 1001, maxWeight: 2000, price: 14.99 },
      { minWeight: 2001, maxWeight: 99999, price: 19.99 },
    ],
    sortOrder: 0,
  };
}

export default function ShippingPage() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(buildEmptyForm);

  const fetchZones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shipping", { credentials: "include" });
      const data = await res.json();
      if (data.success) setZones(data.zones || []);
      else toast.error(data.error || "Failed to load zones");
    } catch {
      toast.error("Failed to load zones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const handleEdit = (zone) => {
    setEditingZone(String(zone._id));
    const legacyT = Math.max(0, Number(zone.freeShippingThreshold) || 0);
    const fs = zone.freeShipping && typeof zone.freeShipping === "object" ? zone.freeShipping : null;
    const freeShipping =
      fs && "enabled" in fs
        ? {
            enabled: Boolean(fs.enabled),
            threshold: Math.max(0, Number(fs.threshold) || 0),
          }
        : { enabled: legacyT > 0, threshold: legacyT };
    setForm({
      name: zone.name || "",
      provinces: Array.isArray(zone.provinces)
        ? zone.provinces
        : Array.isArray(zone.countries)
          ? zone.countries
          : [],
      isDefault: zone.isDefault || false,
      status: zone.status || "active",
      freeShipping,
      freeShippingThreshold: freeShipping.enabled ? freeShipping.threshold : 0,
      weightRanges:
        zone.weightRanges?.length > 0
          ? zone.weightRanges.map((r) => ({
              minWeight: r.minWeight,
              maxWeight: r.maxWeight,
              price: r.price,
            }))
          : buildEmptyForm().weightRanges,
      sortOrder: zone.sortOrder || 0,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete zone "${name}"?`)) return;
    try {
      const res = await fetch(`/api/shipping/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.error || "Delete failed");
        return;
      }
      setZones((prev) => prev.filter((z) => String(z._id) !== String(id)));
      toast.success("Zone deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Zone name is required");
      return;
    }
    if (form.weightRanges.length === 0) {
      toast.error("Add at least one weight range");
      return;
    }
    const fs = form.freeShipping || { enabled: false, threshold: 0 };
    const payload = {
      ...form,
      freeShipping: {
        enabled: Boolean(fs.enabled),
        threshold: Math.max(0, Number(fs.threshold) || 0),
      },
      freeShippingThreshold: fs.enabled ? Math.max(0, Number(fs.threshold) || 0) : 0,
    };
    setSaving(true);
    try {
      const url = editingZone ? `/api/shipping/${editingZone}` : "/api/shipping";
      const method = editingZone ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingZone ? "Zone updated!" : "Zone created!");
        setShowForm(false);
        setEditingZone(null);
        setForm(buildEmptyForm());
        fetchZones();
      } else {
        toast.error(data.error || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleProvince = (prov) => {
    setForm((f) => ({
      ...f,
      provinces: f.provinces.includes(prov) ? f.provinces.filter((p) => p !== prov) : [...f.provinces, prov],
    }));
  };

  const selectAllProvinces = () => {
    setForm((f) => ({
      ...f,
      provinces: f.provinces.length === PAKISTAN_PROVINCES.length ? [] : [...PAKISTAN_PROVINCES],
    }));
  };

  const addWeightRange = () => {
    const lastRange = form.weightRanges[form.weightRanges.length - 1];
    const newMin = lastRange ? lastRange.maxWeight + 1 : 0;
    setForm((f) => ({
      ...f,
      weightRanges: [...f.weightRanges, { minWeight: newMin, maxWeight: newMin + 499, price: 0 }],
    }));
  };

  const updateWeightRange = (idx, field, value) => {
    const ranges = [...form.weightRanges];
    ranges[idx] = {
      ...ranges[idx],
      [field]: parseFloat(value) || 0,
    };
    setForm((f) => ({ ...f, weightRanges: ranges }));
  };

  const removeWeightRange = (idx) => {
    setForm((f) => ({
      ...f,
      weightRanges: f.weightRanges.filter((_, i) => i !== idx),
    }));
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              background: "#e6f7f5",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#009688"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="1" y="3" width="15" height="13" rx="1" />
              <path d="M16 8h4l3 5v4h-7V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>Shipping Settings</h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 0" }}>Set shipping rates by zone and weight</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingZone(null);
            setForm(buildEmptyForm());
            setShowForm(true);
          }}
          style={{
            background: "#009688",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Add Zone
        </button>
      </div>

      {showForm && (
        <div
          style={{
            ...cardStyle,
            border: "2px solid #009688",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              paddingBottom: 12,
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: 0 }}>
              {editingZone ? "Edit Zone" : "Add New Zone"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingZone(null);
                setForm(buildEmptyForm());
              }}
              style={{
                background: "none",
                border: "none",
                fontSize: 20,
                cursor: "pointer",
                color: "#9ca3af",
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Zone Name *
            </label>
            <input
              style={inputStyle}
              placeholder="e.g. Punjab & Major Cities"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 10,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#166534", margin: 0 }}>🎁 Free Shipping</p>
                <p style={{ fontSize: 12, color: "#16a34a", margin: "2px 0 0" }}>
                  Offer free shipping to customers in this zone
                </p>
              </div>
              <label
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: 48,
                  height: 26,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.freeShipping?.enabled || false}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      freeShipping: {
                        ...(f.freeShipping || {}),
                        enabled: e.target.checked,
                        threshold: f.freeShipping?.threshold ?? 0,
                      },
                    }))
                  }
                  style={{
                    position: "absolute",
                    opacity: 0,
                    width: 48,
                    height: 26,
                    margin: 0,
                    cursor: "pointer",
                    zIndex: 2,
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: form.freeShipping?.enabled ? "#009688" : "#d1d5db",
                    borderRadius: 99,
                    transition: "background 0.2s",
                    pointerEvents: "none",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: form.freeShipping?.enabled ? 25 : 3,
                    width: 20,
                    height: 20,
                    background: "#fff",
                    borderRadius: "50%",
                    transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    pointerEvents: "none",
                  }}
                />
              </label>
            </div>

            {form.freeShipping?.enabled ? (
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 8 }}>
                  Minimum order amount for free shipping:
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {[
                    { label: "All Orders", value: 0 },
                    { label: "Rs. 2,500+", value: 2500 },
                    { label: "Rs. 2,999+", value: 2999 },
                    { label: "Rs. 5,000+", value: 5000 },
                    { label: "Rs. 10,000+", value: 10000 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          freeShipping: {
                            ...(f.freeShipping || {}),
                            threshold: opt.value,
                          },
                        }))
                      }
                      style={{
                        padding: "5px 14px",
                        border: "1px solid",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 500,
                        borderColor:
                          (form.freeShipping?.threshold || 0) === opt.value ? "#009688" : "#e5e7eb",
                        background:
                          (form.freeShipping?.threshold || 0) === opt.value ? "#e6f7f5" : "#fff",
                        color: (form.freeShipping?.threshold || 0) === opt.value ? "#009688" : "#374151",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "#374151", fontWeight: 500, flexShrink: 0 }}>
                    Or enter custom amount (Rs.):
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.freeShipping?.threshold ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        freeShipping: {
                          ...(f.freeShipping || {}),
                          threshold: parseFloat(e.target.value) || 0,
                        },
                      }))
                    }
                    placeholder="e.g. 50"
                    style={{
                      width: 120,
                      padding: "6px 10px",
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    background: "#e6f7f5",
                    borderRadius: 6,
                    fontSize: 12,
                    color: "#166534",
                  }}
                >
                  ✓ Customers in {form.name || "this zone"} get
                  {(form.freeShipping?.threshold || 0) === 0
                    ? " FREE shipping on ALL orders"
                    : ` FREE shipping on orders over Rs. ${(Number(form.freeShipping?.threshold) || 0).toLocaleString("en-PK")}`}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
                Free shipping is OFF for this zone. All orders pay shipping based on weight.
              </p>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 20,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              {["active", "inactive"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, status: s }))}
                  style={{
                    padding: "6px 16px",
                    border: "1px solid",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                    borderColor: form.status === s ? "#009688" : "#e5e7eb",
                    background: form.status === s ? "#009688" : "#fff",
                    color: form.status === s ? "#fff" : "#374151",
                  }}
                >
                  {s === "active" ? "✓ Active" : "○ Inactive"}
                </button>
              ))}
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 13,
                color: "#374151",
              }}
            >
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                style={{ accentColor: "#009688" }}
              />
              Default Zone
              <span style={{ fontSize: 11, color: "#9ca3af" }}>(used when province not matched)</span>
            </label>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#374151",
                  margin: 0,
                }}
              >
                Provinces in this Zone
              </label>
              <button
                type="button"
                onClick={selectAllProvinces}
                style={{
                  padding: "4px 12px",
                  background: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  color: "#374151",
                  fontWeight: 500,
                }}
              >
                {form.provinces.length === PAKISTAN_PROVINCES.length ? "Clear All" : "Select All"}
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                padding: 12,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                background: "#fafafa",
              }}
            >
              {PAKISTAN_PROVINCES.map((prov) => (
                <label
                  key={prov}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: "#374151",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.provinces.includes(prov)}
                    onChange={() => toggleProvince(prov)}
                    style={{ accentColor: "#009688", width: 16, height: 16 }}
                  />
                  {prov}
                </label>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
              Select one or more provinces. Leave empty only for the Default Zone (fallback for unmatched provinces).
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <label style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Weight Ranges & Prices</label>
              <button
                type="button"
                onClick={addWeightRange}
                style={{
                  padding: "5px 12px",
                  background: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  color: "#374151",
                }}
              >
                + Add Range
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 40px",
                gap: 8,
                marginBottom: 6,
              }}
            >
              {["From (g)", "To (g)", "Price (Rs.)", ""].map((h) => (
                <div
                  key={h}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {h}
                </div>
              ))}
            </div>
            {form.weightRanges.map((range, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 40px",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <input
                  type="number"
                  value={range.minWeight}
                  onChange={(e) => updateWeightRange(idx, "minWeight", e.target.value)}
                  style={inputStyle}
                  min="0"
                />
                <input
                  type="number"
                  value={range.maxWeight}
                  onChange={(e) => updateWeightRange(idx, "maxWeight", e.target.value)}
                  style={inputStyle}
                  min="0"
                />
                <input
                  type="number"
                  value={range.price}
                  onChange={(e) => updateWeightRange(idx, "price", e.target.value)}
                  style={inputStyle}
                  min="0"
                  placeholder="Rs."
                />
                <button
                  type="button"
                  onClick={() => removeWeightRange(idx)}
                  style={{
                    background: "#fee2e2",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    color: "#dc2626",
                    fontSize: 16,
                  }}
                >
                  🗑
                </button>
              </div>
            ))}
            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 12,
                color: "#92400e",
                marginTop: 8,
              }}
            >
              💡 Tip: Set the last range max to 99999 to handle all heavy orders
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%",
              padding: 12,
              background: saving ? "#9ca3af" : "#009688",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: saving ? "default" : "pointer",
            }}
          >
            {saving ? "Saving..." : "💾 Save Zone"}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Loading shipping zones...</div>
      ) : zones.length === 0 ? (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            padding: 60,
            color: "#9ca3af",
          }}
        >
          <p style={{ fontSize: 18, margin: "0 0 12px" }}>No shipping zones yet</p>
          <p style={{ fontSize: 13, margin: 0 }}>Add your first shipping zone to get started</p>
        </div>
      ) : (
        zones.map((zone) => (
          <div
            key={String(zone._id)}
            style={{
              ...cardStyle,
              borderLeft: zone.isDefault ? "4px solid #f59e0b" : "4px solid #009688",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>🏙 {zone.name}</h3>
                  {zone.isDefault ? (
                    <span
                      style={{
                        background: "#fef3c7",
                        color: "#92400e",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 99,
                      }}
                    >
                      DEFAULT
                    </span>
                  ) : null}
                  <span
                    style={{
                      background: zone.status === "active" ? "#dcfce7" : "#f3f4f6",
                      color: zone.status === "active" ? "#16a34a" : "#6b7280",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 99,
                    }}
                  >
                    {zone.status === "active" ? "Active" : "Inactive"}
                  </span>
                </div>
                {(() => {
                  const provs =
                    zone.provinces?.length > 0
                      ? zone.provinces
                      : zone.countries?.length > 0
                        ? zone.countries
                        : [];
                  return provs.length > 0 ? (
                    <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>
                      Provinces: {provs.join(", ")}
                    </p>
                  ) : null;
                })()}
                {(() => {
                  const fs = zone.freeShipping && typeof zone.freeShipping === "object" ? zone.freeShipping : null;
                  const legacyT = Math.max(0, Number(zone.freeShippingThreshold) || 0);
                  const enabled = fs && "enabled" in fs ? Boolean(fs.enabled) : legacyT > 0;
                  const th = fs && "enabled" in fs ? Math.max(0, Number(fs.threshold) || 0) : legacyT;
                  if (enabled) {
                    return (
                      <p style={{ fontSize: 12, color: "#16a34a", margin: "4px 0 0", fontWeight: 500 }}>
                        🎁 Free shipping:{" "}
                        {th === 0 ? "All orders" : `Orders over Rs. ${Number(th).toLocaleString("en-PK")}`}
                      </p>
                    );
                  }
                  return (
                    <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0" }}>No free shipping for this zone</p>
                  );
                })()}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => handleEdit(zone)}
                  style={{
                    padding: "6px 14px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 6,
                    background: "#fff",
                    fontSize: 13,
                    cursor: "pointer",
                    color: "#374151",
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(zone._id, zone.name)}
                  style={{
                    padding: "6px 14px",
                    border: "none",
                    borderRadius: 6,
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
            <div style={{ background: "#f9fafb", borderRadius: 8, overflow: "hidden" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    <th
                      style={{
                        padding: "8px 12px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#374151",
                        fontSize: 12,
                      }}
                    >
                      Weight Range
                    </th>
                    <th
                      style={{
                        padding: "8px 12px",
                        textAlign: "right",
                        fontWeight: 600,
                        color: "#374151",
                        fontSize: 12,
                      }}
                    >
                      Shipping Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(zone.weightRanges || [])
                    .slice()
                    .sort((a, b) => a.minWeight - b.minWeight)
                    .map((range, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "8px 12px", color: "#374151" }}>
                          {range.minWeight}g — {range.maxWeight >= 99999 ? "and above" : `${range.maxWeight}g`}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            textAlign: "right",
                            fontWeight: 700,
                            color: "#009688",
                          }}
                        >
                          Rs. {Number(range.price || 0).toLocaleString("en-PK")}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

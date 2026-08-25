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
    const payload = {
      ...form,
      freeShipping: {
        enabled: false,
        threshold: 0,
      },
      freeShippingThreshold: 0,
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
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, color: "#334155", margin: 0 }}>
              Free shipping disabled
            </p>
            <p style={{ fontSize: 12, color: "#64748b", margin: "6px 0 0" }}>
              Store policy: no free delivery. All orders charge at least Rs. 250 delivery (higher
              zone rates still apply). Free-shipping toggles are locked off.
            </p>
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
                <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0" }}>
                  Min delivery Rs. 250 (no free shipping)
                </p>
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

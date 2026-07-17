"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { clearStorefrontBrowserCache } from "@/lib/clearStorefrontBrowserCache";
import { clearAdminSettingsCache } from "@/lib/adminSettingsCache";

const ICON_OPTIONS = [
  { value: "🚚", label: "Truck (Shipping)" },
  { value: "↩️", label: "Return Arrow" },
  { value: "🔒", label: "Lock (Secure)" },
  { value: "⭐", label: "Star (Quality)" },
  { value: "✅", label: "Checkmark" },
  { value: "🛡️", label: "Shield" },
  { value: "💎", label: "Diamond" },
  { value: "📦", label: "Package" },
  { value: "❤️", label: "Heart" },
  { value: "🌍", label: "Globe" },
  { value: "📞", label: "Phone" },
  { value: "💳", label: "Card" },
  { value: "🏆", label: "Trophy" },
  { value: "✨", label: "Sparkle" },
  { value: "🔐", label: "Padlock" },
  { value: "📋", label: "Clipboard" },
];

const DEFAULT_BADGES = [
  {
    icon: "🚚",
    title: "Free Shipping",
    description: "On orders over Rs. 2,999",
    enabled: true,
  },
  {
    icon: "↩️",
    title: "30 Day Returns",
    description: "Easy hassle-free returns",
    enabled: true,
  },
  {
    icon: "🔒",
    title: "Secure Payment",
    description: "256-bit SSL encryption",
    enabled: true,
  },
  {
    icon: "⭐",
    title: "Premium Quality",
    description: "Premium car accessories",
    enabled: true,
  },
];

export default function TrustBadgeSettings() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    enabled: true,
    items: DEFAULT_BADGES,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/settings", {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok || !data.success) return;
        const trust = data?.settings?.trustBadges || data?.data?.trustBadges;

        if (trust) {
          setForm((prev) => ({
            ...prev,
            ...trust,
            enabled: trust.enabled !== false,
            items: trust.items?.length > 0 ? trust.items : DEFAULT_BADGES,
          }));
        }
      } catch {
        /* ignore */
      }
    };
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ trustBadges: form }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Trust badges saved!");
        clearStorefrontBrowserCache();
        clearAdminSettingsCache();
      } else {
        toast.error(data.error || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (index, field, value) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const addItem = () => {
    if (form.items.length >= 6) {
      toast.error("Maximum 6 badges allowed");
      return;
    }
    setForm((f) => ({
      ...f,
      items: [...f.items, { icon: "✅", title: "", description: "", enabled: true }],
    }));
  };

  const removeItem = (index) => {
    if (form.items.length <= 1) {
      toast.error("Minimum 1 badge required");
      return;
    }
    setForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== index),
    }));
  };

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    fontSize: 14,
    color: "#111827",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
    fontFamily: "inherit",
  };

  const previewEnabled = form.items.filter((item) => item.enabled);
  const previewCols = Math.max(1, Math.min(previewEnabled.length || 1, 4));

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 12,
          padding: "14px 20px",
          marginBottom: 24,
        }}
      >
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#166534", margin: 0 }}>Trust Badges Settings</p>
          <p style={{ fontSize: 12, color: "#16a34a", margin: "2px 0 0" }}>Edit the trust badges shown below products</p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          style={{
            padding: "10px 24px",
            background: saving ? "#9ca3af" : "#009688",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? "default" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Save Badges"}
        </button>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 2px" }}>Show Trust Badges</p>
          <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Display trust badges on homepage</p>
        </div>
        <label
          style={{
            position: "relative",
            display: "inline-block",
            width: 44,
            height: 24,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
            style={{ display: "none" }}
          />
          <span
            style={{
              position: "absolute",
              inset: 0,
              background: form.enabled ? "#009688" : "#d1d5db",
              borderRadius: 99,
              transition: "background 0.2s",
            }}
          />
          <span
            style={{
              position: "absolute",
              top: 2,
              left: form.enabled ? 22 : 2,
              width: 20,
              height: 20,
              background: "#fff",
              borderRadius: "50%",
              transition: "left 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }}
          />
        </label>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#9ca3af",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            margin: "0 0 16px",
          }}
        >
          Preview
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${previewCols}, 1fr)`,
            gap: 16,
            background: "#F8F8F8",
            padding: "20px",
            borderRadius: 8,
          }}
        >
          {previewEnabled.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "#888888", textAlign: "center", gridColumn: "1 / -1" }}>
              No badges enabled — enable at least one badge to preview.
            </p>
          ) : (
            previewEnabled.map((item, i) => (
              <div
                key={`${item.title}-${i}`}
                style={{
                  textAlign: "center",
                  padding: "12px 8px",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>{item.icon || "?"}</div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#111111", margin: "0 0 4px" }}>
                  {item.title || "Badge Title"}
                </p>
                <p style={{ fontSize: 11, color: "#888888", margin: 0 }}>{item.description || "Description"}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Badge Items ({form.items.length}/6)</h3>
          <button
            type="button"
            onClick={addItem}
            style={{
              padding: "6px 14px",
              background: "#009688",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Add Badge
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {form.items.map((item, index) => (
            <div
              key={index}
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 16,
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
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Badge {index + 1}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                      fontSize: 12,
                      color: "#6b7280",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(e) => updateItem(index, "enabled", e.target.checked)}
                      style={{ accentColor: "#009688" }}
                    />
                    Enabled
                  </label>
                  {form.items.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      style={{
                        background: "#fee2e2",
                        border: "none",
                        borderRadius: 4,
                        padding: "3px 8px",
                        fontSize: 12,
                        color: "#dc2626",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                  Icon
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ICON_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      title={opt.label}
                      onClick={() => updateItem(index, "icon", opt.value)}
                      style={{
                        width: 40,
                        height: 40,
                        fontSize: 20,
                        border: "2px solid",
                        borderColor: item.icon === opt.value ? "#009688" : "#e5e7eb",
                        borderRadius: 8,
                        background: item.icon === opt.value ? "#e6f7f5" : "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {opt.value}
                    </button>
                  ))}
                </div>

                {/* Custom icon input */}
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      border: "2px solid #e5e7eb",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                      background: "#f9fafb",
                      flexShrink: 0,
                    }}
                  >
                    {item.icon || "?"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#6b7280",
                        marginBottom: 4,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Or type custom icon/emoji
                    </label>
                    <input
                      type="text"
                      value={item.icon || ""}
                      onChange={(e) => updateItem(index, "icon", e.target.value)}
                      placeholder="Type emoji or text e.g. 🎁 or ★"
                      maxLength={10}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 6,
                        fontSize: 18,
                        color: "#111827",
                        outline: "none",
                        boxSizing: "border-box",
                        background: "#fff",
                        fontFamily: "inherit",
                      }}
                    />
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>
                      You can paste any emoji from your keyboard or type text
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                    Title
                  </label>
                  <input
                    style={inputStyle}
                    placeholder="Free Shipping"
                    value={item.title}
                    onChange={(e) => updateItem(index, "title", e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                    Description
                  </label>
                  <input
                    style={inputStyle}
                    placeholder="On orders over Rs. 2,999"
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

const DEFAULT_TRUST_BADGES = [
  {
    icon: "🛡️",
    text: "Premium Quality",
    subtext: "Exceptional Standards",
    enabled: true,
  },
  {
    icon: "↩️",
    text: "30 Day Returns",
    subtext: "Hassle Free Returns",
    enabled: true,
  },
  {
    icon: "🔒",
    text: "Secure Payment",
    subtext: "100% Secure Checkout",
    enabled: true,
  },
  {
    icon: "🚚",
    text: "Fast Dispatch",
    subtext: "Quick Delivery",
    enabled: true,
  },
];

function normalizeLoadedTrustBadges(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return DEFAULT_TRUST_BADGES;
  const iconFallback = ["🛡️", "↩️", "🔒", "🚚"];
  return arr.map((b, i) => {
    const d = DEFAULT_TRUST_BADGES[Math.min(i, DEFAULT_TRUST_BADGES.length - 1)];
    const text = String(b?.text ?? b?.title ?? "").trim();
    const subtext = String(b?.subtext ?? b?.description ?? "").trim();
    const icon = String(b?.icon ?? "").trim() || iconFallback[i % iconFallback.length] || d.icon;
    return {
      icon,
      text: text || d.text,
      subtext,
      enabled: b?.enabled !== false,
    };
  });
}

const DEFAULT_QUALITY_BADGES = [
  { text: "Premium Quality", enabled: true },
  { text: "Quality Checked", enabled: true },
  { text: "COD Available", enabled: true },
];

const DEFAULT_ASIAN_IMPORTS_BADGE = {
  enabled: true,
  title: "Quality Assured",
  description:
    "We source kitchen, beauty and bag products from trusted suppliers. Every item is quality-checked before it ships.",
};

export default function ProductBadgeSettings() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    enabled: true,
    discreteShipping: {
      enabled: true,
      title: "Fast Nationwide Delivery",
      description: "We deliver kitchen accessories, beauty bags and ladies bags across Pakistan with tracking where available.",
    },
    trustBadges: DEFAULT_TRUST_BADGES,
    qualityBadges: DEFAULT_QUALITY_BADGES,
    asianImportsBadge: { ...DEFAULT_ASIAN_IMPORTS_BADGE },
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/settings", {
          credentials: "include",
        });
        const data = await res.json();
        const pb = data?.settings?.productBadges || data?.data?.productBadges;
        if (pb) {
          setForm((prev) => ({
            ...prev,
            ...pb,
            trustBadges: normalizeLoadedTrustBadges(pb.trustBadges),
            qualityBadges: pb.qualityBadges?.length > 0 ? pb.qualityBadges : DEFAULT_QUALITY_BADGES,
            discreteShipping: {
              ...prev.discreteShipping,
              ...pb.discreteShipping,
            },
            asianImportsBadge: {
              ...DEFAULT_ASIAN_IMPORTS_BADGE,
              ...(typeof pb.asianImportsBadge === "object" && pb.asianImportsBadge ? pb.asianImportsBadge : {}),
            },
          }));
        }
      } catch {
        /* ignore */
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productBadges: form }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Product badges saved!");
      } else {
        toast.error("Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
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

  const Toggle = ({ checked, onChange }) => (
    <label
      style={{
        position: "relative",
        display: "inline-block",
        width: 44,
        height: 24,
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: "none" }} />
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: checked ? "#009688" : "#d1d5db",
          borderRadius: 99,
          transition: "background 0.2s",
        }}
      />
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          background: "#fff",
          borderRadius: "50%",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </label>
  );

  const BadgeList = ({ title, field }) => (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
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
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#111827",
            margin: 0,
          }}
        >
          {title}
        </h3>
        <button
          type="button"
          onClick={() =>
            setForm((f) => ({
              ...f,
              [field]: [...(f[field] || []), { text: "", enabled: true }],
            }))
          }
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
          + Add
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {(form[field] || []).map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#f9fafb",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          >
            <Toggle
              checked={item.enabled}
              onChange={(e) => {
                const updated = [...form[field]];
                updated[i] = {
                  ...updated[i],
                  enabled: e.target.checked,
                };
                setForm((f) => ({ ...f, [field]: updated }));
              }}
            />
            <input
              style={{
                ...inputStyle,
                flex: 1,
                padding: "7px 10px",
              }}
              placeholder="Badge text..."
              value={item.text}
              onChange={(e) => {
                const updated = [...form[field]];
                updated[i] = {
                  ...updated[i],
                  text: e.target.value,
                };
                setForm((f) => ({ ...f, [field]: updated }));
              }}
            />
            <button
              type="button"
              onClick={() => {
                const updated = form[field].filter((_, idx) => idx !== i);
                setForm((f) => ({ ...f, [field]: updated }));
              }}
              style={{
                background: "#fee2e2",
                border: "none",
                borderRadius: 6,
                padding: "6px 10px",
                color: "#dc2626",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );

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
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#166534",
              margin: 0,
            }}
          >
            Product Page Badges
          </p>
          <p
            style={{
              fontSize: 12,
              color: "#16a34a",
              margin: "2px 0 0",
            }}
          >
            Control trust badges and quality labels
          </p>
        </div>
        <button
          type="button"
          onClick={save}
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
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#111827",
              margin: 0,
            }}
          >
            Trust Badges (above Add to Cart)
          </h3>
          <button
            type="button"
            onClick={() =>
              setForm((f) => ({
                ...f,
                trustBadges: [...(f.trustBadges || []), { icon: "⭐", text: "", subtext: "", enabled: true }],
              }))
            }
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

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {(form.trustBadges || []).map((badge, i) => (
            <div
              key={i}
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <Toggle
                  checked={badge.enabled !== false}
                  onChange={(e) => {
                    const updated = [...(form.trustBadges || [])];
                    updated[i] = { ...updated[i], enabled: e.target.checked };
                    setForm((f) => ({ ...f, trustBadges: updated }));
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  Badge {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const updated = (form.trustBadges || []).filter((_, idx) => idx !== i);
                    setForm((f) => ({ ...f, trustBadges: updated }));
                  }}
                  style={{
                    marginLeft: "auto",
                    background: "#fee2e2",
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 10px",
                    color: "#dc2626",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  × Remove
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 1fr 1fr",
                  gap: 8,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: 4,
                    }}
                  >
                    Icon (emoji)
                  </label>
                  <input
                    style={{
                      ...inputStyle,
                      fontSize: 20,
                      textAlign: "center",
                      padding: "6px",
                    }}
                    value={badge.icon || ""}
                    onChange={(e) => {
                      const updated = [...(form.trustBadges || [])];
                      updated[i] = { ...updated[i], icon: e.target.value };
                      setForm((f) => ({ ...f, trustBadges: updated }));
                    }}
                    placeholder="🛡️"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: 4,
                    }}
                  >
                    Heading
                  </label>
                  <input
                    style={{ ...inputStyle }}
                    value={badge.text || ""}
                    onChange={(e) => {
                      const updated = [...(form.trustBadges || [])];
                      updated[i] = { ...updated[i], text: e.target.value };
                      setForm((f) => ({ ...f, trustBadges: updated }));
                    }}
                    placeholder="Premium Quality"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: 4,
                    }}
                  >
                    Subheading
                  </label>
                  <input
                    style={{ ...inputStyle }}
                    value={badge.subtext || ""}
                    onChange={(e) => {
                      const updated = [...(form.trustBadges || [])];
                      updated[i] = { ...updated[i], subtext: e.target.value };
                      setForm((f) => ({ ...f, trustBadges: updated }));
                    }}
                    placeholder="Exceptional Standards"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BadgeList title="Quality Labels (e.g. Premium Quality | No Asian Imports)" field="qualityBadges" />

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
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
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#111827",
              margin: 0,
            }}
          >
            Discrete Shipping Banner
          </h3>
          <Toggle
            checked={form.discreteShipping?.enabled}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                discreteShipping: {
                  ...f.discreteShipping,
                  enabled: e.target.checked,
                },
              }))
            }
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#374151",
              marginBottom: 6,
            }}
          >
            Title
          </label>
          <input
            style={inputStyle}
            value={form.discreteShipping?.title || ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                discreteShipping: {
                  ...f.discreteShipping,
                  title: e.target.value,
                },
              }))
            }
            placeholder="Fast Nationwide Delivery"
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#374151",
              marginBottom: 6,
            }}
          >
            Description
          </label>
          <textarea
            rows={3}
            style={{
              ...inputStyle,
              resize: "vertical",
              lineHeight: 1.6,
            }}
            value={form.discreteShipping?.description || ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                discreteShipping: {
                  ...f.discreteShipping,
                  description: e.target.value,
                },
              }))
            }
            placeholder="We deliver kitchen accessories, beauty bags and ladies bags across Pakistan with tracking where available."
          />
        </div>
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#111827",
              margin: 0,
            }}
          >
            No Asian Imports Banner
          </h3>
          <Toggle
            checked={form.asianImportsBadge?.enabled !== false}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                asianImportsBadge: {
                  ...f.asianImportsBadge,
                  enabled: e.target.checked,
                },
              }))
            }
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#374151",
              marginBottom: 6,
            }}
          >
            Title
          </label>
          <input
            style={inputStyle}
            value={form.asianImportsBadge?.title || ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                asianImportsBadge: {
                  ...f.asianImportsBadge,
                  title: e.target.value,
                },
              }))
            }
            placeholder="No Asian Imports"
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#374151",
              marginBottom: 6,
            }}
          >
            Description
          </label>
          <textarea
            rows={3}
            style={{
              ...inputStyle,
              resize: "vertical",
              lineHeight: 1.6,
            }}
            value={form.asianImportsBadge?.description || ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                asianImportsBadge: {
                  ...f.asianImportsBadge,
                  description: e.target.value,
                },
              }))
            }
            placeholder="We source kitchen, beauty and bag products from trusted suppliers. Quality-checked before shipping."
          />
        </div>
      </div>
    </div>
  );
}

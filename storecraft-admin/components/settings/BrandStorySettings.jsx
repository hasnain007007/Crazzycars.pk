"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { clearStorefrontBrowserCache } from "@/lib/clearStorefrontBrowserCache";
import { clearAdminSettingsCache } from "@/lib/adminSettingsCache";

const DEFAULT_STATS = [
  { value: "5+", label: "Years Experience" },
  { value: "10K+", label: "Happy Customers" },
  { value: "500+", label: "Products" },
];

const DEFAULT_FORM = {
  enabled: true,
  badge: "Our Story",
  heading: "Built for Pakistani Car Enthusiasts",
  subheading: "Pakistan's Premier Car Accessories Store",
  description:
    "Crazzycars.pk was founded in Sialkot to bring premium seat covers, floor mats, steering wraps, and car care products to drivers across Pakistan — with COD nationwide.",
  buttonText: "Shop Car Accessories",
  buttonLink: "/about-us",
  image1: "",
  image2: "",
  stats: DEFAULT_STATS,
};

/** Normalize ImageUploader onChange payloads or DB values to a single URL string. */
function urlFromImageField(payload) {
  if (payload == null) return "";
  if (typeof payload === "string") return String(payload).trim();
  if (Array.isArray(payload)) {
    if (!payload.length) return "";
    return urlFromImageField(payload[0]);
  }
  if (typeof payload === "object") {
    const u = payload.url ?? payload.secure_url ?? payload.secureUrl;
    return typeof u === "string" ? u.trim() : "";
  }
  return "";
}

export default function BrandStorySettings() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/settings", {
          credentials: "include",
        });
        const data = await res.json();
        if (cancelled || !res.ok || !data.success) return;
        const story = data?.settings?.brandStory || data?.data?.brandStory;

        if (story && typeof story === "object") {
          setForm((prev) => ({
            ...prev,
            ...story,
            enabled: story.enabled !== false,
            image1: urlFromImageField(story.image1 ?? prev.image1),
            image2: urlFromImageField(story.image2 ?? prev.image2),
            stats: story.stats?.length > 0 ? story.stats : DEFAULT_STATS,
          }));
        }
      } catch {
        /* ignore */
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const brandStoryPayload = {
        ...form,
        image1: urlFromImageField(form.image1),
        image2: urlFromImageField(form.image2),
      };
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ brandStory: brandStoryPayload }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Brand story saved!");
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

  const updateStat = (index, field, value) => {
    setForm((f) => ({
      ...f,
      stats: f.stats.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }));
  };

  const addStat = () => {
    if (form.stats.length >= 5) {
      toast.error("Maximum 5 stats allowed");
      return;
    }
    setForm((f) => ({
      ...f,
      stats: [...f.stats, { value: "", label: "" }],
    }));
  };

  const removeStat = (index) => {
    setForm((f) => ({
      ...f,
      stats: f.stats.filter((_, i) => i !== index),
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

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  };

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
          <p style={{ fontSize: 14, fontWeight: 600, color: "#166534", margin: 0 }}>Brand Story Settings</p>
          <p style={{ fontSize: 12, color: "#16a34a", margin: "2px 0 0" }}>Edit the Our Story section on homepage</p>
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
          {saving ? "Saving..." : "Save Story"}
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
          <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 2px" }}>Show Brand Story Section</p>
          <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Toggle visibility on homepage</p>
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
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#111827",
            margin: "0 0 16px",
            paddingBottom: 12,
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          Text Content
        </h3>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Badge Text (small text above heading)</label>
          <input
            style={inputStyle}
            placeholder="Our Story"
            value={form.badge}
            onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Main Heading</label>
          <input
            style={inputStyle}
            placeholder="Built for Pakistani Car Enthusiasts"
            value={form.heading}
            onChange={(e) => setForm((f) => ({ ...f, heading: e.target.value }))}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Subheading (optional)</label>
          <input
            style={inputStyle}
            placeholder="Pakistan's Premier Car Accessories Store"
            value={form.subheading}
            onChange={(e) => setForm((f) => ({ ...f, subheading: e.target.value }))}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Description</label>
          <textarea
            rows={4}
            style={{
              ...inputStyle,
              resize: "vertical",
              lineHeight: 1.6,
            }}
            placeholder="Crazzycars.pk was founded in Sialkot to deliver premium car accessories across Pakistan..."
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Button Text</label>
            <input
              style={inputStyle}
              placeholder="Discover Our Story"
              value={form.buttonText}
              onChange={(e) => setForm((f) => ({ ...f, buttonText: e.target.value }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Button Link</label>
            <input
              style={inputStyle}
              placeholder="/about-us"
              value={form.buttonLink}
              onChange={(e) => setForm((f) => ({ ...f, buttonLink: e.target.value }))}
            />
          </div>
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
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#111827",
            margin: "0 0 16px",
            paddingBottom: 12,
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          Images
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <label style={labelStyle}>Main Image</label>
            <ImageUploader
              value={
                form.image1
                  ? { url: urlFromImageField(form.image1), publicId: "" }
                  : { url: "", publicId: "" }
              }
              onChange={(img) =>
                setForm((f) => ({
                  ...f,
                  image1: urlFromImageField(img),
                }))
              }
              multiple={false}
              maxSizeMB={2}
              uploadFolder="settings"
            />
          </div>
          <div>
            <label style={labelStyle}>Secondary Image (optional)</label>
            <ImageUploader
              value={
                form.image2
                  ? { url: urlFromImageField(form.image2), publicId: "" }
                  : { url: "", publicId: "" }
              }
              onChange={(img) =>
                setForm((f) => ({
                  ...f,
                  image2: urlFromImageField(img),
                }))
              }
              multiple={false}
              maxSizeMB={2}
              uploadFolder="settings"
            />
          </div>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Stats / Numbers ({form.stats.length}/5)</h3>
          <button
            type="button"
            onClick={addStat}
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
            + Add Stat
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {form.stats.map((stat, index) => (
            <div
              key={index}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr auto",
                gap: 10,
                alignItems: "center",
                background: "#f9fafb",
                padding: "12px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            >
              <div>
                <label style={labelStyle}>Value</label>
                <input
                  style={inputStyle}
                  placeholder="10K+"
                  value={stat.value}
                  onChange={(e) => updateStat(index, "value", e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Label</label>
                <input
                  style={inputStyle}
                  placeholder="Happy Customers"
                  value={stat.label}
                  onChange={(e) => updateStat(index, "label", e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => removeStat(index)}
                style={{
                  marginTop: 20,
                  padding: "8px 10px",
                  background: "#fee2e2",
                  border: "none",
                  borderRadius: 6,
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

        <p style={{ fontSize: 11, color: "#9ca3af", margin: "12px 0 0" }}>Stats show as numbers/labels in the brand story section</p>
      </div>
    </div>
  );
}

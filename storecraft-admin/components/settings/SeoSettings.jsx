"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { clearStorefrontBrowserCache } from "@/lib/clearStorefrontBrowserCache";
import { clearAdminSettingsCache } from "@/lib/adminSettingsCache";

const DEFAULT_FORM = {
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  googleAnalyticsId: "",
  googleSearchConsoleId: "",
  facebookPixelId: "",
  canonicalUrl: "",
  robotsTxt: "index, follow",
};

export default function SeoSettings() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/settings", { credentials: "include" });
        const data = await res.json();
        const seo = data?.settings?.seo || data?.data?.seo || {};
        if (seo && typeof seo === "object") {
          setForm({
            ...DEFAULT_FORM,
            ...seo,
            metaTitle: seo.metaTitle || seo.defaultMetaTitle || "",
            metaDescription: seo.metaDescription || seo.defaultMetaDescription || "",
            robotsTxt: seo.robotsTxt || "index, follow",
          });
        }
      } catch {
        /* ignore */
      }
    };
    void load();
  }, []);

  const buildSeoPayload = () => {
    const metaTitle = String(form.metaTitle || "").trim();
    const metaDescription = String(form.metaDescription || "").trim();
    return {
      metaTitle,
      metaDescription,
      metaKeywords: String(form.metaKeywords || "").trim(),
      ogTitle: String(form.ogTitle || "").trim(),
      ogDescription: String(form.ogDescription || "").trim(),
      ogImage: String(form.ogImage || "").trim(),
      googleAnalyticsId: String(form.googleAnalyticsId || "").trim(),
      googleSearchConsoleId: String(form.googleSearchConsoleId || "").trim(),
      facebookPixelId: String(form.facebookPixelId || "").trim(),
      canonicalUrl: String(form.canonicalUrl || "").trim(),
      robotsTxt: String(form.robotsTxt || "index, follow").trim(),
      defaultMetaTitle: metaTitle,
      defaultMetaDescription: metaDescription,
    };
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ seo: buildSeoPayload() }),
      });
      const data = await res.json();
      if (data.success) {
        const saved = data?.settings?.seo || data?.data?.seo;
        if (saved && typeof saved === "object") {
          setForm({
            ...DEFAULT_FORM,
            ...saved,
            metaTitle: saved.metaTitle || saved.defaultMetaTitle || "",
            metaDescription: saved.metaDescription || saved.defaultMetaDescription || "",
            robotsTxt: saved.robotsTxt || "index, follow",
          });
        }
        toast.success("SEO settings saved!");
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
          <p style={{ fontSize: 14, fontWeight: 600, color: "#166534", margin: 0 }}>SEO Settings</p>
          <p style={{ fontSize: 12, color: "#16a34a", margin: "2px 0 0" }}>Optimize your store for search engines</p>
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
          {saving ? "Saving..." : "Save SEO"}
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
          Basic SEO
        </h3>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>
            Site Title
            <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400, marginLeft: 6 }}>
              (shown in browser tab and search results)
            </span>
          </label>
          <input
            style={inputStyle}
            placeholder="Crazzycars.pk | Car Accessories Pakistan"
            value={form.metaTitle}
            onChange={(e) => setForm((f) => ({ ...f, metaTitle: e.target.value }))}
          />
          <p style={{ fontSize: 11, color: form.metaTitle.length > 60 ? "#dc2626" : "#9ca3af", margin: "4px 0 0" }}>
            {form.metaTitle.length}/60 characters
            {form.metaTitle.length > 60 ? " — too long, keep under 60" : ""}
          </p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>
            Meta Description
            <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400, marginLeft: 6 }}>
              (shown in search results)
            </span>
          </label>
          <textarea
            rows={3}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
            placeholder="Buy premium car accessories online in Pakistan. COD available nationwide."
            value={form.metaDescription}
            onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))}
          />
          <p
            style={{
              fontSize: 11,
              color: form.metaDescription.length > 160 ? "#dc2626" : "#9ca3af",
              margin: "4px 0 0",
            }}
          >
            {form.metaDescription.length}/160 characters
            {form.metaDescription.length > 160 ? " — too long, keep under 160" : ""}
          </p>
        </div>

        <div style={{ marginBottom: 0 }}>
          <label style={labelStyle}>
            Keywords
            <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400, marginLeft: 6 }}>(comma separated)</span>
          </label>
          <input
            style={inputStyle}
            placeholder="car accessories pakistan, seat covers, floor mats, Crazzycars.pk"
            value={form.metaKeywords}
            onChange={(e) => setForm((f) => ({ ...f, metaKeywords: e.target.value }))}
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
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#111827",
            margin: "0 0 8px",
            paddingBottom: 12,
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          Social Media (Open Graph)
        </h3>
        <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 16px" }}>
          Controls how your site looks when shared on Facebook, WhatsApp, Twitter etc.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>OG Title</label>
          <input
            style={inputStyle}
            placeholder="Crazzycars.pk | Car Accessories Pakistan"
            value={form.ogTitle}
            onChange={(e) => setForm((f) => ({ ...f, ogTitle: e.target.value }))}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>OG Description</label>
          <textarea
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
            placeholder="Buy premium car accessories online in Pakistan. COD available nationwide."
            value={form.ogDescription}
            onChange={(e) => setForm((f) => ({ ...f, ogDescription: e.target.value }))}
          />
        </div>

        <div style={{ marginBottom: 0 }}>
          <label style={labelStyle}>
            OG Image URL
            <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400, marginLeft: 6 }}>(1200x630px recommended)</span>
          </label>
          <input
            style={inputStyle}
            placeholder="https://res.cloudinary.com/..."
            value={form.ogImage}
            onChange={(e) => setForm((f) => ({ ...f, ogImage: e.target.value }))}
          />
          {form.ogImage ? (
            <div style={{ marginTop: 8, borderRadius: 6, overflow: "hidden", maxWidth: 300, border: "1px solid #e5e7eb" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.ogImage} alt="OG Preview" style={{ width: "100%", height: "auto", display: "block" }} />
            </div>
          ) : null}
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
          Analytics and Tracking
        </h3>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>
            Google Analytics ID
            <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400, marginLeft: 6 }}>(G-XXXXXXXXXX)</span>
          </label>
          <input
            style={inputStyle}
            placeholder="G-XXXXXXXXXX"
            value={form.googleAnalyticsId}
            onChange={(e) => setForm((f) => ({ ...f, googleAnalyticsId: e.target.value }))}
          />
          <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>
            Get from Google Analytics → Admin → Data Streams → Measurement ID
          </p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>
            Google Search Console
            <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400, marginLeft: 6 }}>
              (verification meta tag content)
            </span>
          </label>
          <input
            style={inputStyle}
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={form.googleSearchConsoleId}
            onChange={(e) => setForm((f) => ({ ...f, googleSearchConsoleId: e.target.value }))}
          />
          <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>
            Paste only the content value from the verification meta tag
          </p>
        </div>

        <div style={{ marginBottom: 0 }}>
          <label style={labelStyle}>Facebook Pixel ID</label>
          <input
            style={inputStyle}
            placeholder="XXXXXXXXXXXXXXX"
            value={form.facebookPixelId}
            onChange={(e) => setForm((f) => ({ ...f, facebookPixelId: e.target.value }))}
          />
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
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
          Technical SEO
        </h3>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>
            Canonical URL
            <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400, marginLeft: 6 }}>(your main domain)</span>
          </label>
          <input
            style={inputStyle}
            placeholder={process.env.NEXT_PUBLIC_APP_URL || "https://crazzycars.pk"}
            value={form.canonicalUrl}
            onChange={(e) => setForm((f) => ({ ...f, canonicalUrl: e.target.value }))}
          />
        </div>

        <div style={{ marginBottom: 0 }}>
          <label style={labelStyle}>Robots Setting</label>
          <select
            value={form.robotsTxt}
            onChange={(e) => setForm((f) => ({ ...f, robotsTxt: e.target.value }))}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option value="index, follow">index, follow (recommended - show in search)</option>
            <option value="noindex, follow">noindex, follow</option>
            <option value="noindex, nofollow">noindex, nofollow (hide from search)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

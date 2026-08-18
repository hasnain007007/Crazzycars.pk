"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { BannerFormLivePreview } from "@/components/banners/BannerFormLivePreview";

const PLACEMENTS = [
  ["hero_slider", "Hero Slider — Main homepage carousel"],
  ["promo_strip", "Promo Strip — Full width announcement bar"],
  ["promo_card", "Promo Cards — Side by side feature cards"],
  ["category_banner", "Category Banner — Top of category pages"],
  ["product_banner", "Product Banner — Product detail pages"],
  ["sidebar_banner", "Sidebar Banner"],
  ["popup_banner", "Popup Banner — Shows as popup/modal"],
];
const SIZES = ["full_width", "half_width", "third_width", "square", "portrait", "landscape", "strip"];
const HEADING_SIZES = ["sm", "md", "lg", "xl", "2xl"];
const BUTTON_STYLES = ["primary", "secondary", "outline", "white", "dark"];
const MAX_BUTTONS = 4;
const QUICK_LINKS = [
  { label: "Home", url: "/" },
  { label: "Shop", url: "/products" },
  { label: "New Arrivals", url: "/products?sort=newest" },
  { label: "Sale", url: "/products?sale=true" },
  { label: "About", url: "/about" },
  { label: "Contact", url: "/contact" },
  { label: "Blog", url: "/posts" },
];
const DEFAULT_BACKGROUND = {
  type: "image",
  image: { url: "", publicId: "", imageName: "", altText: "" },
  mobileImage: { url: "", publicId: "" },
  color: "#111111",
  gradientFrom: "#1A1A1A",
  gradientTo: "#C41E1E",
  gradientDirection: "to right",
};
const DEFAULT_CONTENT = {
  badge: { text: "", color: "#ffffff", bgColor: "rgba(255,255,255,0.2)" },
  heading: { text: "", size: "xl", color: "#FFFFFF", fontWeight: "bold" },
  subheading: { text: "", color: "#9CA3AF" },
  description: { text: "", color: "#9CA3AF" },
  trustTextColor: "",
  buttons: [],
  contentPosition: "left",
  overlay: { enabled: false, color: "rgba(0,0,0,0.4)" },
  subheadings: [],
};

function normalizeSubheadings(data) {
  const arr = data?.content?.subheadings;
  if (Array.isArray(arr) && arr.length > 0) {
    return arr.map((s) => String(s ?? ""));
  }
  const legacy = data?.content?.subheading?.text;
  if (legacy != null && String(legacy).trim() !== "") {
    return [String(legacy).trim()];
  }
  return [];
}

/** Valid hex for <input type="color"> */
function colorInputHex(raw, fallback) {
  const s = String(raw ?? "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s;
  if (/^#[0-9A-Fa-f]{3}$/.test(s)) return s;
  return fallback;
}
const DEFAULT_IMAGE_DISPLAY = {
  objectFit: "cover",
  objectPosition: "center",
  height: "large",
  overlay: {
    enabled: false,
    color: "rgba(0,0,0,0.4)",
    opacity: 40,
  },
  hoverZoom: false,
};
const initForm = (data = {}) => ({
  name: data.name || "",
  placement: data.placement || "hero_slider",
  size: data.size || "full_width",
  // New banners must be active to appear in the storefront hero slider.
  status: data.status || "active",
  sortOrder: Number.isFinite(Number(data.sortOrder)) ? Number(data.sortOrder) : 0,
  targetUrl: data.targetUrl || "",
  openInNewTab: Boolean(data.openInNewTab),
  schedule: {
    enabled: Boolean(data.schedule?.enabled),
    startDate: data.schedule?.startDate ? new Date(data.schedule.startDate).toISOString().slice(0, 16) : "",
    endDate: data.schedule?.endDate ? new Date(data.schedule.endDate).toISOString().slice(0, 16) : "",
  },
  background: {
    type: data.background?.type || "image",
    image: {
      url: data.background?.image?.url || "",
      publicId: data.background?.image?.publicId || "",
      imageName: data.background?.image?.imageName || "",
      altText: data.background?.image?.altText || "",
    },
    mobileImage: {
      url: data.background?.mobileImage?.url || "",
      publicId: data.background?.mobileImage?.publicId || "",
    },
    color: data.background?.color || "#111111",
    gradientFrom: data.background?.gradientFrom || "#1A1A1A",
    gradientTo: data.background?.gradientTo || "#C41E1E",
    gradientDirection: data.background?.gradientDirection || "to right",
  },
  content: {
    badge: data.content?.badge || {},
    heading: data.content?.heading || {},
    subheading: data.content?.subheading || {},
    description: data.content?.description || {},
    buttons: Array.isArray(data.content?.buttons) ? data.content.buttons : [],
    contentPosition: data.content?.contentPosition || "left",
    overlay: data.content?.overlay || { enabled: false, color: "rgba(0,0,0,0.4)" },
    trustTextColor: data.content?.trustTextColor || "",
    subheadings: normalizeSubheadings(data),
  },
  imageDisplay: {
    objectFit: data.imageDisplay?.objectFit || "cover",
    objectPosition: data.imageDisplay?.objectPosition || "center",
    height: data.imageDisplay?.height || "large",
    overlay: {
      enabled: Boolean(data.imageDisplay?.overlay?.enabled),
      color: data.imageDisplay?.overlay?.color || "rgba(0,0,0,0.4)",
      opacity: Number(data.imageDisplay?.overlay?.opacity ?? 40),
    },
    hoverZoom: Boolean(data.imageDisplay?.hoverZoom),
  },
  mobileCustomHtml: data.mobileCustomHtml || "",
});
const inputClass = "w-full box-border min-h-10 rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm";
const cardClass = "mb-6 rounded-xl border border-slate-200 bg-white p-6";
const titleClass = "mb-4 border-b border-[#f3f4f6] pb-2.5 text-[15px] font-semibold text-[#111827]";
const labelClass = "mb-1.5 block text-[13px] font-medium text-[#374151]";
const pickBtn = (on) =>
  `rounded-md border px-3.5 py-1.5 text-[13px] whitespace-nowrap ${on ? "border-[#009688] bg-[#009688] text-white" : "border-[#e5e7eb] bg-white text-[#374151]"}`;

export function BannerForm({ bannerId }) {
  const router = useRouter();
  const isEdit = Boolean(bannerId);
  const [name, setName] = useState("");
  const [placement, setPlacement] = useState("hero_slider");
  const [size, setSize] = useState("full_width");
  const [background, setBackground] = useState(DEFAULT_BACKGROUND);
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [imageDisplay, setImageDisplay] = useState(DEFAULT_IMAGE_DISPLAY);
  const [targetUrl, setTargetUrl] = useState("");
  const [openInNewTab, setOpenInNewTab] = useState(false);
  const [schedule, setSchedule] = useState({ enabled: false, startDate: "", endDate: "" });
  const [sortOrder, setSortOrder] = useState(0);
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);
  const [mobileCustomHtml, setMobileCustomHtml] = useState("");
  const [showMobileCode, setShowMobileCode] = useState(false);
  const [subheadings, setSubheadings] = useState([]);
  const load = useCallback(async () => {
    if (!bannerId) return;
    const res = await fetch(`/api/banners/${bannerId}`, { credentials: "include" });
    const json = await res.json();
    if (!res.ok || !json.success) return toast.error("Not found");
    const b = initForm(json.banner || {});
    setName(b.name);
    setPlacement(b.placement);
    setSize(b.size);
    setBackground(b.background || DEFAULT_BACKGROUND);
    setContent(b.content || DEFAULT_CONTENT);
    setImageDisplay(b.imageDisplay || DEFAULT_IMAGE_DISPLAY);
    setTargetUrl(b.targetUrl);
    setOpenInNewTab(Boolean(b.openInNewTab));
    setSchedule(b.schedule);
    setSortOrder(b.sortOrder ?? 0);
    setStatus(b.status || "active");
    setMobileCustomHtml(b.mobileCustomHtml || "");
    setShowMobileCode(Boolean(b.mobileCustomHtml));
    setSubheadings(b.content?.subheadings || []);
  }, [bannerId]);

  useEffect(() => {
    if (bannerId) load();
  }, [bannerId, load]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name,
        placement,
        size,
        background,
        imageDisplay,
        content: {
          ...content,
          subheadings,
          subheading: { ...(content.subheading || {}), text: subheadings[0] || "" },
          buttons: (content.buttons || []).slice(0, MAX_BUTTONS),
        },
        targetUrl,
        openInNewTab,
        schedule: { enabled: Boolean(schedule.enabled), startDate: schedule.startDate || null, endDate: schedule.endDate || null },
        sortOrder: Number(sortOrder) || 0,
        status,
        mobileCustomHtml: mobileCustomHtml || "",
      };
      const url = isEdit ? `/api/banners/${bannerId}` : "/api/banners";
      const res = await fetch(url, { method: isEdit ? "PUT" : "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok || !json.success) return toast.error(json.error || "Save failed");
      toast.success("Saved");
      router.push("/banners");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBanner() {
    if (!isEdit || !bannerId || !window.confirm("Delete this banner?")) return;
    const res = await fetch(`/api/banners/${bannerId}`, { method: "DELETE", credentials: "include" });
    const json = await res.json();
    if (!res.ok || !json.success) return toast.error(json.error || "Delete failed");
    toast.success("Banner deleted");
    router.push("/banners");
  }

  const form = {
    name,
    placement,
    size,
    background,
    content,
    imageDisplay,
    targetUrl,
    openInNewTab,
    schedule,
    sortOrder,
    status,
    mobileCustomHtml,
    subheadings,
  };
  const setForm = (updater) => {
    const next = typeof updater === "function" ? updater(form) : updater;
    if (!next) return;
    if (Object.prototype.hasOwnProperty.call(next, "name")) setName(next.name || "");
    if (Object.prototype.hasOwnProperty.call(next, "placement")) setPlacement(next.placement || "hero_slider");
    if (Object.prototype.hasOwnProperty.call(next, "size")) setSize(next.size || "full_width");
    if (Object.prototype.hasOwnProperty.call(next, "background")) setBackground(next.background || DEFAULT_BACKGROUND);
    if (Object.prototype.hasOwnProperty.call(next, "content")) setContent(next.content || DEFAULT_CONTENT);
    if (Object.prototype.hasOwnProperty.call(next, "imageDisplay")) setImageDisplay(next.imageDisplay || DEFAULT_IMAGE_DISPLAY);
    if (Object.prototype.hasOwnProperty.call(next, "targetUrl")) setTargetUrl(next.targetUrl || "");
    if (Object.prototype.hasOwnProperty.call(next, "openInNewTab")) setOpenInNewTab(Boolean(next.openInNewTab));
    if (Object.prototype.hasOwnProperty.call(next, "schedule")) setSchedule(next.schedule || { enabled: false, startDate: "", endDate: "" });
    if (Object.prototype.hasOwnProperty.call(next, "sortOrder")) setSortOrder(Number(next.sortOrder) || 0);
    if (Object.prototype.hasOwnProperty.call(next, "status")) setStatus(next.status || "active");
    if (Object.prototype.hasOwnProperty.call(next, "mobileCustomHtml")) setMobileCustomHtml(next.mobileCustomHtml || "");
    if (Object.prototype.hasOwnProperty.call(next, "subheadings")) {
      const nextSubs = Array.isArray(next.subheadings) ? next.subheadings : [];
      setSubheadings(nextSubs);
      setContent((prev) => ({
        ...prev,
        subheadings: nextSubs,
        subheading: { ...(prev.subheading || {}), text: nextSubs[0] || "" },
      }));
    }
  };
  const handleSave = (e) => save(e || { preventDefault: () => {} });
  const handleDelete = deleteBanner;
  const isSaving = saving;
  const onDelete = isEdit;
  async function uploadBlobAsBannerImage(blob, fileName) {
    const file = new File([blob], fileName, { type: "image/webp" });
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "banners");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!data.success) throw new Error("Upload failed");
    setForm((f) => ({
      ...f,
      background: {
        ...(f.background || {}),
        image: {
          ...(f.background?.image || {}),
          url: data.url,
          publicId: data.publicId,
        },
      },
    }));
  }
  const cardStyle = {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "0",
  };
  const cardTitleStyle = {
    fontSize: "15px",
    fontWeight: 600,
    color: "#111827",
    marginBottom: "16px",
    paddingBottom: "10px",
    borderBottom: "1px solid #f3f4f6",
    margin: "0 0 16px 0",
  };
  const labelStyle = {
    display: "block",
    fontSize: "13px",
    fontWeight: 500,
    color: "#374151",
    marginBottom: "6px",
  };
  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "8px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "14px",
    color: "#111827",
    outline: "none",
    minHeight: "40px",
    background: "#ffffff",
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 2fr) 340px",
        gap: "24px",
        alignItems: "start",
        padding: "16px 20px",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Basic Information</h3>
          <label style={labelStyle}>Banner Name *</label>
          <input
            style={inputStyle}
            placeholder="e.g. Homepage Hero Banner"
            value={form.name || ""}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              background: "#f9fafb",
              padding: "14px 20px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>🖼</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Image Display Settings</p>
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Control how the banner image appears</p>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>Banner Height</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {[
                  { value: "small", label: "Small", desc: "300px", icon: "▬" },
                  { value: "medium", label: "Medium", desc: "450px", icon: "▬" },
                  { value: "large", label: "Large", desc: "600px", icon: "▬" },
                  { value: "full", label: "Full Screen", desc: "100vh", icon: "⬛" },
                  { value: "auto", label: "Auto", desc: "Natural", icon: "↕" },
                ].map((h) => (
                  <button
                    key={h.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, imageDisplay: { ...(f.imageDisplay || {}), height: h.value } }))}
                    style={{
                      padding: "10px 6px",
                      border: "2px solid",
                      borderRadius: 8,
                      cursor: "pointer",
                      textAlign: "center",
                      borderColor: (form.imageDisplay?.height || "large") === h.value ? "#009688" : "#e5e7eb",
                      background: (form.imageDisplay?.height || "large") === h.value ? "#e6f7f5" : "#fff",
                      color: (form.imageDisplay?.height || "large") === h.value ? "#009688" : "#374151",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{h.icon}</div>
                    <p style={{ fontSize: 12, fontWeight: 700, margin: "0 0 2px" }}>{h.label}</p>
                    <p style={{ fontSize: 10, color: "#9ca3af", margin: 0 }}>{h.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>Image Fit Mode</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {[
                  { value: "cover", label: "Cover", desc: "Fills area, may crop edges" },
                  { value: "contain", label: "Contain", desc: "Shows full image, no crop" },
                  { value: "fill", label: "Fill", desc: "Stretches to fill (may distort)" },
                  { value: "none", label: "Original", desc: "Natural size — use with Auto height" },
                ].map((fit) => (
                  <button
                    key={fit.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, imageDisplay: { ...(f.imageDisplay || {}), objectFit: fit.value } }))}
                    style={{
                      padding: "10px",
                      border: "2px solid",
                      borderRadius: 10,
                      cursor: "pointer",
                      textAlign: "center",
                      borderColor: (form.imageDisplay?.objectFit || "cover") === fit.value ? "#009688" : "#e5e7eb",
                      background: (form.imageDisplay?.objectFit || "cover") === fit.value ? "#e6f7f5" : "#fff",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ width: "100%", height: 50, borderRadius: 4, background: "linear-gradient(135deg, #e6f7f5, #b2dfdb)", border: "1px solid #e5e7eb" }} />
                    <p style={{ fontSize: 12, fontWeight: 700, color: (form.imageDisplay?.objectFit || "cover") === fit.value ? "#009688" : "#374151", margin: "8px 0 2px" }}>{fit.label}</p>
                    <p style={{ fontSize: 10, color: "#9ca3af", margin: 0, lineHeight: 1.4 }}>{fit.desc}</p>
                  </button>
                ))}
              </div>
            </div>


            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Dark Overlay</label>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>Add a dark overlay to make text readable</p>
                </div>
                <label style={{ position: "relative", display: "inline-block", width: 44, height: 24, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.imageDisplay?.overlay?.enabled || false}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        imageDisplay: {
                          ...(f.imageDisplay || {}),
                          overlay: {
                            ...(f.imageDisplay?.overlay || {}),
                            enabled: e.target.checked,
                            color: f.imageDisplay?.overlay?.color || "rgba(0,0,0,0.4)",
                            opacity: f.imageDisplay?.overlay?.opacity || 40,
                          },
                        },
                      }))
                    }
                    style={{ display: "none" }}
                  />
                  <span style={{ position: "absolute", inset: 0, background: form.imageDisplay?.overlay?.enabled ? "#009688" : "#d1d5db", borderRadius: 99 }} />
                  <span style={{ position: "absolute", top: 2, left: form.imageDisplay?.overlay?.enabled ? 22 : 2, width: 20, height: 20, background: "#fff", borderRadius: "50%", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                </label>
              </div>
              {form.imageDisplay?.overlay?.enabled ? (
                <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 14 }}>
                  <label style={{ fontSize: 12, color: "#374151", fontWeight: 500, display: "block", marginBottom: 8 }}>
                    Overlay Opacity: {form.imageDisplay?.overlay?.opacity || 40}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={form.imageDisplay?.overlay?.opacity || 40}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        imageDisplay: {
                          ...(f.imageDisplay || {}),
                          overlay: {
                            ...(f.imageDisplay?.overlay || {}),
                            opacity: parseInt(e.target.value, 10),
                          },
                        },
                      }))
                    }
                    style={{ width: "100%", accentColor: "#009688" }}
                  />
                </div>
              ) : null}
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.imageDisplay?.hoverZoom || false}
                  onChange={(e) => setForm((f) => ({ ...f, imageDisplay: { ...(f.imageDisplay || {}), hoverZoom: e.target.checked } }))}
                  style={{ accentColor: "#009688" }}
                />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>Hover Zoom Effect</p>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>Subtle zoom when customer hovers over banner</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Placement & Size</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Placement</label>
              <select
                style={inputStyle}
                value={form.placement || "hero_slider"}
                onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value }))}
              >
                <option value="hero_slider">Hero Slider (Homepage)</option>
                <option value="promo_strip">Promo Strip</option>
                <option value="promo_card">Promo Card</option>
                <option value="category_banner">Category Banner</option>
                <option value="popup_banner">Popup Banner</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Size</label>
              <select
                style={inputStyle}
                value={form.size || "full_width"}
                onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
              >
                <option value="full_width">Full Width</option>
                <option value="half_width">Half Width</option>
                <option value="third_width">Third Width</option>
                <option value="landscape">Landscape 16:9</option>
                <option value="strip">Strip</option>
              </select>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Background</h3>
          <label style={labelStyle}>Type</label>
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px", width: "100%", flexWrap: "wrap" }}>
            {["image", "color", "gradient"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((f) => ({ ...f, background: { ...(f.background || {}), type: t } }))}
                style={{
                  flex: "1 1 auto",
                  padding: "6px 8px",
                  borderRadius: "8px",
                  border: "1px solid",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 500,
                  borderColor: (form.background?.type || "image") === t ? "#009688" : "#e5e7eb",
                  background: (form.background?.type || "image") === t ? "#009688" : "#fff",
                  color: (form.background?.type || "image") === t ? "#fff" : "#374151",
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {(form.background?.type === "image" || !form.background?.type) && (
            <div>
              <label style={labelStyle}>Banner Image</label>
              <ImageUploader
                value={form.background?.image || { url: "", publicId: "" }}
                onChange={(img) => setForm((f) => ({ ...f, background: { ...(f.background || {}), type: "image", image: img || {} } }))}
                multiple={false}
                maxSizeMB={8}
                maxImageWidth={2560}
                webpQuality={0.95}
                preserveOriginal
                uploadFolder="banners"
              />
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "8px 0 0" }}>
                Upload PNG/JPEG at <strong>1920×768 or wider</strong> (up to 2560px). Original file is kept — no
                compression. ChatGPT/AI exports at ~1024px will look soft on desktop.
              </p>
              {form.background?.image?.url ? (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "16px",
                    background: "#f9fafb",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "12px" }}>Image Settings</p>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={labelStyle}>Image Name</label>
                    <input
                      style={inputStyle}
                      placeholder="e.g. homepage-hero-car-accessories-2026"
                      value={form.background?.image?.imageName || ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          background: { ...(f.background || {}), image: { ...(f.background?.image || {}), imageName: e.target.value } },
                        }))
                      }
                    />
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={labelStyle}>
                      Alt Text
                      <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: "11px", marginLeft: "4px" }}>(for SEO & accessibility)</span>
                    </label>
                    <input
                      style={inputStyle}
                      placeholder="e.g. Premium car accessories collection banner"
                      value={form.background?.image?.altText || ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          background: { ...(f.background || {}), image: { ...(f.background?.image || {}), altText: e.target.value } },
                        }))
                      }
                    />
                    <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>Google recommends 5-15 words describing the image</p>
                  </div>
                  <div>
                    <label style={labelStyle}>Quick Transforms</label>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!form.background?.image?.url) return;
                          const t = toast.loading("Flipping...");
                          try {
                            const img = new Image();
                            img.crossOrigin = "anonymous";
                            await new Promise((res, rej) => {
                              img.onload = res;
                              img.onerror = rej;
                              img.src = form.background.image.url;
                            });
                            const canvas = document.createElement("canvas");
                            canvas.width = img.naturalWidth;
                            canvas.height = img.naturalHeight;
                            const ctx = canvas.getContext("2d");
                            ctx.translate(canvas.width, 0);
                            ctx.scale(-1, 1);
                            ctx.drawImage(img, 0, 0);
                            canvas.toBlob(async (blob) => {
                              if (!blob) throw new Error("No blob");
                              await uploadBlobAsBannerImage(blob, "banner-flipped.webp");
                              toast.success("Flipped!", { id: t });
                            }, "image/webp", 0.9);
                          } catch {
                            toast.error("Flip failed", { id: t });
                          }
                        }}
                        style={{ padding: "6px 14px", fontSize: "12px", borderRadius: "6px", border: "1px solid #e5e7eb", background: "#fff", color: "#374151", cursor: "pointer" }}
                      >
                        ↔ Flip H
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!form.background?.image?.url) return;
                          const t = toast.loading("Rotating...");
                          try {
                            const img = new Image();
                            img.crossOrigin = "anonymous";
                            await new Promise((res, rej) => {
                              img.onload = res;
                              img.onerror = rej;
                              img.src = form.background.image.url;
                            });
                            const canvas = document.createElement("canvas");
                            canvas.width = img.naturalHeight;
                            canvas.height = img.naturalWidth;
                            const ctx = canvas.getContext("2d");
                            ctx.translate(canvas.width / 2, canvas.height / 2);
                            ctx.rotate(Math.PI / 2);
                            ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
                            canvas.toBlob(async (blob) => {
                              if (!blob) throw new Error("No blob");
                              await uploadBlobAsBannerImage(blob, "banner-rotated.webp");
                              toast.success("Rotated!", { id: t });
                            }, "image/webp", 0.9);
                          } catch {
                            toast.error("Rotate failed", { id: t });
                          }
                        }}
                        style={{ padding: "6px 14px", fontSize: "12px", borderRadius: "6px", border: "1px solid #e5e7eb", background: "#fff", color: "#374151", cursor: "pointer" }}
                      >
                        ↻ Rotate 90°
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!form.background?.image?.url) return;
                          const text = window.prompt("Watermark text:", process.env.NEXT_PUBLIC_APP_NAME || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`);
                          if (!text) return;
                          const t = toast.loading("Adding watermark...");
                          try {
                            const img = new Image();
                            img.crossOrigin = "anonymous";
                            await new Promise((res, rej) => {
                              img.onload = res;
                              img.onerror = rej;
                              img.src = form.background.image.url;
                            });
                            const canvas = document.createElement("canvas");
                            canvas.width = img.naturalWidth;
                            canvas.height = img.naturalHeight;
                            const ctx = canvas.getContext("2d");
                            ctx.drawImage(img, 0, 0);
                            const fontSize = Math.max(20, Math.floor(canvas.width * 0.04));
                            ctx.font = `bold ${fontSize}px Arial`;
                            const tw = ctx.measureText(text).width;
                            const pad = canvas.width * 0.02;
                            ctx.strokeStyle = "rgba(0,0,0,0.8)";
                            ctx.lineWidth = fontSize * 0.1;
                            ctx.strokeText(text, canvas.width - tw - pad, canvas.height - pad);
                            ctx.fillStyle = "rgba(255,255,255,0.9)";
                            ctx.fillText(text, canvas.width - tw - pad, canvas.height - pad);
                            canvas.toBlob(async (blob) => {
                              if (!blob) throw new Error("No blob");
                              await uploadBlobAsBannerImage(blob, "banner-wm.webp");
                              toast.success("Watermark added!", { id: t });
                            }, "image/webp", 0.9);
                          } catch {
                            toast.error("Failed", { id: t });
                          }
                        }}
                        style={{ padding: "6px 14px", fontSize: "12px", borderRadius: "6px", border: "1px solid #e5e7eb", background: "#fff", color: "#374151", cursor: "pointer" }}
                      >
                        © Watermark
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const url = form.background?.image?.url;
                          if (!url || !url.includes("cloudinary")) return;
                          const brightUrl = url.replace("/upload/", "/upload/e_brightness:20/");
                          setForm((f) => ({
                            ...f,
                            background: { ...(f.background || {}), image: { ...(f.background?.image || {}), url: brightUrl } },
                          }));
                          toast.success("Brightness +20 applied");
                        }}
                        style={{ padding: "6px 14px", fontSize: "12px", borderRadius: "6px", border: "1px solid #e5e7eb", background: "#fff", color: "#374151", cursor: "pointer" }}
                      >
                        ☀️ Brighten
                      </button>
                    </div>
                    <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "6px" }}>Changes are applied and re-uploaded automatically</p>
                  </div>
                  <div style={{ marginTop: "12px", padding: "8px 12px", background: "#e6f7f5", borderRadius: "6px", fontSize: "12px", color: "#374151" }}>
                    📐 Image uploaded to Cloudinary ✓
                  </div>
                </div>
              ) : null}

              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  overflow: "hidden",
                  marginTop: 16,
                }}
              >
                <div
                  style={{
                    background: "#f9fafb",
                    padding: "14px 20px",
                    borderBottom: "1px solid #e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 18 }}>📱</span>
                  <div>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#111827",
                        margin: 0,
                      }}
                    >
                      Mobile Image (optional)
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        margin: 0,
                      }}
                    >
                      Separate image for mobile screens. If not set, desktop image will be used.
                    </p>
                  </div>
                </div>
                <div style={{ padding: 16 }}>
                  <ImageUploader
                    value={form.background?.mobileImage || { url: "", publicId: "" }}
                    onChange={(img) =>
                      setForm((f) => ({
                        ...f,
                        background: {
                          ...(f.background || {}),
                          mobileImage: img
                            ? { url: img.url || "", publicId: img.publicId || "" }
                            : { url: "", publicId: "" },
                        },
                      }))
                    }
                    multiple={false}
                    maxSizeMB={6}
                    maxImageWidth={1600}
                    webpQuality={0.95}
                    preserveOriginal
                    uploadFolder="banners"
                  />
                  <p
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      margin: "8px 0 0",
                    }}
                  >
                    Recommended: 1080×1350+ portrait. Original file is kept without recompression.
                  </p>
                </div>
              </div>
            </div>
          )}

          {form.background?.type === "color" && (
            <div>
              <label style={labelStyle}>Color</label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", width: "100%" }}>
                <input
                  type="color"
                  value={form.background?.color || "#111111"}
                  onChange={(e) => setForm((f) => ({ ...f, background: { ...(f.background || {}), color: e.target.value } }))}
                  style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 6, cursor: "pointer", border: "1px solid #e5e7eb", padding: 2 }}
                />
                <input
                  type="text"
                  style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                  value={form.background?.color || "#111111"}
                  onChange={(e) => setForm((f) => ({ ...f, background: { ...(f.background || {}), color: e.target.value } }))}
                  placeholder="#111111"
                />
              </div>
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Content</h3>
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Heading Text</label>
            <input
              style={inputStyle}
              value={form.content?.heading?.text || ""}
              onChange={(e) => setForm((f) => ({ ...f, content: { ...(f.content || {}), heading: { ...(f.content?.heading || {}), text: e.target.value } } }))}
            />
          </div>

          {/* Heading Color */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Heading Color</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <input
                type="color"
                value={colorInputHex(form.content?.heading?.color, "#111111")}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    content: {
                      ...(f.content || {}),
                      heading: { ...(f.content?.heading || {}), color: e.target.value },
                    },
                  }))
                }
                style={{
                  width: 48,
                  height: 36,
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  cursor: "pointer",
                  padding: 2,
                }}
              />
              <input
                type="text"
                value={form.content?.heading?.color || "#111111"}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    content: {
                      ...(f.content || {}),
                      heading: { ...(f.content?.heading || {}), color: e.target.value },
                    },
                  }))
                }
                style={{ ...inputStyle, width: 120, fontFamily: "monospace" }}
                placeholder="#111111"
              />
              <div style={{ display: "flex", gap: 6 }}>
                {["#FFFFFF", "#111111", "#C41E1E", "#9CA3AF"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        content: {
                          ...(f.content || {}),
                          heading: { ...(f.content?.heading || {}), color },
                        },
                      }))
                    }
                    style={{
                      width: 24,
                      height: 24,
                      background: color,
                      border:
                        (form.content?.heading?.color || "#111111") === color ? "2px solid #009688" : "1px solid #e5e7eb",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Subheadings</label>
              <button
                type="button"
                onClick={() => {
                  const newSubs = [...(form.subheadings || []), ""];
                  setForm((f) => ({ ...f, subheadings: newSubs }));
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 10px",
                  background: "#EEF2FF",
                  border: "1px solid #C7D2FE",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#4F46E5",
                  cursor: "pointer",
                }}
              >
                + Add Line
              </button>
            </div>

            {(form.subheadings || []).map((sub, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 8,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#E5E7EB",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#6B7280",
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </div>
                <input
                  type="text"
                  value={sub}
                  onChange={(e) => {
                    const newSubs = [...(form.subheadings || [])];
                    newSubs[index] = e.target.value;
                    setForm((f) => ({ ...f, subheadings: newSubs }));
                  }}
                  placeholder={`Subheading line ${index + 1}...`}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    border: "1px solid #E5E7EB",
                    borderRadius: 6,
                    fontSize: 13,
                    color: "#111827",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const newSubs = (form.subheadings || []).filter((_, i) => i !== index);
                    setForm((f) => ({ ...f, subheadings: newSubs }));
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    background: "#FEE2E2",
                    border: "1px solid #FCA5A5",
                    borderRadius: 6,
                    color: "#DC2626",
                    fontSize: 14,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  aria-label={`Remove subheading line ${index + 1}`}
                >
                  ×
                </button>
              </div>
            ))}

            {(form.subheadings || []).length === 0 ? (
              <p style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic", margin: 0 }}>
                No subheadings added yet. Click &quot;+ Add Line&quot; to add one.
              </p>
            ) : null}
          </div>
          {/* Subheading color → content.subheading.color only (storefront falls back to description.color for legacy data) */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Subheading Color</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <input
                type="color"
                value={colorInputHex(
                  form.content?.subheading?.color || form.content?.description?.color,
                  "#555555"
                )}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({
                    ...f,
                    content: {
                      ...(f.content || {}),
                      subheading: { ...(f.content?.subheading || {}), color: v },
                    },
                  }));
                }}
                style={{
                  width: 48,
                  height: 36,
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  cursor: "pointer",
                  padding: 2,
                }}
              />
              <input
                type="text"
                value={
                  form.content?.subheading?.color ||
                  form.content?.description?.color ||
                  "#555555"
                }
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({
                    ...f,
                    content: {
                      ...(f.content || {}),
                      subheading: { ...(f.content?.subheading || {}), color: v },
                    },
                  }));
                }}
                style={{ ...inputStyle, width: 120, fontFamily: "monospace" }}
                placeholder="#555555"
              />
              <div style={{ display: "flex", gap: 6 }}>
                {["#FFFFFF", "#111111", "#C41E1E", "#9CA3AF"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        content: {
                          ...(f.content || {}),
                          subheading: { ...(f.content?.subheading || {}), color },
                        },
                      }))
                    }
                    style={{
                      width: 24,
                      height: 24,
                      background: color,
                      border:
                        (form.content?.subheading?.color ||
                          form.content?.description?.color ||
                          "#555555") === color
                          ? "2px solid #009688"
                          : "1px solid #e5e7eb",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Primary button colors (button 1 — storefront hero CTA) */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Button Colors</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 6px" }}>Button Background</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="color"
                    value={colorInputHex(form.content?.buttons?.[0]?.bgColor, "#111111")}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => {
                        const buttons = [...(f.content?.buttons || [{}])];
                        if (!buttons[0]) buttons[0] = {};
                        buttons[0] = { ...buttons[0], bgColor: v };
                        return { ...f, content: { ...(f.content || {}), buttons } };
                      });
                    }}
                    style={{
                      width: 40,
                      height: 32,
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      cursor: "pointer",
                      padding: 2,
                    }}
                  />
                  <input
                    type="text"
                    value={form.content?.buttons?.[0]?.bgColor || "#111111"}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => {
                        const buttons = [...(f.content?.buttons || [{}])];
                        if (!buttons[0]) buttons[0] = {};
                        buttons[0] = { ...buttons[0], bgColor: v };
                        return { ...f, content: { ...(f.content || {}), buttons } };
                      });
                    }}
                    style={{ ...inputStyle, fontFamily: "monospace", flex: 1 }}
                    placeholder="#111111"
                  />
                </div>
              </div>
              <div>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 6px" }}>Button Text Color</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="color"
                    value={colorInputHex(
                      form.content?.buttons?.[0]?.textColor || form.content?.buttons?.[0]?.color,
                      "#FFFFFF"
                    )}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => {
                        const buttons = [...(f.content?.buttons || [{}])];
                        if (!buttons[0]) buttons[0] = {};
                        buttons[0] = { ...buttons[0], textColor: v, color: v };
                        return { ...f, content: { ...(f.content || {}), buttons } };
                      });
                    }}
                    style={{
                      width: 40,
                      height: 32,
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      cursor: "pointer",
                      padding: 2,
                    }}
                  />
                  <input
                    type="text"
                    value={
                      form.content?.buttons?.[0]?.textColor ||
                      form.content?.buttons?.[0]?.color ||
                      "#FFFFFF"
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => {
                        const buttons = [...(f.content?.buttons || [{}])];
                        if (!buttons[0]) buttons[0] = {};
                        buttons[0] = { ...buttons[0], textColor: v, color: v };
                        return { ...f, content: { ...(f.content || {}), buttons } };
                      });
                    }}
                    style={{ ...inputStyle, fontFamily: "monospace", flex: 1 }}
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Trust lines (homepage hero) */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Trust lines text color (optional)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <input
                type="color"
                value={colorInputHex(form.content?.trustTextColor, "#333333")}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    content: { ...(f.content || {}), trustTextColor: e.target.value },
                  }))
                }
                style={{
                  width: 48,
                  height: 36,
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  cursor: "pointer",
                  padding: 2,
                }}
              />
              <input
                type="text"
                value={form.content?.trustTextColor || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    content: { ...(f.content || {}), trustTextColor: e.target.value },
                  }))
                }
                style={{ ...inputStyle, width: 140, fontFamily: "monospace" }}
                placeholder="#333333 (empty = default)"
              />
            </div>
          </div>

          {/* Live text preview */}
          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 16,
              marginTop: 8,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                margin: "0 0 10px",
              }}
            >
              Text Preview
            </p>
            <div style={{ background: "#ffffff", padding: 16, borderRadius: 6, border: "1px solid #e5e7eb" }}>
              <h3
                style={{
                  fontFamily: "Cinzel, serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: form.content?.heading?.color || "#111111",
                  margin: "0 0 8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {form.content?.heading?.text || (
                  <span style={{ color: "#9CA3AF", fontWeight: 500 }}>Your headline here</span>
                )}
              </h3>
              {(form.subheadings || []).filter((s) => String(s).trim()).length > 0 ? (
                (form.subheadings || [])
                  .filter((s) => String(s).trim())
                  .map((sub, i) => (
                    <p
                      key={i}
                      style={{
                        fontSize: 13,
                        color:
                          form.content?.subheading?.color ||
                          form.content?.description?.color ||
                          "#555555",
                        margin: "0 0 4px",
                      }}
                    >
                      {sub}
                    </p>
                  ))
              ) : (
                <p
                  style={{
                    fontSize: 13,
                    color:
                      form.content?.subheading?.color ||
                      form.content?.description?.color ||
                      "#555555",
                    margin: "0 0 12px",
                  }}
                >
                  Your subheading here
                </p>
              )}
              {form.content?.buttons?.[0]?.text ? (
                <button
                  type="button"
                  style={{
                    padding: "8px 20px",
                    background: form.content?.buttons?.[0]?.bgColor || "#111111",
                    color:
                      form.content?.buttons?.[0]?.textColor ||
                      form.content?.buttons?.[0]?.color ||
                      "#FFFFFF",
                    border: "none",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    borderRadius: 2,
                    cursor: "default",
                  }}
                >
                  {form.content.buttons[0].text}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Buttons</h3>
          {(form.content?.buttons || []).map((btn, i) => (
            <div key={i} style={{ background: "#f9fafb", borderRadius: "10px", padding: "16px", marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#009688", margin: 0 }}>Button {i + 1}</p>
                <button
                  type="button"
                  onClick={() => {
                    const b = (form.content?.buttons || []).filter((_, idx) => idx !== i);
                    setForm((f) => ({ ...f, content: { ...(f.content || {}), buttons: b } }));
                  }}
                  style={{ color: "#ef4444", fontSize: "12px", background: "none", border: "none", cursor: "pointer" }}
                >
                  Remove
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={labelStyle}>Text</label>
                  <input
                    style={inputStyle}
                    placeholder="Button label"
                    value={btn.text || ""}
                    onChange={(e) => {
                      const b = [...(form.content?.buttons || [])];
                      b[i] = { ...b[i], text: e.target.value };
                      setForm((f) => ({ ...f, content: { ...(f.content || {}), buttons: b } }));
                    }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>URL</label>
                  <input
                    style={inputStyle}
                    placeholder="/categories or /#shop-by-car"
                    value={btn.url || ""}
                    onChange={(e) => {
                      const b = [...(form.content?.buttons || [])];
                      b[i] = { ...b[i], url: e.target.value };
                      setForm((f) => ({ ...f, content: { ...(f.content || {}), buttons: b } }));
                    }}
                    onBlur={(e) => {
                      let url = String(e.target.value || "").trim();
                      if (!url) return;
                      if (!/^https?:\/\//i.test(url) && !url.startsWith("/") && /^[a-z0-9.-]+\.[a-z]{2,}([/:?]|$)/i.test(url)) {
                        url = `https://${url}`;
                      }
                      try {
                        if (/^https?:\/\//i.test(url)) {
                          const parsed = new URL(url);
                          if (/(^|\.)crazzycars\.pk$/i.test(parsed.hostname)) {
                            url = `${parsed.pathname || "/"}${parsed.search || ""}${parsed.hash || ""}` || "/";
                          }
                        }
                      } catch {
                        /* keep */
                      }
                      const b = [...(form.content?.buttons || [])];
                      b[i] = { ...b[i], url };
                      setForm((f) => ({ ...f, content: { ...(f.content || {}), buttons: b } }));
                    }}
                  />
                  <div style={{ marginTop: "6px" }}>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {[
                        { url: "/", label: "Home" },
                        { url: "/shop", label: "Shop" },
                        { url: "/categories", label: "Categories" },
                        { url: "/#shop-by-car", label: "Shop by Car" },
                        { url: "/products?sort=newest", label: "New" },
                        { url: "/products?sale=true", label: "Sale" },
                        { url: "/about", label: "About" },
                        { url: "/contact", label: "Contact" },
                        { url: "/posts", label: "Blog" },
                      ].map((item, j) => (
                        <button
                          key={`${i}-${j}`}
                          type="button"
                          onClick={() => {
                            const b = [...(form.content?.buttons || [])];
                            b[i] = { ...b[i], url: item.url };
                            setForm((f) => ({ ...f, content: { ...(f.content || {}), buttons: b } }));
                          }}
                          style={{ padding: "2px 8px", fontSize: "10px", borderRadius: "99px", border: "1px solid #e5e7eb", background: "#fff", color: "#374151", cursor: "pointer" }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <label style={labelStyle}>Style</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {BUTTON_STYLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      const b = [...(form.content?.buttons || [])];
                      b[i] = { ...b[i], style: s };
                      setForm((f) => ({ ...f, content: { ...(f.content || {}), buttons: b } }));
                    }}
                    style={{
                      flex: "1 1 auto",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: btn.style === s ? "#009688" : "#e5e7eb",
                      background: btn.style === s ? "#009688" : "#fff",
                      color: btn.style === s ? "#fff" : "#374151",
                    }}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {(form.content?.buttons || []).length < MAX_BUTTONS ? (
            <button
              type="button"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  content: { ...(f.content || {}), buttons: [...(f.content?.buttons || []), { text: "", url: "", style: "outline" }] },
                }))
              }
              style={{ width: "100%", padding: "10px", border: "2px dashed #009688", borderRadius: "8px", background: "#e6f7f5", color: "#009688", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}
            >
              + Add Button ({(form.content?.buttons || []).length}/{MAX_BUTTONS})
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ position: "sticky", top: "80px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Publish</h3>
          <label style={labelStyle}>Status</label>
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", width: "100%", flexWrap: "wrap" }}>
            {["active", "inactive"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm((f) => ({ ...f, status: s }))}
                style={{
                  flex: "1 1 auto",
                  padding: "6px 8px",
                  borderRadius: "8px",
                  border: "1px solid",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 500,
                  borderColor: (form.status || "inactive") === s ? "#009688" : "#e5e7eb",
                  background: (form.status || "inactive") === s ? "#009688" : "#fff",
                  color: (form.status || "inactive") === s ? "#fff" : "#374151",
                }}
              >
                {s === "active" ? "✓ Active" : "○ Inactive"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              width: "100%",
              padding: "12px",
              background: isSaving ? "#9ca3af" : "#009688",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: 600,
              cursor: isSaving ? "default" : "pointer",
            }}
          >
            {isSaving ? "Saving..." : "💾 Save Banner"}
          </button>
          {onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "8px",
                background: "none",
                color: "#ef4444",
                border: "1px solid #ef4444",
                borderRadius: "8px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Delete Banner
            </button>
          ) : null}
        </div>

        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Banner Preview</h3>
          <BannerFormLivePreview form={form} />

          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Custom Mobile HTML/CSS</label>
              <button
                type="button"
                onClick={() => setShowMobileCode((p) => !p)}
                style={{
                  fontSize: 11,
                  color: "#6366F1",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {showMobileCode ? "− Hide Code" : "+ Add Custom Code"}
              </button>
            </div>
            {showMobileCode ? (
              <div>
                <p style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 8 }}>
                  Add custom HTML/CSS to override mobile banner styles
                </p>
                <textarea
                  value={mobileCustomHtml || ""}
                  onChange={(e) => setMobileCustomHtml(e.target.value)}
                  placeholder={`<style>
.mobile-banner {
  height: 300px;
}
.mobile-banner h2 {
  font-size: 24px;
}
</style>`}
                  rows={8}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #E5E7EB",
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: "monospace",
                    resize: "vertical",
                    boxSizing: "border-box",
                    background: "#1E1E1E",
                    color: "#D4D4D4",
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

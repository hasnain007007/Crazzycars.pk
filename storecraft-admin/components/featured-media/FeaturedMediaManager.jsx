"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ImageUploader } from "@/components/ui/ImageUploader";
import VideoUploader from "@/components/ui/VideoUploader";

const emptyForm = (sortOrder = 0) => ({
  title: "",
  type: "image",
  mediaUrl: "",
  thumbnailUrl: "",
  link: "",
  linkType: "none",
  caption: "",
  enabled: true,
  sortOrder,
});

function urlFromUploader(payload) {
  if (payload == null) return "";
  if (typeof payload === "string") return payload.trim();
  if (Array.isArray(payload)) return urlFromUploader(payload[0]);
  if (typeof payload === "object") {
    const u = payload.url ?? payload.secure_url ?? payload.secureUrl;
    return typeof u === "string" ? u.trim() : "";
  }
  return "";
}

export default function FeaturedMediaManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => emptyForm(0));

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/featured-media", { credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load");
      setItems(data.items || data.data || []);
    } catch {
      toast.error("Failed to load media");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const resetForm = useCallback((sortOrder = 0) => {
    setForm(emptyForm(sortOrder));
    setEditId(null);
    setShowForm(false);
  }, []);

  const handleEdit = (item) => {
    const link = item.link || "";
    setForm({
      title: item.title || "",
      type: item.type === "video" ? "video" : "image",
      mediaUrl: item.mediaUrl || "",
      thumbnailUrl: item.thumbnailUrl || item.mediaUrl || "",
      link,
      linkType: link.trim() ? "url" : "none",
      caption: item.caption || "",
      enabled: item.enabled !== false,
      sortOrder: Number(item.sortOrder) || 0,
    });
    setEditId(String(item._id));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async () => {
    if (!form.mediaUrl?.trim()) {
      toast.error("Please upload an image or video");
      return;
    }
    setSaving(true);
    try {
      const url = editId ? `/api/featured-media/${editId}` : "/api/featured-media";
      const method = editId ? "PUT" : "POST";
      const linkTrim = form.link.trim();
      const payload = {
        title: form.title,
        type: form.type,
        mediaUrl: form.mediaUrl.trim(),
        thumbnailUrl: (form.thumbnailUrl || form.mediaUrl).trim(),
        link: linkTrim,
        linkType: linkTrim ? "url" : "none",
        caption: form.caption,
        enabled: form.enabled,
        sortOrder: form.sortOrder,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editId ? "Media updated!" : "Media added!");
        resetForm(items.length);
        void fetchItems();
      } else {
        toast.error(data.error || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this media item?")) return;
    try {
      const res = await fetch(`/api/featured-media/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Delete failed");
      toast.success("Deleted!");
      void fetchItems();
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleToggle = async (id, enabled) => {
    try {
      const res = await fetch(`/api/featured-media/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled: !enabled }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Update failed");
      void fetchItems();
    } catch {
      toast.error("Update failed");
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

  const videoList = form.mediaUrl
    ? [
        {
          url: form.mediaUrl,
          originalUrl: form.mediaUrl,
          publicId: "",
          thumbnail: form.thumbnailUrl || form.mediaUrl,
          format: "mp4",
          duration: 0,
          size: 0,
          width: 0,
          height: 0,
          title: form.title || "video",
          isPrimary: true,
          resourceType: "video",
        },
      ]
    : [];

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
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>Featured Media</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Add promotional images and videos with product/category links</p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm(items.length);
            setShowForm(true);
          }}
          style={{
            padding: "10px 20px",
            background: "#009688",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Add Media
        </button>
      </div>

      {showForm ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 20px" }}>
            {editId ? "Edit Media" : "Add New Media"}
          </h2>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Media Type</label>
            <div style={{ display: "flex", gap: 12 }}>
              {["image", "video"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t, mediaUrl: "", thumbnailUrl: "" }))}
                  style={{
                    padding: "10px 24px",
                    border: "2px solid",
                    borderColor: form.type === t ? "#009688" : "#e5e7eb",
                    borderRadius: 8,
                    background: form.type === t ? "#e6f7f5" : "#fff",
                    color: form.type === t ? "#009688" : "#374151",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {t === "image" ? "🖼 Image" : "🎬 Video"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>{form.type === "image" ? "Upload Image" : "Upload Video"}</label>
            {form.type === "image" ? (
              <ImageUploader
                value={form.mediaUrl ? { url: form.mediaUrl, publicId: "" } : { url: "", publicId: "" }}
                onChange={(img) => {
                  const url = urlFromUploader(img);
                  setForm((f) => ({ ...f, mediaUrl: url, thumbnailUrl: url }));
                }}
                multiple={false}
                maxSizeMB={2}
                uploadFolder="featured-media"
              />
            ) : (
              <VideoUploader
                videos={videoList}
                maxVideos={1}
                onChange={(arr) => {
                  const v = arr[0];
                  setForm((f) => ({
                    ...f,
                    mediaUrl: v?.url || "",
                    thumbnailUrl: v?.thumbnail || v?.url || "",
                  }));
                }}
              />
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Title (optional)</label>
            <input
              style={inputStyle}
              placeholder="New Arrivals"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Caption (optional)</label>
            <input
              style={inputStyle}
              placeholder="Shop Car Accessories"
              value={form.caption}
              onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
            />
          </div>

          {/* Link */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Link (when clicked) - optional</label>
            <input
              style={inputStyle}
              placeholder={`${process.env.NEXT_PUBLIC_STORE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://crazzycars.pk"}/seat-covers OR /products OR /categories/seat-covers`}
              value={form.link}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  link: e.target.value,
                  linkType: e.target.value.trim() ? "url" : "none",
                }))
              }
            />
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>
              Paste any link. Examples: /products | /categories/seat-covers | /shop | https://crazzycars.pk
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Display Order</label>
            <input
              type="number"
              style={{ ...inputStyle, width: 100 }}
              min={0}
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <input
              type="checkbox"
              id="enabled"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              style={{ accentColor: "#009688" }}
            />
            <label htmlFor="enabled" style={{ fontSize: 14, color: "#374151", cursor: "pointer" }}>
              Show on storefront
            </label>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              style={{
                padding: "10px 28px",
                background: saving ? "#9ca3af" : "#009688",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: saving ? "default" : "pointer",
              }}
            >
              {saving ? "Saving..." : editId ? "Update Media" : "Add Media"}
            </button>
            <button
              type="button"
              onClick={() => resetForm(items.length)}
              style={{
                padding: "10px 20px",
                background: "#f3f4f6",
                color: "#374151",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#888888" }}>Loading...</div>
      ) : items.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 24px",
            background: "#f9fafb",
            borderRadius: 12,
            border: "2px dashed #e5e7eb",
          }}
        >
          <p style={{ fontSize: 16, color: "#6b7280", margin: "0 0 16px" }}>No media added yet</p>
          <button
            type="button"
            onClick={() => {
              resetForm(0);
              setShowForm(true);
            }}
            style={{
              padding: "10px 24px",
              background: "#009688",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Add First Media
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {items.map((item) => (
            <div
              key={String(item._id)}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                overflow: "hidden",
                opacity: item.enabled ? 1 : 0.6,
              }}
            >
              <div style={{ position: "relative", paddingBottom: "60%", background: "#F0F0F0" }}>
                {item.thumbnailUrl || item.mediaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnailUrl || item.mediaUrl}
                    alt={item.title || "Media"}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 40,
                    }}
                  >
                    {item.type === "video" ? "🎬" : "🖼"}
                  </div>
                )}
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    background: item.type === "video" ? "#111111" : "#C9A84C",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 99,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {item.type === "video" ? "Video" : "Image"}
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: item.enabled ? "#16a34a" : "#dc2626",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 99,
                  }}
                >
                  {item.enabled ? "Live" : "Hidden"}
                </div>
              </div>

              <div style={{ padding: "14px 16px" }}>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#111827",
                    margin: "0 0 4px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.title || "Untitled"}
                </p>
                {item.caption ? (
                  <p
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      margin: "0 0 8px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.caption}
                  </p>
                ) : null}
                {item.link?.trim() ? (
                  <p style={{ fontSize: 11, color: "#009688", margin: "0 0 12px", fontWeight: 600 }}>→ {item.link}</p>
                ) : null}

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    style={{
                      flex: 1,
                      padding: 7,
                      background: "#f3f4f6",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#374151",
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggle(item._id, item.enabled)}
                    style={{
                      flex: 1,
                      padding: 7,
                      background: item.enabled ? "#fef3c7" : "#f0fdf4",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: item.enabled ? "#92400e" : "#166534",
                      cursor: "pointer",
                    }}
                  >
                    {item.enabled ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(item._id)}
                    style={{
                      padding: "7px 10px",
                      background: "#fee2e2",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#dc2626",
                      cursor: "pointer",
                    }}
                  >
                    Del
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

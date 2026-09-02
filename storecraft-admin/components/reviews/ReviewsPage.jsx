"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CsvImportExportBar } from "@/components/ui/CsvImportExportBar";

function StarDisplay({ rating, size = 16 }) {
  const r = Number(rating) || 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={star <= r ? "#BA2711" : "none"}
          stroke={star <= r ? "#BA2711" : "#d1d5db"}
          strokeWidth="2"
          aria-hidden
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 2,
            transition: "transform 0.1s",
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "scale(0.9)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill={star <= (hover || value) ? "#BA2711" : "none"}
            stroke={star <= (hover || value) ? "#BA2711" : "#d1d5db"}
            strokeWidth="2"
            style={{
              transition: "fill 0.1s, stroke 0.1s",
              filter: star <= (hover || value) ? "drop-shadow(0 0 4px rgba(186,39,17,0.35))" : "none",
            }}
            aria-hidden
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
      <span style={{ fontSize: 14, color: "#6b7280", marginLeft: 6 }}>{hover || value || 0} / 5</span>
    </div>
  );
}

function ReviewerAvatar({ name, size = 40 }) {
  const initials =
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  const colors = ["#009688", "#e91e63", "#9c27b0", "#3f51b5", "#ff5722", "#795548", "#607d8b", "#f44336", "#2196f3"];
  const colorIndex = (name?.charCodeAt(0) || 0) % colors.length;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: colors[colorIndex],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: `${size * 0.35}px`,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

const EMPTY_FORM = {
  product: "",
  reviewer: {
    name: "",
    email: "",
    location: "",
    verified: false,
  },
  rating: 5,
  title: "",
  body: "",
  status: "approved",
  featured: false,
  adminReply: { text: "" },
};

export function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const fetchOpts = { credentials: "include" };

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        limit: "50",
      });
      const res = await fetch(`/api/reviews?${params}`, fetchOpts);
      const data = await res.json();
      if (data.success) {
        setReviews(data.reviews || []);
        setTotal(data.total || 0);
        if (data.stats) {
          setStats({
            total: data.stats.total ?? 0,
            pending: data.stats.pending ?? 0,
            approved: data.stats.approved ?? 0,
            rejected: data.stats.rejected ?? 0,
          });
        }
      } else {
        toast.error(data.error || "Failed to load reviews");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products?limit=100&status=active", fetchOpts);
      const data = await res.json();
      setProducts(Array.isArray(data.data) ? data.data : []);
    } catch {
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
    fetchProducts();
  }, [fetchReviews, fetchProducts]);

  const reviewKey = (r) => String(r._id || r.id || "");

  const handleSave = async () => {
    if (!form.product) {
      toast.error("Please select a product");
      return;
    }
    if (!form.reviewer.name?.trim()) {
      toast.error("Please enter reviewer name");
      return;
    }
    if (!form.rating) {
      toast.error("Please select a rating");
      return;
    }
    if (!form.body?.trim()) {
      toast.error("Please enter review text");
      return;
    }

    setSaving(true);
    try {
      const url = editingReview ? `/api/reviews/${reviewKey(editingReview)}` : "/api/reviews";
      const method = editingReview ? "PUT" : "POST";

      const payload = editingReview
        ? {
            product: form.product,
            reviewer: form.reviewer,
            rating: form.rating,
            title: form.title,
            body: form.body,
            status: form.status,
            featured: form.featured,
            adminReply: form.adminReply?.text?.trim()
              ? { text: form.adminReply.text.trim(), repliedAt: form.adminReply.repliedAt || new Date() }
              : { text: "", repliedAt: undefined },
          }
        : {
            product: form.product,
            reviewer: form.reviewer,
            rating: form.rating,
            title: form.title,
            body: form.body,
            status: form.status,
            featured: form.featured,
            adminReply: form.adminReply,
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingReview ? "Review updated!" : "Review added!");
        setShowForm(false);
        setEditingReview(null);
        setForm(EMPTY_FORM);
        fetchReviews();
      } else {
        toast.error(data.error || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Update failed");
        return;
      }
      fetchReviews();
      toast.success(status === "approved" ? "Review approved and visible on store!" : "Review rejected");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this review permanently?")) return;
    try {
      const res = await fetch(`/api/reviews/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Delete failed");
        return;
      }
      fetchReviews();
      toast.success("Review deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleBulkAction = async (action) => {
    if (!selectedIds.length) {
      toast.error("Select reviews first");
      return;
    }
    if (action === "delete" && !window.confirm(`Delete ${selectedIds.length} reviews?`)) return;

    try {
      const res = await fetch("/api/reviews/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, ids: selectedIds }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Bulk action failed");
        return;
      }
      setSelectedIds([]);
      fetchReviews();
      toast.success("Done!");
    } catch {
      toast.error("Bulk action failed");
    }
  };

  const handleToggleFeatured = async (review) => {
    const id = reviewKey(review);
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ featured: !review.featured }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Failed");
        return;
      }
      fetchReviews();
      toast.success(!review.featured ? "Review featured on homepage!" : "Review removed from homepage");
    } catch {
      toast.error("Failed");
    }
  };

  const handleRecalculateAllRatings = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/reviews/recalc-ratings", {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Ratings recalculated");
      } else {
        toast.error(data.error || "Failed to recalculate ratings");
      }
    } catch {
      toast.error("Failed to recalculate ratings");
    }
  };

  const handleSendReply = async (reviewId) => {
    if (!replyText.trim()) return;
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          adminReply: { text: replyText.trim(), repliedAt: new Date() },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Failed to save reply");
        return;
      }
      setReplyText("");
      setReplyingTo(null);
      fetchReviews();
      toast.success("Reply saved!");
    } catch {
      toast.error("Failed to save reply");
    }
  };

  const handleEdit = (review) => {
    const pid = review.product?._id || review.product;
    setEditingReview(review);
    setForm({
      product: pid ? String(pid) : "",
      reviewer: review.reviewer || { name: "", email: "", location: "", verified: false },
      rating: review.rating || 5,
      title: review.title || "",
      body: review.body || "",
      status: review.status || "approved",
      featured: review.featured || false,
      adminReply: review.adminReply || { text: "" },
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    fontSize: 14,
    color: "#111827",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
    fontFamily: "inherit",
  };

  const statusBadge = (status) =>
    (
      {
        pending: { bg: "#fef3c7", color: "#92400e", label: "Pending", dot: "#f59e0b" },
        approved: { bg: "#dcfce7", color: "#166534", label: "Approved", dot: "#16a34a" },
        rejected: { bg: "#fee2e2", color: "#991b1b", label: "Rejected", dot: "#ef4444" },
      }[status] || {
        bg: "#f3f4f6",
        color: "#374151",
        label: status,
        dot: "#9ca3af",
      }
    );

  const allSelected =
    reviews.length > 0 && reviews.every((r) => selectedIds.includes(reviewKey(r)));

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>Customer Reviews</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Manage and display customer reviews across your store</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleRecalculateAllRatings}
            style={{
              padding: "8px 16px",
              background: "#009688",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recalculate All Ratings
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingReview(null);
              setForm(EMPTY_FORM);
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
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            + Add Review
          </button>
        </div>
      </div>

      <div
        style={{
          marginBottom: 20,
          padding: "14px 16px",
          borderRadius: 10,
          border: "1px solid #bfdbfe",
          background: "#eff6ff",
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ minWidth: 200, flex: "1 1 240px" }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e3a8a" }}>CSV Import / Export</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#475569", lineHeight: 1.4 }}>
            Download a template, export reviews, or import a CSV. Match each row to a product with{" "}
            <strong>productSlug</strong>, <strong>productId</strong>, or <strong>articleNo</strong>.
          </p>
        </div>
        <CsvImportExportBar endpoint="/api/reviews/csv" label="Reviews" onImported={fetchReviews} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Reviews", value: stats.total, color: "#009688", bg: "#e6f7f5" },
          { label: "Pending Review", value: stats.pending, color: "#d97706", bg: "#fffbeb" },
          { label: "Approved", value: stats.approved, color: "#16a34a", bg: "#f0fdf4" },
          { label: "Rejected", value: stats.rejected, color: "#dc2626", bg: "#fef2f2" },
        ].map((stat, i) => (
          <div
            key={i}
            style={{
              background: "#fff",
              border: "1px solid #f3f4f6",
              borderRadius: 12,
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                background: stat.bg,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 800,
                color: stat.color,
              }}
            >
              {stat.value}
            </div>
            <div>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: 0, fontWeight: 500 }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {stats.pending > 0 && statusFilter !== "rejected" ? (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 12,
            padding: "14px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 20 }}>⏳</span>
          <div style={{ flex: "1 1 200px" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#92400e", margin: 0 }}>
              {stats.pending} review{stats.pending !== 1 ? "s" : ""} waiting for approval
            </p>
            <p style={{ fontSize: 12, color: "#b45309", margin: "2px 0 0" }}>Review and approve or reject customer submissions</p>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            style={{
              marginLeft: "auto",
              padding: "7px 16px",
              background: "#f59e0b",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Review Now
          </button>
        </div>
      ) : null}

      {showForm ? (
        <div style={{ background: "#fff", border: "2px solid #009688", borderRadius: 16, padding: 28, marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
              paddingBottom: 16,
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
              {editingReview ? "Edit Review" : "Add New Review"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingReview(null);
                setForm(EMPTY_FORM);
              }}
              style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Product *</label>
              <select
                value={form.product}
                onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))}
                style={inputStyle}
              >
                <option value="">Select a product...</option>
                {products.map((p) => (
                  <option key={String(p._id)} value={String(p._id)}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Reviewer Name *</label>
              <input
                style={inputStyle}
                placeholder="e.g. Sarah M."
                value={form.reviewer.name}
                onChange={(e) => setForm((f) => ({ ...f, reviewer: { ...f.reviewer, name: e.target.value } }))}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Email (optional)</label>
              <input
                style={inputStyle}
                type="email"
                placeholder="info@crazzycars.pk"
                value={form.reviewer.email}
                onChange={(e) => setForm((f) => ({ ...f, reviewer: { ...f.reviewer, email: e.target.value } }))}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Location</label>
              <input
                style={inputStyle}
                placeholder="e.g. Lahore, Pakistan"
                value={form.reviewer.location}
                onChange={(e) => setForm((f) => ({ ...f, reviewer: { ...f.reviewer, location: e.target.value } }))}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Review Title</label>
              <input
                style={inputStyle}
                placeholder="e.g. Perfect fit for my Corolla seat covers!"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>Star Rating *</label>
              <StarInput value={form.rating} onChange={(val) => setForm((f) => ({ ...f, rating: val }))} />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Review Text *</label>
              <textarea
                style={{
                  ...inputStyle,
                  minHeight: 120,
                  resize: "vertical",
                  lineHeight: 1.6,
                }}
                placeholder="Write the customer's review here..."
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              marginBottom: 20,
              padding: "16px 0",
              borderTop: "1px solid #f3f4f6",
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Status
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                {["pending", "approved", "rejected"].map((s) => {
                  const badge = statusBadge(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, status: s }))}
                      style={{
                        padding: "6px 14px",
                        border: "1px solid",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        borderColor: form.status === s ? badge.color : "#e5e7eb",
                        background: form.status === s ? badge.bg : "#fff",
                        color: form.status === s ? badge.color : "#6b7280",
                      }}
                    >
                      {badge.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Verified Purchase
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151" }}>
                <input
                  type="checkbox"
                  checked={form.reviewer.verified}
                  onChange={(e) => setForm((f) => ({ ...f, reviewer: { ...f.reviewer, verified: e.target.checked } }))}
                  style={{ accentColor: "#009688" }}
                />
                Mark as verified buyer
              </label>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Featured Review
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151" }}>
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                  style={{ accentColor: "#009688" }}
                />
                Show prominently on store
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%",
              padding: 14,
              background: saving ? "#9ca3af" : "#009688",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              cursor: saving ? "default" : "pointer",
            }}
          >
            {saving ? "Saving..." : editingReview ? "Update Review" : "Add Review to Store"}
          </button>
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 8, padding: 4 }}>
          {[
            { key: "all", label: "All" },
            { key: "pending", label: "Pending" },
            { key: "approved", label: "Approved" },
            { key: "rejected", label: "Rejected" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              style={{
                padding: "7px 16px",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                background: statusFilter === tab.key ? "#fff" : "transparent",
                color: statusFilter === tab.key ? "#111827" : "#6b7280",
                boxShadow: statusFilter === tab.key ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {selectedIds.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#009688", fontWeight: 600 }}>{selectedIds.length} selected</span>
            {[
              { action: "approve", label: "✓ Approve", bg: "#009688" },
              { action: "reject", label: "✕ Reject", bg: "#ef4444" },
              { action: "feature", label: "⭐ Feature", bg: "#f59e0b" },
              { action: "delete", label: "🗑 Delete", bg: "#dc2626" },
            ].map((btn) => (
              <button
                key={btn.action}
                type="button"
                onClick={() => handleBulkAction(btn.action)}
                style={{
                  padding: "6px 14px",
                  background: btn.bg,
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {reviews.length > 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "8px 16px", background: "#f9fafb", borderRadius: 8 }}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedIds(reviews.map((r) => reviewKey(r)));
              } else {
                setSelectedIds([]);
              }
            }}
            style={{ accentColor: "#009688" }}
          />
          <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>Select all {reviews.length} reviews</span>
          <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>{total} total</span>
        </div>
      ) : null}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid #e5e7eb",
              borderTopColor: "#009688",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
          Loading reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 80,
            color: "#9ca3af",
            background: "#f9fafb",
            borderRadius: 16,
            border: "2px dashed #e5e7eb",
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 16 }}>⭐</div>
          <h3 style={{ fontSize: 18, color: "#374151", margin: "0 0 8px" }}>No reviews yet</h3>
          <p style={{ fontSize: 14, margin: "0 0 20px" }}>Add your first review to get started</p>
          <button
            type="button"
            onClick={() => {
              setEditingReview(null);
              setForm(EMPTY_FORM);
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
            + Add First Review
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {reviews.map((review) => {
            const badge = statusBadge(review.status);
            const rid = reviewKey(review);
            const isSelected = selectedIds.includes(rid);

            return (
              <div
                key={rid}
                style={{
                  background: "#fff",
                  border: `1px solid ${review.status === "pending" ? "#fde68a" : isSelected ? "#009688" : "#f3f4f6"}`,
                  borderRadius: 14,
                  padding: 20,
                  transition: "border-color 0.15s",
                }}
              >
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds((p) => [...p, rid]);
                      } else {
                        setSelectedIds((p) => p.filter((id) => id !== rid));
                      }
                    }}
                    style={{ accentColor: "#009688", marginTop: 4, flexShrink: 0 }}
                  />

                  <ReviewerAvatar name={review.reviewer?.name} size={44} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{review.reviewer?.name}</span>
                          {review.reviewer?.verified ? (
                            <span
                              style={{
                                background: "#e6f7f5",
                                color: "#009688",
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 99,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                              }}
                            >
                              ✓ Verified
                            </span>
                          ) : null}
                          {review.featured ? (
                            <span
                              style={{
                                background: "#fef3c7",
                                color: "#92400e",
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 99,
                              }}
                            >
                              ⭐ Featured
                            </span>
                          ) : null}
                          <span
                            style={{
                              background: badge.bg,
                              color: badge.color,
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 99,
                              textTransform: "uppercase",
                            }}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#9ca3af", flexWrap: "wrap" }}>
                          <StarDisplay rating={review.rating} />
                          {review.reviewer?.location ? <span>📍 {review.reviewer.location}</span> : null}
                          <span>
                            {review.createdAt
                              ? new Date(review.createdAt).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : ""}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                        {review.status !== "approved" ? (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(rid, "approved")}
                            style={{
                              padding: "5px 12px",
                              background: "#dcfce7",
                              color: "#16a34a",
                              border: "none",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            ✓ Approve
                          </button>
                        ) : null}
                        {review.status !== "rejected" ? (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(rid, "rejected")}
                            style={{
                              padding: "5px 12px",
                              background: "#fee2e2",
                              color: "#dc2626",
                              border: "none",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            ✕ Reject
                          </button>
                        ) : null}
                        {review.status === "approved" ? (
                          <button
                            type="button"
                            onClick={() => handleToggleFeatured(review)}
                            title={review.featured ? "Remove from homepage" : "Feature on homepage"}
                            style={{
                              padding: "5px 12px",
                              border: "1px solid",
                              borderRadius: 6,
                              cursor: "pointer",
                              fontSize: 12,
                              fontWeight: 600,
                              borderColor: review.featured ? "#C9A84C" : "#e5e7eb",
                              background: review.featured ? "#fffbeb" : "#f9fafb",
                              color: review.featured ? "#92400e" : "#6b7280",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {review.featured ? "★ Featured" : "☆ Feature"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleEdit(review)}
                          style={{
                            padding: "5px 10px",
                            background: "#f3f4f6",
                            color: "#374151",
                            border: "none",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(rid)}
                          style={{
                            padding: "5px 10px",
                            background: "#fee2e2",
                            color: "#dc2626",
                            border: "none",
                            borderRadius: 6,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    </div>

                    {review.product ? (
                      <div style={{ fontSize: 12, color: "#009688", fontWeight: 500, marginBottom: 8 }}>
                        📦 {review.product.name || review.productName}
                      </div>
                    ) : null}

                    {review.title ? (
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>{review.title}</p>
                    ) : null}

                    <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: 0 }}>{review.body}</p>

                    {review.adminReply?.text ? (
                      <div
                        style={{
                          marginTop: 12,
                          padding: "12px 16px",
                          background: "#f0fdf9",
                          border: "1px solid #b2dfdb",
                          borderRadius: 8,
                          borderLeft: "3px solid #009688",
                        }}
                      >
                        <p style={{ fontSize: 12, fontWeight: 700, color: "#009688", margin: "0 0 4px" }}>Store replied:</p>
                        <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.6 }}>{review.adminReply.text}</p>
                      </div>
                    ) : null}

                    {replyingTo === rid ? (
                      <div style={{ marginTop: 12 }}>
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write your reply to this review..."
                          autoFocus
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            border: "1px solid #009688",
                            borderRadius: 8,
                            fontSize: 13,
                            lineHeight: 1.6,
                            outline: "none",
                            resize: "vertical",
                            minHeight: 80,
                            boxSizing: "border-box",
                            fontFamily: "inherit",
                          }}
                        />
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button
                            type="button"
                            onClick={() => handleSendReply(rid)}
                            style={{
                              padding: "7px 18px",
                              background: "#009688",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Save Reply
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText("");
                            }}
                            style={{
                              padding: "7px 14px",
                              background: "#f3f4f6",
                              color: "#374151",
                              border: "none",
                              borderRadius: 6,
                              fontSize: 13,
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(rid);
                          setReplyText(review.adminReply?.text || "");
                        }}
                        style={{
                          marginTop: 10,
                          background: "none",
                          border: "none",
                          color: "#009688",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        {review.adminReply?.text ? "✏️ Edit Reply" : "💬 Reply to review"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

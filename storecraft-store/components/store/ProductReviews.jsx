"use client";

import { useEffect, useRef, useState } from "react";

export function StarDisplay({ rating, size = 16 }) {
  const rounded = Math.round(Number(rating) || 0);
  return (
    <div className="inline-flex items-center gap-px">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={star <= rounded ? "#D72323" : "none"}
          stroke={star <= rounded ? "#D72323" : "#D1D5DB"}
          strokeWidth="2"
          aria-hidden
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
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

  const colors = ["#D4AF37", "#e91e63", "#9c27b0", "#3f51b5", "#ff5722", "#795548", "#607d8b", "#f44336", "#2196f3"];
  const colorIndex = (name?.charCodeAt(0) || 0) % colors.length;

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: `${size * 0.35}px`,
        background: colors[colorIndex],
      }}
    >
      {initials}
    </div>
  );
}

export default function ProductReviews({ productId, productSlug, onReviewCountChange, embedded = false }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    location: "",
    rating: 0,
    title: "",
    body: "",
  });
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  const onReviewCountChangeRef = useRef(onReviewCountChange);
  onReviewCountChangeRef.current = onReviewCountChange;

  useEffect(() => {
    if (!productId && !productSlug) return;

    const params = new URLSearchParams();
    if (productId) params.set("product", productId);
    if (productSlug) params.set("slug", productSlug);
    params.set("limit", "50");

    let cancelled = false;
    fetch(`/api/reviews?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success) {
          setReviews(data.reviews || []);
          setStats(data.stats);
          const total = data.stats?.total ?? (data.reviews || []).length;
          const avg = data.stats?.average != null ? Number(data.stats.average) : null;
          onReviewCountChangeRef.current?.(total, avg);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, productSlug]);

  const handleSubmit = async () => {
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Please enter your name");
      return;
    }
    if (!formData.rating) {
      setFormError("Please select a star rating");
      return;
    }
    if (formData.body.trim().length < 10) {
      setFormError("Please write at least 10 characters");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          productSlug,
          ...formData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setShowForm(false);
        setFormData({
          name: "",
          email: "",
          location: "",
          rating: 0,
          title: "",
          body: "",
        });
      } else {
        setFormError(data.error || "Failed to submit");
      }
    } catch {
      setFormError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!productId && !productSlug) return null;

  const wrapperClass = embedded ? "pt-0" : "mt-14 border-t-2 border-zinc-100 pt-12";

  if (loading) {
    return embedded ? (
      <div className={`${wrapperClass} py-6 text-center text-sm text-zinc-400`}>Loading reviews…</div>
    ) : null;
  }

  const displayedReviews = showAll ? reviews : reviews.slice(0, 4);
  const avg = stats != null ? Number(stats.average) || 0 : 0;
  const totalReviews = stats?.total ?? reviews.length;

  return (
    <div className={wrapperClass}>
      <div className={`flex flex-wrap items-start justify-between gap-4 ${embedded ? "mb-6" : "mb-8"}`}>
        <div>
          {!embedded ? <h2 className="mb-1 text-2xl font-extrabold tracking-tight text-zinc-900">Customer Reviews</h2> : null}
          {stats ? (
            <div className="flex flex-wrap items-center gap-2">
              <StarDisplay rating={avg} size={20} />
              <span className="text-lg font-bold text-zinc-900">{avg.toFixed(1)}</span>
              <span className="text-sm text-zinc-600">
                out of 5 · {totalReviews} review{totalReviews !== 1 ? "s" : ""}
              </span>
            </div>
          ) : null}
        </div>

        {stats?.breakdown ? (
          <div className="flex min-w-[200px] flex-col gap-1.5">
            {stats.breakdown.map(({ star, count, percentage }) => (
              <div key={star} className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-right text-xs text-zinc-600">{star}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full rounded-full bg-[#D72323] transition-all" style={{ width: `${percentage}%` }} />
                </div>
                <span className="w-6 shrink-0 text-xs text-zinc-400">{count}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {!reviews.length ? (
        <p className="mb-6 text-center text-sm text-zinc-500">No reviews yet — share yours below.</p>
      ) : (
        <div className="mb-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
          {displayedReviews.map((review) => (
            <div key={String(review._id)} className="rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] p-5 shadow-sm transition hover:border-[#111111]">
              <div className="mb-3 flex items-start gap-3">
                <ReviewerAvatar name={review.reviewer?.name} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-zinc-900">{review.reviewer?.name}</span>
                    {review.reviewer?.verified ? (
                      <span className="rounded-full border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.08)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#059669]">
                        ✓ Verified
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StarDisplay rating={review.rating} />
                    {review.reviewer?.location ? (
                      <span className="text-[11px] text-zinc-400">· {review.reviewer.location}</span>
                    ) : null}
                  </div>
                </div>
                <span className="shrink-0 text-[11px] text-zinc-400">
                  {review.createdAt
                    ? new Date(review.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : ""}
                </span>
              </div>

              {review.title ? <p className="mb-2 text-sm font-bold text-zinc-900">{review.title}</p> : null}
              <p className="text-sm leading-relaxed text-zinc-700">{review.body}</p>

              {review.adminReply?.text ? (
                <div className="mt-4 rounded-r-lg border-l-[3px] border-[#D72323] bg-[rgba(201,168,76,0.05)] px-3.5 py-3">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#D72323]">Store replied</p>
                  <p className="m-0 text-[13px] leading-relaxed text-zinc-700">{review.adminReply.text}</p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {reviews.length > 4 ? (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowAll((p) => !p)}
            className="rounded-full border-2 border-[#D4AF37] px-8 py-3 text-sm font-bold text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-white"
          >
            {showAll ? "Show less" : `Show all ${reviews.length} reviews`}
          </button>
        </div>
      ) : null}

      {/* WRITE A REVIEW SECTION */}
      <div style={{ marginTop: embedded ? 32 : 48 }}>
        {submitted ? (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 16,
              padding: "24px 28px",
              marginBottom: 24,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#166534", margin: "0 0 8px" }}>Thank you for your review!</h3>
            <p style={{ fontSize: 14, color: "#16a34a", margin: 0 }}>
              Your review has been submitted and will appear after our team approves it. We appreciate your feedback!
            </p>
          </div>
        ) : null}

        {!showForm && !submitted ? (
          <div
            style={{
              background: "#F8F8F8",
              border: "2px solid #E5E5E5",
              borderRadius: 16,
              padding: "28px 32px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>✍️</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#E8E8E8", margin: "0 0 8px" }}>Bought this product?</h3>
            <p style={{ fontSize: 15, color: "#707070", margin: "0 0 20px", lineHeight: 1.6 }}>
              Share your experience and help other customers make the right choice. Your honest review matters!
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "13px 28px",
                background: "#111111",
                color: "#E8E8E8",
                border: "none",
                borderRadius: 50,
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#B01C1C";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#D4AF37";
              }}
            >
              Write a Review
              <span style={{ fontSize: 18 }}>→</span>
            </button>
          </div>
        ) : null}

        {showForm ? (
          <div
            style={{
              background: "#E8E8E8",
              border: "2px solid #111111",
              borderRadius: 20,
              padding: "32px",
              boxShadow: "0 8px 32px rgba(0,150,136,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 28,
                paddingBottom: 20,
                borderBottom: "1px solid #1A1A1A",
              }}
            >
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#E8E8E8", margin: "0 0 4px" }}>Write Your Review</h3>
                <p style={{ fontSize: 13, color: "#707070", margin: 0 }}>Your review will be published after a quick check by our team</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormError("");
                }}
                style={{
                  background: "#1A1A1A",
                  border: "none",
                  borderRadius: 8,
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 18,
                  color: "#707070",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#B0B0B0", marginBottom: 12 }}>Your Rating *</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setFormData((f) => ({ ...f, rating: star }))}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      transition: "transform 0.1s",
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = "scale(0.85)";
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    <svg
                      width="38"
                      height="38"
                      viewBox="0 0 24 24"
                      fill={star <= (hoverRating || formData.rating) ? "#D72323" : "none"}
                      stroke={star <= (hoverRating || formData.rating) ? "#D72323" : "#d1d5db"}
                      strokeWidth="1.5"
                      style={{
                        transition: "all 0.15s",
                        filter:
                          star <= (hoverRating || formData.rating) ? "drop-shadow(0 2px 6px rgba(245,158,11,0.5))" : "none",
                      }}
                      aria-hidden
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                ))}

                {(hoverRating || formData.rating) > 0 ? (
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#D72323", marginLeft: 8 }}>
                    {["", "Poor", "Fair", "Good", "Very Good", "Excellent!"][hoverRating || formData.rating]}
                  </span>
                ) : null}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#B0B0B0", marginBottom: 8 }}>Your Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah M."
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    border: "2px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    fontSize: 14,
                    color: "#E8E8E8",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#D4AF37";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.08)";
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#B0B0B0", marginBottom: 8 }}>
                  Email Address
                  <span style={{ fontSize: 11, color: "#707070", fontWeight: 400, marginLeft: 6 }}>(not published)</span>
                </label>
                <input
                  type="email"
                  placeholder="info@homefy.pk"
                  value={formData.email}
                  onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    border: "2px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    fontSize: 14,
                    color: "#E8E8E8",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#D4AF37";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.08)";
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#B0B0B0", marginBottom: 8 }}>
                Where are you from?
                <span style={{ fontSize: 11, color: "#707070", fontWeight: 400, marginLeft: 6 }}>(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Lahore, Pakistan"
                value={formData.location}
                onChange={(e) => setFormData((f) => ({ ...f, location: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  border: "2px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  fontSize: 14,
                  color: "#E8E8E8",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#D4AF37";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.08)";
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#B0B0B0", marginBottom: 8 }}>
                Review Title
                <span style={{ fontSize: 11, color: "#707070", fontWeight: 400, marginLeft: 6 }}>(optional)</span>
              </label>
              <input
                type="text"
                placeholder="Sum up your experience in one line"
                value={formData.title}
                onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  border: "2px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  fontSize: 14,
                  color: "#E8E8E8",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#D4AF37";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.08)";
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#B0B0B0", marginBottom: 8 }}>Your Review *</label>
              <textarea
                placeholder="Tell others what you think about this product. What did you like? How did it look? Would you recommend it?"
                value={formData.body}
                onChange={(e) => setFormData((f) => ({ ...f, body: e.target.value }))}
                rows={5}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "2px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  fontSize: 14,
                  color: "#E8E8E8",
                  outline: "none",
                  boxSizing: "border-box",
                  resize: "vertical",
                  lineHeight: 1.7,
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#D4AF37";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.08)";
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: "#707070" }}>Minimum 10 characters</span>
                <span style={{ fontSize: 11, color: formData.body.length >= 10 ? "#D4AF37" : "#707070" }}>
                  {formData.body.length} characters
                </span>
              </div>
            </div>

            {formError ? (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: 16,
                  fontSize: 13,
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                ⚠️ {formError}
              </div>
            ) : null}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <p style={{ fontSize: 12, color: "#707070", margin: 0, lineHeight: 1.5, flex: 1 }}>
                🔒 Your email is never published. Reviews are checked before going live.
              </p>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: "13px 32px",
                  background: submitting ? "#707070" : "#D4AF37",
                  color: "#E8E8E8",
                  border: "none",
                  borderRadius: 50,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: submitting ? "default" : "pointer",
                  transition: "background 0.2s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!submitting) e.currentTarget.style.background = "#B01C1C";
                }}
                onMouseLeave={(e) => {
                  if (!submitting) e.currentTarget.style.background = "#D4AF37";
                }}
              >
                {submitting ? "⏳ Submitting..." : "Submit Review →"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

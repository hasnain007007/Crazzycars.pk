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

export default function ProductReviews({
  productId,
  productSlug,
  onReviewCountChange,
  embedded = false,
  initialReviews = null,
}) {
  const hasSSR = Array.isArray(initialReviews);
  const [reviews, setReviews] = useState(() => (hasSSR ? initialReviews : []));
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(!hasSSR);
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
    if (hasSSR) {
      const total = initialReviews.length;
      const avg =
        total > 0
          ? initialReviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / total
          : null;
      onReviewCountChangeRef.current?.(total, avg);
    }
  }, [hasSSR, initialReviews]);

  useEffect(() => {
    if (!productId && !productSlug) return;
    // With SSR reviews, still refresh in background for "Load more" / newer approvals —
    // but never flash "Loading reviews…" on first paint.
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
        <p className="mb-6 text-center text-sm text-zinc-500">
          No reviews yet. Be the first to share yours — after delivery we send a private review
          link on WhatsApp. You can also{" "}
          <a href="/track-order" className="font-semibold text-[#C41E1E] underline-offset-2 hover:underline">
            track your order
          </a>{" "}
          and ask for a review link.
        </p>
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

      <div className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-center text-sm text-zinc-600">
        Bought this product? After delivery we send a private review link on WhatsApp so only verified
        buyers can rate it.{" "}
        <a href="/track-order" className="font-semibold text-[#C41E1E] underline-offset-2 hover:underline">
          Track your order
        </a>{" "}
        if you need a fresh link.
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

function StarDisplay({ rating }) {
  const r = Number(rating) || 0;
  return (
    <div className="mb-3 flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} width="18" height="18" viewBox="0 0 24 24" fill={star <= r ? "#D72323" : "none"} stroke={star <= r ? "#D72323" : "rgba(255,255,255,0.08)"} strokeWidth="2" aria-hidden>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export default function FeaturedReviews() {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetch("/api/reviews?featured=true&limit=6")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setReviews(data.reviews || []);
      })
      .catch(() => {});
  }, []);

  if (!reviews.length) return null;

  return (
    <section className="bg-zinc-50 px-6 py-16 md:py-20">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-12 text-center">
          <span className="mb-3 inline-block rounded-full bg-teal-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
            What our customers say
          </span>
          <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-zinc-900 md:text-4xl">Loved by thousands</h2>
          <p className="m-0 text-base text-zinc-600">Real reviews from real customers</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => {
            const colors = ["#D4AF37", "#e91e63", "#9c27b0", "#3f51b5", "#ff5722", "#795548"];
            const colorIndex = (review.reviewer?.name?.charCodeAt(0) || 0) % colors.length;
            const initials =
              review.reviewer?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "?";

            return (
              <div key={String(review._id)} className="rounded-2xl border border-zinc-100 bg-[#111111] p-6 shadow-sm">
                <StarDisplay rating={review.rating} />
                {review.title ? <p className="mb-2 text-[15px] font-bold text-zinc-900">{review.title}</p> : null}
                <p className="mb-5 text-sm leading-relaxed text-zinc-700">&ldquo;{review.body}&rdquo;</p>
                <div className="flex items-center gap-3 border-t border-zinc-100 pt-4">
                  <div
                    className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: colors[colorIndex] }}
                  >
                    {initials}
                  </div>
                  <div>
                    <p className="m-0 text-sm font-bold text-zinc-900">{review.reviewer?.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                      {review.reviewer?.verified ? <span className="font-semibold text-[#D4AF37]">✓ Verified buyer</span> : null}
                      {review.reviewer?.location ? <span>· {review.reviewer.location}</span> : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

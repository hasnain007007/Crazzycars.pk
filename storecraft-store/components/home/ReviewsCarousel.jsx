"use client";

import { useState, useEffect, useRef } from "react";

export default function ReviewsCarousel() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const trackRef = useRef(null);
  const [cardWidth, setCardWidth] = useState(360);
  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    fetch("/api/reviews?featured=true&status=approved&limit=20")
      .then((r) => r.json())
      .then((data) => {
        const list = data?.reviews || data?.data || [];
        setReviews(Array.isArray(list) ? list : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const updateSizes = () => {
      const w = window.innerWidth;
      if (w < 640) {
        setVisibleCount(1);
        setCardWidth(w - 48);
      } else if (w < 1024) {
        setVisibleCount(2);
        setCardWidth((w - 80) / 2);
      } else {
        setVisibleCount(3);
        setCardWidth(360);
      }
    };
    updateSizes();
    window.addEventListener("resize", updateSizes);
    return () => window.removeEventListener("resize", updateSizes);
  }, []);

  useEffect(() => {
    const max = Math.max(0, reviews.length - visibleCount);
    setCurrentIndex((i) => Math.min(i, max));
  }, [reviews.length, visibleCount]);

  if (!loading && reviews.length === 0) return null;

  const maxIndex = Math.max(0, reviews.length - visibleCount);

  const prev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const next = () => setCurrentIndex((i) => Math.min(maxIndex, i + 1));

  const renderStars = (rating) => (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          style={{
            color: i < (rating || 5) ? "#D72323" : "#E5E5E5",
            fontSize: 15,
          }}
        >
          ★
        </span>
      ))}
    </div>
  );

  const reviewerInitial = (review) => {
    const n = String(review.reviewer?.name || review.name || "A").trim();
    return (n.charAt(0) || "A").toUpperCase();
  };

  if (loading) {
    return (
      <section
        style={{
          background: "#F8F8F8",
          padding: "60px 0",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px",
          }}
        >
          <div
            style={{
              width: 200,
              height: 24,
              background: "#E5E5E5",
              borderRadius: 4,
              margin: "0 auto 40px",
            }}
          />
          <div
            style={{
              display: "flex",
              gap: 20,
            }}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  flex: "0 0 360px",
                  height: 200,
                  background: "#EEEEEE",
                  borderRadius: 8,
                }}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      style={{
        background: "#F8F8F8",
        padding: "60px 0",
        borderTop: "1px solid #E5E5E5",
        borderBottom: "1px solid #E5E5E5",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 32,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#D72323",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                margin: "0 0 8px",
              }}
            >
              Customer Reviews
            </p>
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 22,
                fontWeight: 700,
                color: "#111111",
                margin: "0 0 6px",
                textTransform: "uppercase",
                letterSpacing: "-0.01em",
              }}
            >
              What Our Customers Say
            </h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ color: "#D72323", fontSize: 14 }}>★★★★★</span>
              <span
                style={{
                  fontSize: 13,
                  color: "#888888",
                }}
              >
                {reviews.length} verified review{reviews.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Arrow buttons top right */}
          {reviews.length > visibleCount ? (
            <div
              style={{
                display: "flex",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={prev}
                disabled={currentIndex === 0}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: currentIndex === 0 ? "#F0F0F0" : "#FFFFFF",
                  border: "1px solid",
                  borderColor: currentIndex === 0 ? "#E5E5E5" : "#111111",
                  cursor: currentIndex === 0 ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  color: currentIndex === 0 ? "#CCCCCC" : "#111111",
                  transition: "all 0.2s",
                  flexShrink: 0,
                }}
              >
                ←
              </button>
              <button
                type="button"
                onClick={next}
                disabled={currentIndex >= maxIndex}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: currentIndex >= maxIndex ? "#F0F0F0" : "#111111",
                  border: "1px solid",
                  borderColor: currentIndex >= maxIndex ? "#E5E5E5" : "#111111",
                  cursor: currentIndex >= maxIndex ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  color: currentIndex >= maxIndex ? "#CCCCCC" : "#FFFFFF",
                  transition: "all 0.2s",
                  flexShrink: 0,
                }}
              >
                →
              </button>
            </div>
          ) : null}
        </div>

        {/* Slider track */}
        <div
          style={{
            overflow: "hidden",
            width: "100%",
          }}
        >
          <div
            ref={trackRef}
            style={{
              display: "flex",
              gap: 20,
              transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: `translateX(-${currentIndex * (cardWidth + 20)}px)`,
            }}
          >
            {reviews.map((review, i) => (
              <div
                key={review._id != null ? String(review._id) : `review-${i}`}
                style={{
                  flex: `0 0 ${cardWidth}px`,
                  width: cardWidth,
                  background: "#FFFFFF",
                  border: "1px solid #E5E5E5",
                  borderRadius: 8,
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  boxSizing: "border-box",
                }}
              >
                {renderStars(review.rating)}
                <p
                  style={{
                    fontSize: 14,
                    color: "#555555",
                    lineHeight: 1.7,
                    margin: 0,
                    flex: 1,
                    fontStyle: "italic",
                  }}
                >
                  &ldquo;
                  {review.body || review.comment || review.text || ""}&rdquo;
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    paddingTop: 12,
                    borderTop: "1px solid #F0F0F0",
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #D72323, #B01C1C)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#FFFFFF",
                      fontSize: 14,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {reviewerInitial(review)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#111111",
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {review.reviewer?.name || review.name || "Customer"}
                    </p>
                    {(review.reviewer?.location || review.location) ? (
                      <p
                        style={{
                          fontSize: 12,
                          color: "#888888",
                          margin: 0,
                        }}
                      >
                        {review.reviewer?.location || review.location}
                      </p>
                    ) : null}
                  </div>
                  {review.reviewer?.verified || review.verified ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#059669",
                        background: "rgba(16,185,129,0.08)",
                        border: "1px solid rgba(16,185,129,0.3)",
                        padding: "2px 8px",
                        borderRadius: 99,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      Verified
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dots indicator */}
        {reviews.length > visibleCount ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 6,
              marginTop: 24,
            }}
          >
            {Array.from({ length: maxIndex + 1 }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentIndex(i)}
                style={{
                  width: i === currentIndex ? 24 : 8,
                  height: 8,
                  borderRadius: 99,
                  background: i === currentIndex ? "#111111" : "#CCCCCC",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  transition: "all 0.3s",
                }}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

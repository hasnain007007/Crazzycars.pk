/** Tiny star row — kept separate so ProductReviews stays out of the PDP critical path. */
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

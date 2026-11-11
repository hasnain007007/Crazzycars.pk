import Link from "next/link";

/**
 * Editorial Google Business Profile social proof only.
 * Must NOT emit Product AggregateRating / Review JSON-LD (C12).
 */
export default function GoogleReviewsNote({
  rating = "4.9",
  reviewCount = 7,
  className = "",
}) {
  const count = Number(reviewCount) || 0;
  if (count <= 0) return null;

  return (
    <aside
      className={`mx-auto my-6 max-w-7xl px-4 md:px-6 ${className}`.trim()}
      aria-label="Google customer reviews"
    >
      <p className="m-0 text-sm text-[#444444] md:text-base">
        What customers say on Google:{" "}
        <strong className="font-semibold text-[#111111]">
          {rating}★ from {count} Google reviews
        </strong>
        .{" "}
        <Link href="/review" className="font-semibold text-[#C41E1E] underline-offset-2 hover:underline">
          Leave a Google review
        </Link>
        .
      </p>
    </aside>
  );
}

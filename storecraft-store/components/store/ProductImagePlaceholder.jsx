/**
 * Intentional “photo coming soon” tile. Used when a product still points at a
 * catalog SVG or has no image. Swap in a real photo via Admin → Products → Media.
 */
export function ProductImagePlaceholder({ name = "", className = "", compact = false }) {
  const title = String(name || "").trim() || "Product";
  return (
    <div
      className={`product-image-placeholder ${className}`.trim()}
      role="img"
      aria-label={`${title} — photo coming soon`}
    >
      <div className="product-image-placeholder__body">
        <svg
          className="product-image-placeholder__icon"
          viewBox="0 0 48 48"
          fill="none"
          aria-hidden
        >
          <rect x="6" y="10" width="36" height="28" rx="3" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="18" cy="22" r="4" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 34l9-9 6 6 7-8 10 11" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <p className={`product-image-placeholder__name ${compact ? "is-compact" : ""}`}>{title}</p>
        <p className="product-image-placeholder__caption">Photo coming soon</p>
      </div>
      <span className="product-image-placeholder__mark">Homefy.pk</span>
    </div>
  );
}

export default ProductImagePlaceholder;

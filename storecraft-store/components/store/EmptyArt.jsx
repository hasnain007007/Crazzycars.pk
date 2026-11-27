/**
 * Small animated illustrations for empty screens (cart, wishlist, no search results,
 * missing page, no orders). Pure SVG + CSS transforms (styles: `.ea-*` in globals.css);
 * decorative only (aria-hidden) so callers keep their own text. Still under
 * prefers-reduced-motion.
 */
const CAR = (
  <g className="ea-car-body">
    <path
      d="M38 78c0-5 3-8 8-9l10-2 10-9c3-2 5-3 9-3h18c4 0 7 1 9 4l8 8 8 2c4 1 7 4 7 8v4c0 2-2 3-3 3H41c-2 0-3-1-3-3z"
      fill="#C41E1E"
    />
    <path d="M70 61c2-2 4-3 6-3h7v10H63zM87 58h6c3 0 5 1 7 3l7 7H87z" fill="#fde2e2" />
    <rect x="113" y="73" width="6" height="3.5" rx="1.75" fill="#ffd36b" />
    <g className="ea-wheel">
      <circle cx="58" cy="85" r="7.5" fill="#111" />
      <circle cx="58" cy="85" r="2.8" fill="#e5e7eb" />
    </g>
    <g className="ea-wheel">
      <circle cx="105" cy="85" r="7.5" fill="#111" />
      <circle cx="105" cy="85" r="2.8" fill="#e5e7eb" />
    </g>
  </g>
);

const ART = {
  cart: (
    <>
      <ellipse className="ea-shadow" cx="80" cy="106" rx="30" ry="5" fill="#e5e7eb" />
      <g className="ea-float">
        <path d="M62 44c0-10 8-18 18-18s18 8 18 18" fill="none" stroke="#9ca3af" strokeWidth="4" strokeLinecap="round" />
        <path d="M46 44h68l-6 50c-.5 4-4 7-8 7H60c-4 0-7.5-3-8-7z" fill="#fff" stroke="#C41E1E" strokeWidth="3" strokeLinejoin="round" />
        <path d="M68 70c4 5 20 5 24 0" fill="none" stroke="#C41E1E" strokeWidth="3" strokeLinecap="round" />
        <circle cx="68" cy="60" r="2.6" fill="#C41E1E" />
        <circle cx="92" cy="60" r="2.6" fill="#C41E1E" />
      </g>
      <path className="ea-spark ea-spark--1" d="M28 36l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffd36b" />
      <path className="ea-spark ea-spark--2" d="M130 28l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="#fca5a5" />
      <path className="ea-spark ea-spark--3" d="M134 74l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z" fill="#ffd36b" />
    </>
  ),
  wishlist: (
    <>
      <g className="ea-beat">
        <path
          d="M80 98S40 74 40 50c0-12 9-21 20-21 8 0 15 5 20 12 5-7 12-12 20-12 11 0 20 9 20 21 0 24-40 48-40 48z"
          fill="#fee2e2"
          stroke="#C41E1E"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M58 46c2-5 6-7 10-7" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      </g>
      <path className="ea-mini ea-mini--1" d="M30 70s-8-5-8-10c0-2.5 2-4.5 4-4.5 1.7 0 3 1 4 2.5 1-1.5 2.3-2.5 4-2.5 2 0 4 2 4 4.5 0 5-8 10-8 10z" fill="#fca5a5" />
      <path className="ea-mini ea-mini--2" d="M132 60s-7-4.5-7-9c0-2.2 1.8-4 3.6-4 1.5 0 2.6.9 3.4 2.2.8-1.3 1.9-2.2 3.4-2.2 1.8 0 3.6 1.8 3.6 4 0 4.5-7 9-7 9z" fill="#C41E1E" opacity=".7" />
      <path className="ea-mini ea-mini--3" d="M118 96s-5-3-5-6.5c0-1.6 1.3-2.8 2.6-2.8 1 0 1.9.6 2.4 1.5.5-.9 1.4-1.5 2.4-1.5 1.3 0 2.6 1.2 2.6 2.8 0 3.5-5 6.5-5 6.5z" fill="#fca5a5" />
    </>
  ),
  search: (
    <>
      <rect x="26" y="70" width="32" height="34" rx="6" fill="#e5e7eb" />
      <rect x="64" y="70" width="32" height="34" rx="6" fill="#e5e7eb" />
      <rect x="102" y="70" width="32" height="34" rx="6" fill="#e5e7eb" />
      <g className="ea-scan">
        <circle cx="74" cy="48" r="20" fill="#fff" fillOpacity=".85" stroke="#111" strokeWidth="5" />
        <path d="M88.5 62.5L104 78" stroke="#111" strokeWidth="7" strokeLinecap="round" />
        <path d="M68 42c0-4 3-6.5 6.5-6.5S81 38 81 41.5c0 5-6.5 5-6.5 9.5" fill="none" stroke="#C41E1E" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="74.5" cy="57" r="2.2" fill="#C41E1E" />
      </g>
    </>
  ),
  lost: (
    <>
      <line className="ea-road" x1="6" y1="95.5" x2="154" y2="95.5" stroke="#d1d5db" strokeWidth="4" strokeLinecap="round" />
      <g className="ea-drive">{CAR}</g>
      <g className="ea-pin">
        <path d="M132 50c-9 0-15-7-15-15s6.5-15 15-15 15 7 15 15-6 15-15 15z" fill="#111" />
        <path d="M124 46l8 14 8-14z" fill="#111" />
        <path d="M127.5 31c0-3 2-5 4.8-5s4.7 2 4.7 4.6c0 3.8-4.7 3.8-4.7 7.2" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="132.3" cy="42" r="1.7" fill="#fff" />
      </g>
    </>
  ),
  orders: (
    <>
      <ellipse className="ea-shadow" cx="80" cy="106" rx="34" ry="5" fill="#e5e7eb" />
      <g className="ea-float">
        <path d="M48 52l32-14 32 14v40l-32 14-32-14z" fill="#e8c9a0" />
        <path d="M80 66v40l32-14V52z" fill="#d6b086" />
        <path d="M48 52l32 14 32-14" fill="none" stroke="#b98d5f" strokeWidth="2" />
        <path d="M64 45l32 14v12" fill="none" stroke="#C41E1E" strokeWidth="5" />
      </g>
      <path className="ea-spark ea-spark--1" d="M30 40l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffd36b" />
      <path className="ea-spark ea-spark--3" d="M132 34l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="#fca5a5" />
    </>
  ),
};

export function EmptyArt({ variant = "cart", size = 160, className = "" }) {
  const art = ART[variant] || ART.cart;
  return (
    <svg
      className={`ea ea--${variant} ${className}`.trim()}
      viewBox="0 0 160 120"
      width={size}
      height={Math.round((size * 120) / 160)}
      aria-hidden="true"
      focusable="false"
    >
      {art}
    </svg>
  );
}

/** Branded "car driving" loader for in-page waits (e.g. loading an order). */
export function CarLoader({ label = "Loading…" }) {
  return (
    <div className="ccl" role="status" aria-live="polite">
      <svg className="ea ea--lost ccl__svg" viewBox="0 20 160 90" width="150" height="84" aria-hidden="true">
        <line className="ea-road" x1="6" y1="95.5" x2="154" y2="95.5" stroke="#d1d5db" strokeWidth="4" strokeLinecap="round" />
        <g className="ea-drive">{CAR}</g>
      </svg>
      <span className="ccl__label">{label}</span>
    </div>
  );
}

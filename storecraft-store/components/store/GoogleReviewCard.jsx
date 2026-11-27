/**
 * "Review us on Google" card — more Google reviews = better local ranking (Maps / "near me").
 * Links to /review, which 301s to the Google Business Profile review form (admin setting).
 *
 * Google review policy: ask EVERY customer for an HONEST review — no incentives, and no
 * "review gating" (never send only happy customers to Google / unhappy ones elsewhere).
 * Keep this copy neutral.
 *
 * variant: "after-order" (success page — review once the parcel arrives)
 *          "delivered"   (tracking page — parcel has arrived)
 */
const COPY = {
  "after-order": {
    title: "Got your parcel? Share how it went",
    text: "Once your order arrives, please share your honest experience on Google. It takes a minute and helps other car owners find CrazzyCars.",
    cta: "Review us on Google",
  },
  delivered: {
    title: "Your parcel has arrived — how was it?",
    text: "Please share your honest experience on Google. It takes a minute and helps other car owners across Pakistan find us.",
    cta: "Write a Google review",
  },
};

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" width="26" height="26" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.2-8.5 2.2-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export default function GoogleReviewCard({ variant = "after-order", className = "" }) {
  const c = COPY[variant] || COPY["after-order"];
  return (
    <aside className={`grc grc--${variant} ${className}`.trim()} aria-label="Review CrazzyCars on Google">
      <div className="grc__head">
        <GoogleG />
        <span className="grc__stars" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="grc__star" style={{ "--i": i }}>
              ★
            </span>
          ))}
        </span>
      </div>
      <p className="grc__title">{c.title}</p>
      <p className="grc__text">{c.text}</p>
      <a className="grc__btn" href="/review" target="_blank" rel="noopener noreferrer">
        {c.cta} <span aria-hidden="true">→</span>
      </a>
    </aside>
  );
}

/**
 * Server-rendered track-order title chrome — always emits one H1 for crawlers.
 */
export function OrderTrackingChrome() {
  return (
    <div className="cc-track__top-copy" style={{ marginBottom: 12 }}>
      <p className="cc-track__eyebrow">
        <span className="cc-track__live" aria-hidden />
        Live tracking
      </p>
      <h1 className="cc-track__title">Track your order</h1>
      <p className="cc-track__lede" style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5, color: "#6B7280" }}>
        Enter your PostEx or Run Courier tracking number below. Need help? WhatsApp{" "}
        <a href="https://wa.me/923284010007" style={{ color: "#C41E1E", fontWeight: 600 }}>
          03284010007
        </a>
        .
      </p>
    </div>
  );
}

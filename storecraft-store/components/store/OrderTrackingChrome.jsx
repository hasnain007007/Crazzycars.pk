/**
 * Server-rendered track-order title chrome — always emits one H1 for crawlers.
 */
export function OrderTrackingChrome() {
  return (
    <div className="cc-track__top-copy" style={{ marginBottom: 12 }}>
      <p className="cc-track__eyebrow">
        <span className="cc-track__live" aria-hidden />
        Live Postex
      </p>
      <h1 className="cc-track__title">Track order</h1>
    </div>
  );
}

/**
 * Courier in one card: parcels moved in the window, then how settled parcels ended.
 * Ratios use settled outcomes only (delivered + returned).
 */
function pct(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return `${Number(n).toLocaleString("en-PK", { maximumFractionDigits: 1 })}%`;
}

function formatCount(n) {
  return (Number(n) || 0).toLocaleString("en-PK");
}

export function CourierCard({ data }) {
  const delivered = Number(data?.ordersDelivered) || 0;
  const returned = Number(data?.ordersReturned) || 0;
  const settled = delivered + returned;
  const stuck = Number(data?.stuckShipped) || 0;
  const dPct = settled > 0 ? (delivered / settled) * 100 : 0;

  const tiles = [
    { label: "Orders", value: data?.ordersReceived, color: "var(--text-primary)" },
    { label: "Dispatched", value: data?.ordersDispatched, color: "#085041" },
    { label: "Delivered", value: delivered, color: "#0C5132" },
    { label: "Returned", value: returned, color: "#7A2E0B" },
  ];

  return (
    <div className="rounded-xl border border-border-hairline bg-bg-panel p-5 shadow-none" data-card="courier">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Courier
        </h3>
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {data?.range?.label}
        </span>
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Parcels dispatched, delivered or returned in this period
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-border-hairline px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              {t.label}
            </p>
            <p className="font-gauge mt-1 text-2xl font-bold tabular-nums" style={{ color: t.color }}>
              {formatCount(t.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
        <span>
          Delivered <strong style={{ color: "#0C5132" }}>{pct(data?.deliveryRatio)}</strong>
        </span>
        <span>
          Returned <strong style={{ color: "#7A2E0B" }}>{pct(data?.returnRatio)}</strong>
        </span>
      </div>
      <div
        className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full"
        style={{ background: "color-mix(in srgb, var(--text-muted) 12%, transparent)" }}
        role="img"
        aria-label={`Delivered ${pct(data?.deliveryRatio)}, returned ${pct(data?.returnRatio)}`}
      >
        {settled > 0 ? (
          <>
            <div className="h-full" style={{ width: `${dPct}%`, background: "#008060" }} />
            <div className="h-full" style={{ width: `${100 - dPct}%`, background: "#E67E22" }} />
          </>
        ) : null}
      </div>

      {stuck > 0 ? (
        <p className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: "color-mix(in srgb, #E67E22 12%, transparent)", color: "#7A2E0B" }}>
          {formatCount(stuck)} parcels have shown &ldquo;shipped&rdquo; for over 10 days. Mark them delivered or
          returned so these numbers are right.
        </p>
      ) : null}
    </div>
  );
}

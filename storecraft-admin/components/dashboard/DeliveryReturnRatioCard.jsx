/**
 * Delivery vs return success rates for the selected dashboard range.
 * Ratios use settled courier outcomes only: delivered + returned.
 */
"use client";

function pct(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return `${Number(n).toLocaleString("en-PK", { maximumFractionDigits: 1 })}%`;
}

function formatCount(n) {
  return (Number(n) || 0).toLocaleString("en-PK");
}

export function DeliveryReturnRatioCard({ data }) {
  const delivered = Number(data?.ordersDelivered) || 0;
  const returned = Number(data?.ordersReturned) || 0;
  const settled = Number(data?.courierSettled) || delivered + returned;
  const deliveryRatio = data?.deliveryRatio;
  const returnRatio = data?.returnRatio;
  const rangeLabel = data?.range?.label || "this period";

  const dPct = settled > 0 ? (delivered / settled) * 100 : 0;
  const rPct = settled > 0 ? (returned / settled) * 100 : 0;

  return (
    <div
      className="rounded-xl border border-border-hairline bg-bg-panel p-5 shadow-none"
      data-card="delivery-return-ratio"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3
            className="text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--text-muted)" }}
          >
            Courier success
          </h3>
          <p className="mt-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Delivery vs return ratio
          </p>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
            Among delivered + returned in {rangeLabel}
          </p>
        </div>
        <p className="text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
          {formatCount(settled)} settled
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#0C5132" }}>
            Delivery ratio
          </p>
          <p className="font-gauge mt-1 text-3xl font-bold tabular-nums" style={{ color: "#0C5132" }}>
            {pct(deliveryRatio)}
          </p>
          <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
            {formatCount(delivered)} delivered
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#7A2E0B" }}>
            Return ratio
          </p>
          <p className="font-gauge mt-1 text-3xl font-bold tabular-nums" style={{ color: "#7A2E0B" }}>
            {pct(returnRatio)}
          </p>
          <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
            {formatCount(returned)} returned
          </p>
        </div>
      </div>

      {/* Portion bar */}
      <div
        className="mt-4 h-3 w-full overflow-hidden rounded-full"
        style={{ background: "color-mix(in srgb, var(--text-muted) 12%, transparent)" }}
        role="img"
        aria-label={`Delivery ${pct(deliveryRatio)}, return ${pct(returnRatio)}`}
      >
        {settled > 0 ? (
          <div className="flex h-full w-full">
            <div
              className="h-full transition-all"
              style={{ width: `${dPct}%`, background: "#008060" }}
              title={`Delivered ${pct(deliveryRatio)}`}
            />
            <div
              className="h-full transition-all"
              style={{ width: `${rPct}%`, background: "#E67E22" }}
              title={`Returned ${pct(returnRatio)}`}
            />
          </div>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-[11px]" style={{ color: "var(--text-muted)" }}>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#008060" }} />
          Delivered portion
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#E67E22" }} />
          Returned portion
        </span>
      </div>
    </div>
  );
}

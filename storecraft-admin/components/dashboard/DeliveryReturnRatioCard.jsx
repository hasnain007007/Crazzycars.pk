/**
 * Courier success — pick calendar days, then see dispatched / delivered / returned.
 * Ratios use settled outcomes only: delivered + returned.
 */
"use client";

import { useEffect, useState } from "react";

function pct(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return `${Number(n).toLocaleString("en-PK", { maximumFractionDigits: 1 })}%`;
}

function formatCount(n) {
  return (Number(n) || 0).toLocaleString("en-PK");
}

function isoToYmd(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // Display as Karachi calendar day (UTC+5)
  const pkt = new Date(d.getTime() + 5 * 60 * 60 * 1000);
  return pkt.toISOString().slice(0, 10);
}

function ymdLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DeliveryReturnRatioCard({ data, from, to, onRangeChange, loading }) {
  const dispatched = Number(data?.ordersDispatched) || 0;
  const delivered = Number(data?.ordersDelivered) || 0;
  const returned = Number(data?.ordersReturned) || 0;
  const settled = Number(data?.courierSettled) || delivered + returned;
  const deliveryRatio = data?.deliveryRatio;
  const returnRatio = data?.returnRatio;
  const rangeLabel = data?.range?.label || "this period";

  const rangeFromYmd = from || isoToYmd(data?.range?.from) || "";
  const rangeToYmd = to || isoToYmd(data?.range?.to) || "";

  const [draftFrom, setDraftFrom] = useState(rangeFromYmd);
  const [draftTo, setDraftTo] = useState(rangeToYmd);

  useEffect(() => {
    if (rangeFromYmd) setDraftFrom(rangeFromYmd);
    if (rangeToYmd) setDraftTo(rangeToYmd);
  }, [rangeFromYmd, rangeToYmd]);

  const dPct = settled > 0 ? (delivered / settled) * 100 : 0;
  const rPct = settled > 0 ? (returned / settled) * 100 : 0;

  const applyDates = () => {
    if (!draftFrom || !draftTo || typeof onRangeChange !== "function") return;
    onRangeChange({ rangeId: "custom", from: draftFrom, to: draftTo });
  };

  const applyPreset = (days) => {
    if (typeof onRangeChange !== "function") return;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    const nextFrom = ymdLocal(start);
    const nextTo = ymdLocal(end);
    setDraftFrom(nextFrom);
    setDraftTo(nextTo);
    onRangeChange({ rangeId: "custom", from: nextFrom, to: nextTo });
  };

  return (
    <div
      className="rounded-xl border border-border-hairline bg-bg-panel p-5 shadow-none"
      data-card="delivery-return-ratio"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            className="text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--text-muted)" }}
          >
            Courier success
          </h3>
          <p className="mt-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Dispatch · delivered · returned
          </p>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
            Counts for {rangeLabel}
          </p>
        </div>
        <p className="text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
          {formatCount(settled)} settled
        </p>
      </div>

      {/* Calendar range */}
      <div className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-border-hairline bg-bg-base/40 px-3 py-2.5">
        <label className="flex min-w-[7.5rem] flex-1 flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            From
          </span>
          <input
            type="date"
            value={draftFrom}
            disabled={loading}
            onChange={(e) => setDraftFrom(e.target.value)}
            className="h-9 rounded-lg border border-border-hairline bg-bg-panel px-2 text-sm outline-none focus:border-[var(--text-muted)]"
            style={{ color: "var(--text-primary)" }}
          />
        </label>
        <label className="flex min-w-[7.5rem] flex-1 flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            To
          </span>
          <input
            type="date"
            value={draftTo}
            disabled={loading}
            onChange={(e) => setDraftTo(e.target.value)}
            className="h-9 rounded-lg border border-border-hairline bg-bg-panel px-2 text-sm outline-none focus:border-[var(--text-muted)]"
            style={{ color: "var(--text-primary)" }}
          />
        </label>
        <button
          type="button"
          onClick={applyDates}
          disabled={loading || !draftFrom || !draftTo}
          className="h-9 rounded-lg px-3 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "#085041" }}
        >
          Apply
        </button>
        <div className="flex w-full flex-wrap gap-1.5 sm:w-auto">
          {[
            { label: "7d", days: 7 },
            { label: "30d", days: 30 },
            { label: "90d", days: 90 },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              disabled={loading}
              onClick={() => applyPreset(p.days)}
              className="h-8 rounded-md border border-border-hairline px-2 text-[11px] font-medium disabled:opacity-50"
              style={{ color: "var(--text-primary)" }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Parcel counts */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: "Dispatched", value: dispatched, color: "#085041" },
          { label: "Delivered", value: delivered, color: "#0C5132" },
          { label: "Returned", value: returned, color: "#7A2E0B" },
        ].map((row) => (
          <div key={row.label} className="rounded-lg border border-border-hairline px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              {row.label}
            </p>
            <p className="font-gauge mt-1 text-2xl font-bold tabular-nums" style={{ color: row.color }}>
              {formatCount(row.value)}
            </p>
          </div>
        ))}
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

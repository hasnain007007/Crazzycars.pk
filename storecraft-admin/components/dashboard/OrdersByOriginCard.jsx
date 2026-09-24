/**
 * Dashboard card — orders grouped by traffic origin for the selected range.
 */
"use client";

export function OrdersByOriginCard({ data, rangeLabel }) {
  const rows = Array.isArray(data?.ordersByOrigin) ? data.ordersByOrigin : [];
  const total = rows.reduce((s, r) => s + (Number(r.count) || 0), 0) || 0;

  return (
    <div className="rounded-xl border border-border-hairline bg-bg-panel p-5 shadow-none">
      <h3
        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--text-muted)" }}
      >
        Orders by origin ({rangeLabel || "period"})
      </h3>
      <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
        Last-non-direct click (falls back to first touch / Direct). New checkouts only —
        older orders show AI label when available.
      </p>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
          No attributed orders in this range yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {rows.map((row) => {
            const count = Number(row.count) || 0;
            const pct = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
            return (
              <li key={row.label || row.channel}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium" style={{ color: "var(--text-primary)" }}>
                    {row.label || "—"}
                  </span>
                  <span className="shrink-0 font-gauge tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {count.toLocaleString("en-PK")} · {pct}%
                  </span>
                </div>
                <div
                  className="mt-1 h-1.5 overflow-hidden rounded-full"
                  style={{ background: "var(--border-hairline)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      background: "var(--accent-line, #5B21B6)",
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

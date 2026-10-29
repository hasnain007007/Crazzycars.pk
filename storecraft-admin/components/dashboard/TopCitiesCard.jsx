/**
 * Where orders ship to — share of non-cancelled orders by city.
 */
import { formatAdminPrice } from "@/lib/currency";

export function TopCitiesCard({ cities, rangeLabel }) {
  const rows = cities || [];
  return (
    <div className="rounded-xl border border-border-hairline bg-bg-panel p-5 shadow-none">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Top cities
        </h3>
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {rangeLabel}
        </span>
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Share of orders by delivery city
      </p>
      {!rows.length ? (
        <p className="mt-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          No orders in this period
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((c) => (
            <li key={c.city}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate" style={{ color: "var(--text-primary)" }}>
                  {c.city}
                </span>
                <span className="shrink-0 font-gauge text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                  {c.orders} · {c.percent}%{c.booked != null ? ` · ${formatAdminPrice(c.booked)}` : ""}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--border-hairline)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, c.percent)}%`, background: "var(--accent-line)" }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

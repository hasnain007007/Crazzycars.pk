/**
 * Best sellers in the selected period — units first, then order value.
 */
import Link from "next/link";
import { formatAdminPrice } from "@/lib/currency";

export function TopProductsCard({ products, rangeLabel }) {
  const rows = products || [];
  const maxUnits = Math.max(1, ...rows.map((r) => Number(r.units) || 0));
  return (
    <div className="rounded-xl border border-border-hairline bg-bg-panel p-5 shadow-none">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Top products
        </h3>
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {rangeLabel}
        </span>
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Units sold (cancelled &amp; returned not counted)
      </p>
      {!rows.length ? (
        <p className="mt-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          No sales in this period
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {rows.map((p, i) => (
            <li key={p.id || p.name}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-4 shrink-0 text-right font-gauge text-xs" style={{ color: "var(--text-muted)" }}>
                    {i + 1}
                  </span>
                  {p.id ? (
                    <Link href={`/catalog/products/${p.id}`} className="truncate hover:underline" style={{ color: "var(--text-primary)" }}>
                      {p.name}
                    </Link>
                  ) : (
                    <span className="truncate" style={{ color: "var(--text-primary)" }}>
                      {p.name}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-gauge text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                  {p.units} pcs{p.revenue != null ? ` · ${formatAdminPrice(p.revenue)}` : ""}
                </span>
              </div>
              <div className="ml-6 mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--border-hairline)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(p.units / maxUnits) * 100}%`, background: "var(--accent-money)" }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

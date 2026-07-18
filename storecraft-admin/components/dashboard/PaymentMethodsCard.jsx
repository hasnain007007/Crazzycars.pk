/**
 * Payment method mix — horizontal bars.
 */
const BAR_COLORS = {
  cod: "#1A7A4C",
  jazzcash: "#E8913A",
  easypaisa: "#2D9B63",
  bank: "#64748b",
  card: "#0F766E",
  paypal: "#1d6fb8",
  other: "#94a3b8",
};

export function PaymentMethodsCard({ methods }) {
  const rows = methods || [];
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Payment methods</h3>
      <p className="text-xs text-slate-400">Share of orders in period</p>
      {!rows.length ? (
        <p className="mt-8 text-center text-sm text-slate-400">No payment data yet</p>
      ) : (
        <ul className="mt-4 space-y-3.5">
          {rows.map((m) => (
            <li key={m.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-200">{m.label}</span>
                <span className="tabular-nums font-semibold text-slate-900 dark:text-white">
                  {m.percent}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(2, m.percent))}%`,
                    background: BAR_COLORS[m.key] || BAR_COLORS.other,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

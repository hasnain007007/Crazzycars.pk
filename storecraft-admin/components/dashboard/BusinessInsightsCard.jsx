export function BusinessInsightsCard({ insights }) {
  const rows = insights || [];
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Business insights</h3>
      <p className="text-xs text-slate-400">Auto tips from your orders</p>
      <ul className="mt-4 space-y-3">
        {rows.map((item, i) => (
          <li key={i} className="flex gap-3 text-sm leading-snug text-slate-700 dark:text-slate-200">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              ⚡
            </span>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

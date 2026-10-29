/**
 * Things to act on, most urgent first (built in /api/dashboard).
 */
const TONES = {
  alert: { icon: "!", bg: "bg-red-50 text-red-700" },
  action: { icon: "→", bg: "bg-amber-50 text-amber-700" },
  info: { icon: "i", bg: "bg-slate-100 text-slate-600" },
};

export function BusinessInsightsCard({ insights }) {
  const rows = insights || [];
  return (
    <div className="rounded-xl border border-border-hairline bg-bg-panel p-5 shadow-none">
      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        Needs attention
      </h3>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Checked from your orders, stock and visitors
      </p>
      <ul className="mt-4 space-y-3">
        {rows.map((item, i) => {
          const tone = TONES[item.tone] || TONES.info;
          return (
            <li key={i} className="flex gap-3 text-sm leading-snug" style={{ color: "var(--text-primary)" }}>
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tone.bg}`}
                aria-hidden
              >
                {tone.icon}
              </span>
              <span>{item.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

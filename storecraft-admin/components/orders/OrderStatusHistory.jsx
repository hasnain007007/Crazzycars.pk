/**
 * Vertical timeline for order status history (legacy statusHistory).
 */
"use client";

function formatWhen(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export function OrderStatusHistory({ entries, title = "Status history" }) {
  const list = [...(entries || [])].sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));

  if (!list.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        No status changes recorded yet.
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <ul className="relative space-y-0 pl-1">
        <span className="absolute bottom-2 left-[7px] top-2 w-px bg-slate-200 dark:bg-slate-700" aria-hidden />
        {list.map((e, i) => (
          <li key={e.id || i} className="relative flex gap-3 pb-6 last:pb-0">
            <span className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#1d6fb8] ring-4 ring-white dark:ring-slate-900" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold capitalize text-slate-900 dark:text-white">{e.status}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                By {e.changedBy || "System"} · {formatWhen(e.changedAt)}
              </p>
              {e.note ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{e.note}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

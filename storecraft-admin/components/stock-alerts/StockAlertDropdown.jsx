/**
 * Topbar dropdown listing a few low / out-of-stock products.
 */
"use client";

import Link from "next/link";

export function StockAlertDropdown({ open, onClose, data }) {
  if (!open) return null;
  const total = data?.total ?? 0;
  const preview = Array.isArray(data?.preview) ? data.preview : [];

  return (
    <>
      <button type="button" className="fixed inset-0 z-30 cursor-default" aria-hidden onClick={onClose} />
      <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Stock alerts ({total})</p>
        </div>
        <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
          {preview.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-slate-500">No active stock alerts.</li>
          ) : (
            preview.map((item) => (
              <li key={item.id} className="flex items-center gap-2 px-3 py-2">
                <span
                  className={[
                    "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                    item.alertType === "out" ? "bg-red-500" : "bg-amber-400",
                  ].join(" ")}
                  title={item.alertType === "out" ? "Out of stock" : "Low stock"}
                />
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin arbitrary CDN URLs
                    <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[10px] text-slate-400">—</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{item.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="tabular-nums">{item.quantity}</span> units left
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
        <div className="border-t border-slate-100 p-2 dark:border-slate-800">
          <Link
            href="/reports/stock"
            className="block rounded-lg px-2 py-2 text-center text-sm font-medium text-[#1d6fb8] hover:bg-slate-50 dark:hover:bg-slate-800"
            onClick={onClose}
          >
            View all stock alerts
          </Link>
        </div>
      </div>
    </>
  );
}

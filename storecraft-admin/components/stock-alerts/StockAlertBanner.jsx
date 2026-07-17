/**
 * Dashboard banner when any products are low or out of stock (dismissible per session).
 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const SESSION_KEY = "sialkot_stock_banner_dismissed";

function countPhrase(n, singular, plural) {
  if (n === 0) return null;
  return `${n} ${n === 1 ? singular : plural}`;
}

export function StockAlertBanner({ lowStockProducts = [] }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        if (sessionStorage.getItem(SESSION_KEY) === "1") setDismissed(true);
      } catch {
        /* ignore */
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const outCount = lowStockProducts.filter((p) => (p.quantity ?? 0) <= 0).length;
  const lowCount = lowStockProducts.filter((p) => (p.quantity ?? 0) > 0).length;
  const total = outCount + lowCount;

  if (!total || dismissed) return null;

  const parts = [
    countPhrase(lowCount, "product is low on stock", "products are low on stock"),
    countPhrase(outCount, "product is out of stock", "products are out of stock"),
  ].filter(Boolean);

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <span className="text-xl leading-none" aria-hidden>
          ⚠
        </span>
        <p className="text-sm font-medium">{parts.join(", ")}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Link
          href="/reports/stock"
          className="inline-flex rounded-md bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
        >
          View Stock Report
        </Link>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem(SESSION_KEY, "1");
            } catch {
              /* ignore */
            }
            setDismissed(true);
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-100 dark:hover:bg-amber-900/50"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

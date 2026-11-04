"use client";

import { useRouter } from "next/navigation";

/**
 * Segmented Prev | Next control for admin detail pages.
 * @param {{
 *   prev?: { id: string, name?: string } | null,
 *   next?: { id: string, name?: string } | null,
 *   hrefForId: (id: string) => string,
 *   className?: string,
 * }} props
 */
export function NeighborNav({ prev = null, next = null, hrefForId, className = "" }) {
  const router = useRouter();
  if (typeof hrefForId !== "function") return null;

  return (
    <div
      className={`inline-flex shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-slate-500 dark:bg-slate-800 ${className}`}
      role="group"
      aria-label="Previous or next item"
    >
      <button
        type="button"
        disabled={!prev?.id}
        title={prev?.name ? String(prev.name) : "No previous item"}
        aria-label={prev?.name ? `Previous: ${prev.name}` : "No previous item"}
        onClick={() => prev?.id && router.push(hrefForId(prev.id))}
        className="flex h-9 min-w-[3.75rem] items-center justify-center gap-1 border-r border-slate-300 px-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-500 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
            clipRule="evenodd"
          />
        </svg>
        Prev
      </button>
      <button
        type="button"
        disabled={!next?.id}
        title={next?.name ? String(next.name) : "No next item"}
        aria-label={next?.name ? `Next: ${next.name}` : "No next item"}
        onClick={() => next?.id && router.push(hrefForId(next.id))}
        className="flex h-9 min-w-[3.75rem] items-center justify-center gap-1 px-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        Next
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}

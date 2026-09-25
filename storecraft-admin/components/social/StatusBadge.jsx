"use client";

import { STATUS_STYLES, normalizeStatus } from "./socialTheme";

export function StatusBadge({ status, className = "" }) {
  const key = normalizeStatus(status);
  const style = STATUS_STYLES[key] || STATUS_STYLES.draft;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${className}`}
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {style.label}
    </span>
  );
}

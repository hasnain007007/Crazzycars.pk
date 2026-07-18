/**
 * Dashboard date-range presets (UTC day boundaries).
 */

export const DASHBOARD_RANGES = [
  { id: "today", label: "Today" },
  { id: "last7", label: "Last 7 days" },
  { id: "last30", label: "Last 30 days" },
  { id: "lastMonth", label: "Last month" },
  { id: "last3Months", label: "Last 3 months" },
  { id: "thisYear", label: "This year" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom" },
];

function utcStartOfDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function utcEndOfDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function parseYmd(s) {
  const m = String(s || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo || dt.getUTCDate() !== d) return null;
  return dt;
}

/**
 * Resolve range id (+ optional custom from/to) → { from, to, label, id }
 * `from`/`to` null means unbounded (all time).
 */
export function resolveDashboardRange(rangeId, customFrom, customTo, now = new Date()) {
  const id = String(rangeId || "last30").trim();
  const todayStart = utcStartOfDay(now);
  const todayEnd = utcEndOfDay(now);

  if (id === "all") {
    return { id: "all", label: "All time", from: null, to: null };
  }

  if (id === "today") {
    return { id: "today", label: "Today", from: todayStart, to: todayEnd };
  }

  if (id === "last7") {
    const from = new Date(todayStart);
    from.setUTCDate(from.getUTCDate() - 6);
    return { id: "last7", label: "Last 7 days", from, to: todayEnd };
  }

  if (id === "last30") {
    const from = new Date(todayStart);
    from.setUTCDate(from.getUTCDate() - 29);
    return { id: "last30", label: "Last 30 days", from, to: todayEnd };
  }

  if (id === "lastMonth") {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const from = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const to = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    return {
      id: "lastMonth",
      label: from.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
      from,
      to,
    };
  }

  if (id === "last3Months") {
    const from = new Date(todayStart);
    from.setUTCMonth(from.getUTCMonth() - 3);
    return { id: "last3Months", label: "Last 3 months", from, to: todayEnd };
  }

  if (id === "thisYear") {
    const from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
    return { id: "thisYear", label: "This year", from, to: todayEnd };
  }

  // custom
  let from = parseYmd(customFrom);
  let to = parseYmd(customTo);
  if (!from && !to) {
    const fallback = new Date(todayStart);
    fallback.setUTCDate(fallback.getUTCDate() - 29);
    return { id: "custom", label: "Custom", from: fallback, to: todayEnd };
  }
  if (from) from = utcStartOfDay(from);
  if (to) to = utcEndOfDay(to);
  if (from && to && from > to) {
    const tmp = from;
    from = utcStartOfDay(to);
    to = utcEndOfDay(tmp);
  }
  const labelFrom = from ? from.toISOString().slice(0, 10) : "…";
  const labelTo = to ? to.toISOString().slice(0, 10) : "…";
  return { id: "custom", label: `${labelFrom} → ${labelTo}`, from: from || null, to: to || null };
}

export function formatYmdUtc(d) {
  return d.toISOString().slice(0, 10);
}

/** Build daily (or weekly) buckets between from/to for chart. */
export function buildChartBuckets(from, to, maxPoints = 62) {
  if (!from || !to) return { mode: "day", buckets: [] };
  const start = utcStartOfDay(from);
  const end = utcStartOfDay(to);
  const dayMs = 86_400_000;
  const days = Math.max(1, Math.round((end - start) / dayMs) + 1);
  const mode = days > maxPoints ? "week" : "day";
  const buckets = [];

  if (mode === "day") {
    for (let i = 0; i < days; i += 1) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      buckets.push({
        key: formatYmdUtc(d),
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
        from: utcStartOfDay(d),
        to: utcEndOfDay(d),
      });
    }
  } else {
    let cursor = new Date(start);
    while (cursor <= end) {
      const weekStart = new Date(cursor);
      const weekEnd = new Date(cursor);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
      if (weekEnd > end) weekEnd.setTime(end.getTime());
      buckets.push({
        key: formatYmdUtc(weekStart),
        label: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
        from: utcStartOfDay(weekStart),
        to: utcEndOfDay(weekEnd),
      });
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }
  }

  return { mode, buckets };
}

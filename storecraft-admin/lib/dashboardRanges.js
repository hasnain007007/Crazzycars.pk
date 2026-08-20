/**
 * Dashboard date-range presets using Asia/Karachi day boundaries
 * (matches "Today's Sales" / Monthly Revenue KPIs).
 */
import { karachiDayBounds, karachiDayKey, shiftDayKey } from "@/lib/karachiDay";

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

const TZ = "Asia/Karachi";

function parseYmd(s) {
  const m = String(s || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * Resolve range id (+ optional custom from/to) → { from, to, label, id }
 * `from`/`to` null means unbounded (all time).
 */
export function resolveDashboardRange(rangeId, customFrom, customTo, now = new Date()) {
  const id = String(rangeId || "last30").trim();
  const todayKey = karachiDayKey(now);
  const { start: todayStart, end: todayEnd } = karachiDayBounds(todayKey);

  if (id === "all") {
    return { id: "all", label: "All time", from: null, to: null };
  }

  if (id === "today") {
    return { id: "today", label: "Today", from: todayStart, to: todayEnd };
  }

  if (id === "last7") {
    const { start: from } = karachiDayBounds(shiftDayKey(todayKey, -6));
    return { id: "last7", label: "Last 7 days", from, to: todayEnd };
  }

  if (id === "last30") {
    const { start: from } = karachiDayBounds(shiftDayKey(todayKey, -29));
    return { id: "last30", label: "Last 30 days", from, to: todayEnd };
  }

  if (id === "lastMonth") {
    const [ty, tm] = todayKey.split("-").map(Number);
    const prev = tm === 1 ? { y: ty - 1, m: 12 } : { y: ty, m: tm - 1 };
    const fromKey = `${prev.y}-${String(prev.m).padStart(2, "0")}-01`;
    const { start: from } = karachiDayBounds(fromKey);
    const monthStartThis = new Date(`${ty}-${String(tm).padStart(2, "0")}-01T00:00:00+05:00`);
    const to = new Date(monthStartThis.getTime() - 1);
    return {
      id: "lastMonth",
      label: from.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: TZ }),
      from,
      to,
    };
  }

  if (id === "last3Months") {
    const { start: from } = karachiDayBounds(shiftDayKey(todayKey, -89));
    return { id: "last3Months", label: "Last 3 months", from, to: todayEnd };
  }

  if (id === "thisYear") {
    const [ty] = todayKey.split("-").map(Number);
    const { start: from } = karachiDayBounds(`${ty}-01-01`);
    return { id: "thisYear", label: "This year", from, to: todayEnd };
  }

  // custom — interpret YYYY-MM-DD as Karachi calendar days
  let fromKey = parseYmd(customFrom);
  let toKey = parseYmd(customTo);
  if (!fromKey && !toKey) {
    fromKey = shiftDayKey(todayKey, -29);
    toKey = todayKey;
  }
  if (fromKey && toKey && fromKey > toKey) {
    const tmp = fromKey;
    fromKey = toKey;
    toKey = tmp;
  }
  const from = fromKey ? karachiDayBounds(fromKey).start : null;
  const to = toKey ? karachiDayBounds(toKey).end : null;
  const labelFrom = fromKey || "…";
  const labelTo = toKey || "…";
  return { id: "custom", label: `${labelFrom} → ${labelTo}`, from, to };
}

/** @deprecated use formatYmdKarachi — kept for callers */
export function formatYmdUtc(d) {
  return formatYmdKarachi(d);
}

export function formatYmdKarachi(d) {
  return karachiDayKey(d instanceof Date ? d : new Date(d));
}

/** Build daily (or weekly) buckets between from/to for chart (Karachi days). */
export function buildChartBuckets(from, to, maxPoints = 62) {
  if (!from || !to) return { mode: "day", buckets: [] };
  const startKey = karachiDayKey(from);
  const endKey = karachiDayKey(to);
  let days = 0;
  for (let key = startKey; key <= endKey; key = shiftDayKey(key, 1)) {
    days += 1;
    if (days > 400) break;
  }
  const mode = days > maxPoints ? "week" : "day";
  const buckets = [];

  if (mode === "day") {
    for (let key = startKey; key <= endKey; key = shiftDayKey(key, 1)) {
      const { start, end } = karachiDayBounds(key);
      buckets.push({
        key,
        label: start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: TZ }),
        from: start,
        to: end,
      });
    }
  } else {
    let key = startKey;
    while (key <= endKey) {
      const weekStartKey = key;
      const weekEndKey = shiftDayKey(key, 6) > endKey ? endKey : shiftDayKey(key, 6);
      const { start } = karachiDayBounds(weekStartKey);
      const { end } = karachiDayBounds(weekEndKey);
      buckets.push({
        key: weekStartKey,
        label: start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: TZ }),
        from: start,
        to: end,
      });
      key = shiftDayKey(weekEndKey, 1);
    }
  }

  return { mode, buckets };
}

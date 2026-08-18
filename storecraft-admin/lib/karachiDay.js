/** Asia/Karachi calendar helpers for visitor / ops "today" windows. */

export function karachiDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function karachiDayBounds(dayKey = karachiDayKey()) {
  const start = new Date(`${dayKey}T00:00:00+05:00`);
  const end = new Date(`${dayKey}T23:59:59.999+05:00`);
  return { dayKey, start, end };
}

export function shiftDayKey(dayKey, deltaDays) {
  const base = new Date(`${dayKey}T12:00:00+05:00`);
  base.setTime(base.getTime() + deltaDays * 24 * 60 * 60 * 1000);
  return karachiDayKey(base);
}

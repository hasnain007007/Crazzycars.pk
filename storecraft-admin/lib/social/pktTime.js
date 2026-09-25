/**
 * Asia/Karachi (PKT) helpers for social calendar + sheet import.
 */

export const SOCIAL_TZ = "Asia/Karachi";

/** Monday 00:00:00 PKT as UTC Date for the week containing `date`. */
export function weekStartPkt(date = new Date()) {
  const d = toPktParts(date);
  // JS: 0=Sun … 6=Sat → Monday-based offset
  const day = d.weekday; // 1=Mon … 7=Sun (ISO)
  const mondayOffset = day - 1;
  return pktLocalToUtc(d.year, d.month, d.day - mondayOffset, 0, 0, 0);
}

export function toPktParts(date) {
  const d = date instanceof Date ? date : new Date(date);
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: SOCIAL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
  const weekdayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second || 0),
    weekday: weekdayMap[parts.weekday] || 1,
  };
}

/**
 * Interpret a local PKT wall-clock as a UTC Date.
 * Uses a short binary search against Intl so DST/offset stays correct.
 */
export function pktLocalToUtc(year, month, day, hour = 0, minute = 0, second = 0) {
  // Rough guess: PKT is UTC+5
  let guess = Date.UTC(year, month - 1, day, hour - 5, minute, second);
  for (let i = 0; i < 3; i++) {
    const p = toPktParts(new Date(guess));
    const want = Date.UTC(year, month - 1, day, hour, minute, second);
    const got = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    guess += want - got;
  }
  return new Date(guess);
}

/** Parse YYYY-MM-DD + HH:MM as PKT → UTC Date. */
export function parsePktDateTime(dateStr, timeStr) {
  const d = String(dateStr || "").trim();
  const t = String(timeStr || "00:00").trim();
  let y;
  let m;
  let day;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    [y, m, day] = d.split("-").map(Number);
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d)) {
    const [dd, mm, yyyy] = d.split("/").map(Number);
    y = yyyy;
    m = mm;
    day = dd;
  } else {
    throw new Error(`Bad date: ${d}`);
  }
  const tm = parseTimeToHm(t);
  return pktLocalToUtc(y, m, day, tm.hour, tm.minute, 0);
}

export function parseTimeToHm(raw) {
  const s = String(raw || "").trim();
  // Excel fraction 0–1
  if (/^\d+(\.\d+)?$/.test(s) && Number(s) < 1) {
    const total = Math.round(Number(s) * 24 * 60);
    return { hour: Math.floor(total / 60) % 24, minute: total % 60 };
  }
  const ampm = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = Number(ampm[1]);
    const min = Number(ampm[2]);
    const ap = ampm[3].toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return { hour: h, minute: min };
  }
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return { hour: Number(m24[1]), minute: Number(m24[2]) };
  throw new Error(`Bad time: ${s}`);
}

/** Excel serial date → { y, m, d } (UTC-based serial, date only). */
export function excelSerialToYmd(serial) {
  const n = Number(serial);
  if (!Number.isFinite(n)) throw new Error("Bad Excel date");
  // Excel epoch 1899-12-30
  const utc = new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 86400000);
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

export function formatPkt(date, opts = {}) {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: SOCIAL_TZ,
    ...opts,
  }).format(d);
}

export function formatPktLabel(date) {
  return formatPkt(date, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

export function addDaysUtc(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

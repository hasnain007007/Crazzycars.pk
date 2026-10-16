/**
 * Contact / LocalBusiness hours from admin Settings → contactPage.hours only.
 * Never invent Mon–Sat 10–18; schema omits days that are closed.
 */

const DAY_ALIASES = {
  mon: "Monday",
  monday: "Monday",
  tue: "Tuesday",
  tues: "Tuesday",
  tuesday: "Tuesday",
  wed: "Wednesday",
  wednesday: "Wednesday",
  thu: "Thursday",
  thur: "Thursday",
  thurs: "Thursday",
  thursday: "Thursday",
  fri: "Friday",
  friday: "Friday",
  sat: "Saturday",
  saturday: "Saturday",
  sun: "Sunday",
  sunday: "Sunday",
};

const WEEKDAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/**
 * @param {string} raw e.g. "9am", "9:00 AM", "21:00"
 * @returns {string | null} HH:mm 24h
 */
export function parseClockToHHmm(raw) {
  const s = String(raw || "").trim().toLowerCase().replace(/\s*pkt\s*$/i, "").trim();
  if (!s) return null;
  const m12 = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)$/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = m12[2] != null ? parseInt(m12[2], 10) : 0;
    const ap = m12[3].replace(/\./g, "").toLowerCase();
    if (ap.startsWith("p") && h < 12) h += 12;
    if (ap.startsWith("a") && h === 12) h = 0;
    if (h > 23 || min > 59) return null;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = parseInt(m24[1], 10);
    const min = parseInt(m24[2], 10);
    if (h > 23 || min > 59) return null;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  return null;
}

function expandDayRange(fromLabel, toLabel) {
  const from = DAY_ALIASES[String(fromLabel || "").toLowerCase()];
  const to = DAY_ALIASES[String(toLabel || "").toLowerCase()];
  if (!from || !to) return from ? [from] : [];
  const a = WEEKDAY_ORDER.indexOf(from);
  const b = WEEKDAY_ORDER.indexOf(to);
  if (a < 0 || b < 0) return [];
  if (a <= b) return WEEKDAY_ORDER.slice(a, b + 1);
  return [...WEEKDAY_ORDER.slice(a), ...WEEKDAY_ORDER.slice(0, b + 1)];
}

/**
 * Parse "Monday - Saturday: 9am - 9pm PKT" → { days, opens, closes }.
 * @param {string} line
 */
export function parseWeekdayHoursLine(line) {
  const raw = String(line || "").trim();
  if (!raw) return null;
  const m = raw.match(
    /^([A-Za-z]+)(?:\s*[-–—]\s*([A-Za-z]+))?\s*:\s*(.+)$/
  );
  if (!m) return null;
  const days = m[2] ? expandDayRange(m[1], m[2]) : expandDayRange(m[1], m[1]);
  if (!days.length) return null;
  const timePart = m[3].replace(/\bPKT\b/gi, "").trim();
  const tm = timePart.match(
    /(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)|\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)|\d{1,2}:\d{2})/i
  );
  if (!tm) return null;
  const opens = parseClockToHHmm(tm[1]);
  const closes = parseClockToHHmm(tm[2]);
  if (!opens || !closes) return null;
  return { dayOfWeek: days, opens, closes };
}

/**
 * @param {{ weekdays?: string, weekend?: string, closed?: string } | null | undefined} hours
 */
export function resolveContactHourLines(hours) {
  const h = hours && typeof hours === "object" ? hours : {};
  const weekdays = String(h.weekdays || "").trim();
  const weekendRaw = String(h.weekend || "").trim();
  const closedRaw = String(h.closed || "").trim();
  let sundayLine = "";
  if (/sunday/i.test(weekendRaw)) sundayLine = weekendRaw;
  else if (/sunday/i.test(closedRaw)) sundayLine = closedRaw;
  else if (weekendRaw) sundayLine = weekendRaw;
  else if (closedRaw) sundayLine = closedRaw;
  else if (weekdays) sundayLine = "Sunday: Closed";

  return [weekdays, sundayLine].filter(Boolean);
}

/**
 * Schema.org OpeningHoursSpecification[] from admin contactPage.hours.
 * Closed days are omitted (not emitted as 00:00–00:00).
 * @param {{ weekdays?: string, weekend?: string, closed?: string } | null | undefined} hours
 */
export function contactHoursToOpeningHoursSpec(hours) {
  const h = hours && typeof hours === "object" ? hours : {};
  const nodes = [];
  const weekdays = String(h.weekdays || "").trim();
  const parsed = parseWeekdayHoursLine(weekdays);
  if (parsed) {
    nodes.push({
      dayOfWeek: parsed.dayOfWeek.filter((d) => d !== "Sunday"),
      opens: parsed.opens,
      closes: parsed.closes,
    });
  }
  // Optional Sunday open hours if admin set weekend to open times (rare).
  const weekend = String(h.weekend || "").trim();
  if (weekend && !/closed/i.test(weekend)) {
    const sun = parseWeekdayHoursLine(
      /sunday/i.test(weekend) ? weekend : `Sunday: ${weekend}`
    );
    if (sun) nodes.push(sun);
  }
  return nodes.filter((n) => n.dayOfWeek?.length && n.opens && n.closes);
}

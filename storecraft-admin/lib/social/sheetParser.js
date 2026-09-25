/**
 * Parse weekly social sheet (XLSX / CSV) into normalised rows.
 */
import * as XLSX from "xlsx";
import { excelSerialToYmd, parsePktDateTime, parseTimeToHm } from "@/lib/social/pktTime";
import { normalizeHashtagList } from "@/lib/social/captions";

const REQUIRED = ["post_code", "date", "time", "platforms", "headline", "caption"];

const HEADER_ALIASES = {
  post_code: "post_code",
  postcode: "post_code",
  "post code": "post_code",
  date: "date",
  time: "time",
  platforms: "platforms",
  platform: "platforms",
  post_type: "post_type",
  posttype: "post_type",
  product_url: "product_url",
  producturl: "product_url",
  product: "product_url",
  headline: "headline",
  title: "headline",
  caption: "caption",
  caption_tiktok: "caption_tiktok",
  captiontiktok: "caption_tiktok",
  hashtags: "hashtags",
  first_comment: "first_comment",
  firstcomment: "first_comment",
  add_footer: "add_footer",
  addfooter: "add_footer",
  status: "status",
  notes: "notes",
};

function normHeader(h) {
  const key = String(h || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return HEADER_ALIASES[key] || HEADER_ALIASES[key.replace(/ /g, "_")] || key.replace(/ /g, "_");
}

function cellStr(v) {
  if (v == null || v === "") return "";
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function parseDateCell(v) {
  if (v == null || v === "") throw new Error("Date is missing");
  if (v instanceof Date) {
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(v.getUTCDate()).padStart(2, "0")}`;
  }
  if (typeof v === "number") {
    const { year, month, day } = excelSerialToYmd(v);
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split("/");
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  // Excel serial as string
  if (/^\d+(\.\d+)?$/.test(s) && Number(s) > 20000) {
    const { year, month, day } = excelSerialToYmd(Number(s));
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  throw new Error(`Bad date: ${s}`);
}

function parseTimeCell(v) {
  if (v == null || v === "") throw new Error("Time is missing");
  if (typeof v === "number") {
    const { hour, minute } = parseTimeToHm(String(v));
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
  if (v instanceof Date) {
    return `${String(v.getUTCHours()).padStart(2, "0")}:${String(v.getUTCMinutes()).padStart(2, "0")}`;
  }
  const { hour, minute } = parseTimeToHm(String(v).trim());
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parsePlatforms(raw) {
  const parts = String(raw || "")
    .toLowerCase()
    .split(/[,|/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [];
  for (const p of parts) {
    if (p === "fb" || p === "facebook") out.push("fb");
    else if (p === "ig" || p === "instagram") out.push("ig");
    else if (p === "tiktok" || p === "tt") out.push("tiktok");
  }
  return [...new Set(out)];
}

function parseYesNo(raw, defaultYes = true) {
  if (raw == null || String(raw).trim() === "") return defaultYes;
  const s = String(raw).trim().toLowerCase();
  if (["no", "n", "false", "0", "off"].includes(s)) return false;
  if (["yes", "y", "true", "1", "on"].includes(s)) return true;
  return defaultYes;
}

function findHeaderRow(matrix) {
  for (let i = 0; i < Math.min(matrix.length, 40); i++) {
    const mapped = (matrix[i] || []).map(normHeader);
    if (mapped.includes("post_code") && mapped.includes("caption")) return i;
  }
  return null;
}

/**
 * @param {Buffer} buffer
 * @param {string} filename
 * @returns {{ rows: object[], warnings: string[], sheetName: string }}
 */
export function parseWeekSheet(buffer, filename = "sheet.xlsx") {
  const warnings = [];
  const name = String(filename || "").toLowerCase();
  let workbook;
  if (name.endsWith(".csv")) {
    const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
    workbook = XLSX.read(text, { type: "string", raw: false, cellDates: true });
  } else {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: false });
  }

  // Prefer "Week Posts" sheet; else first sheet that has a post_code header row
  let sheetName = workbook.SheetNames.find((n) => /week\s*posts/i.test(n));
  let sheet = sheetName ? workbook.Sheets[sheetName] : null;
  let matrix = sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true }) : [];

  if (!matrix.length || findHeaderRow(matrix) == null) {
    for (const n of workbook.SheetNames) {
      const s = workbook.Sheets[n];
      const m = XLSX.utils.sheet_to_json(s, { header: 1, defval: "", raw: true });
      if (findHeaderRow(m) != null) {
        sheetName = n;
        sheet = s;
        matrix = m;
        break;
      }
    }
  }
  if (!sheetName || !matrix.length) throw new Error("Sheet is empty");

  const headerIdx = findHeaderRow(matrix);
  if (headerIdx == null) {
    throw new Error("Could not find a header row with post_code / date / caption columns");
  }
  const headerRow = (matrix[headerIdx] || []).map(normHeader);
  const known = new Set(Object.values(HEADER_ALIASES));
  headerRow.forEach((h, i) => {
    if (h && !known.has(h) && !REQUIRED.includes(h)) {
      warnings.push(`Unknown column "${matrix[headerIdx][i]}" ignored`);
    }
  });

  const rows = [];
  const seenCodes = new Set();

  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const line = matrix[r];
    if (!line || !line.some((c) => cellStr(c))) continue;

    const obj = {};
    headerRow.forEach((h, i) => {
      if (h) obj[h] = line[i];
    });

    const errors = [];
    const rowWarnings = [];
    const rowNo = r + 1;

    let postCode = cellStr(obj.post_code).toUpperCase();
    if (!postCode) errors.push("post_code is required");
    else if (!/^[A-Z0-9-]+$/.test(postCode)) errors.push("post_code must be A-Z, 0-9, or -");
    else if (seenCodes.has(postCode)) errors.push(`Duplicate post_code ${postCode}`);
    else seenCodes.add(postCode);

    let dateStr = "";
    let timeStr = "";
    let scheduledAt = null;
    try {
      dateStr = parseDateCell(obj.date);
    } catch (e) {
      errors.push(e.message || "Bad date");
    }
    try {
      timeStr = parseTimeCell(obj.time);
    } catch (e) {
      errors.push(e.message || "Bad time");
    }
    if (dateStr && timeStr) {
      try {
        scheduledAt = parsePktDateTime(dateStr, timeStr);
        if (scheduledAt.getTime() < Date.now() - 60_000) {
          errors.push("Time is in the past");
        }
      } catch (e) {
        errors.push(e.message || "Bad date/time");
      }
    }

    const platforms = parsePlatforms(obj.platforms);
    if (!platforms.length) errors.push("platforms is required (fb, ig, tiktok)");

    const headline = cellStr(obj.headline);
    if (!headline) errors.push("headline is required");
    else if (headline.length > 60) errors.push("headline must be ≤ 60 characters");

    const caption = cellStr(obj.caption);
    if (!caption) errors.push("caption is required");

    const hashtags = normalizeHashtagList(obj.hashtags);
    if (hashtags.length > 30) {
      rowWarnings.push("More than 30 hashtags — extras will be dropped");
    }

    const postType = String(obj.post_type || "")
      .trim()
      .toLowerCase();
    const statusRaw = String(obj.status || "SCHEDULED")
      .trim()
      .toUpperCase();
    const status = statusRaw === "DRAFT" ? "draft" : "scheduled";

    rows.push({
      rowNo,
      skip: false,
      errors,
      warnings: rowWarnings,
      data: {
        postCode,
        date: dateStr,
        time: timeStr,
        scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
        platforms,
        postType: postType === "single" ? "single" : "carousel",
        productUrl: cellStr(obj.product_url),
        headline: headline.slice(0, 60),
        caption,
        captionTiktok: cellStr(obj.caption_tiktok),
        hashtags,
        firstComment: cellStr(obj.first_comment),
        addFooter: parseYesNo(obj.add_footer, true),
        status,
        notes: cellStr(obj.notes),
      },
      images: [],
    });
  }

  return { rows, warnings, sheetName };
}

export { parsePlatforms, parseDateCell, parseTimeCell };

/**
 * Parse courier remittance Excel / CSV sheets (Run Courier, Leopard, PostEx exports).
 */
import * as XLSX from "xlsx";

function parseMoney(raw) {
  if (raw == null || raw === "") return 0;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  let s = String(raw).trim();
  if (!s) return 0;
  const neg = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[()\s]/g, "").replace(/,/g, "").replace(/Rs\.?/gi, "");
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return neg ? -Math.abs(n) : n;
}

function absMoney(raw) {
  return Math.abs(parseMoney(raw));
}

function normHeader(h) {
  return String(h || "")
    .toLowerCase()
    .replace(/[\s._\-/]+/g, " ")
    .trim();
}

function cellStr(v) {
  if (v == null) return "";
  if (v instanceof Date) {
    const d = v.getDate();
    const m = v.getMonth() + 1;
    const y = v.getFullYear();
    return `${d}/${m}/${y}`;
  }
  return String(v).trim();
}

/** Compact tracking token from a cell. */
function extractTracking(raw) {
  const s = cellStr(raw).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!s) return "";
  // Run Courier / Leopard
  const gw = s.match(/GW\d{8,}/);
  if (gw) return gw[0];
  // PostEx-style 14-digit starting with 2
  const pe = s.match(/2\d{13}/);
  if (pe) return pe[0];
  // Long numeric CN
  if (/^\d{10,}$/.test(s)) return s;
  // Generic prefix+digits
  if (/^[A-Z]{1,4}\d{8,}$/.test(s)) return s;
  return "";
}

function extractOrderNo(raw) {
  const s = cellStr(raw).toUpperCase();
  const m = s.match(/ORD-?\d{4}-?\d+/);
  if (!m) return "";
  return m[0].replace(/^ORD(\d)/, "ORD-$1").replace(/ORD-(\d{4})(\d+)/, "ORD-$1-$2");
}

function scoreHeader(h) {
  const n = normHeader(h);
  if (!n) return null;
  if (/(tracking|consign|awb|c\.?n\.?|cn number|parcel|barcode|waybill)/.test(n)) return "tracking";
  if (/(order\s*(no|number|#|id)|ord\s*no|reference|ref\s*no|shop\s*order)/.test(n)) return "order";
  if (/(status|state|result|delivery\s*status|parcel\s*status)/.test(n)) return "status";
  if (/(^cod$|cod\s*amount|collect|invoice\s*amount|product\s*amount|goods\s*value)/.test(n)) {
    return "cod";
  }
  if (/(shipping|freight|delivery\s*charge|courier\s*charge|portage)/.test(n)) return "ship";
  if (/(^gst$|sales\s*tax|fed)/.test(n)) return "gst";
  if (/(deduction|wht|withhold|4\s*%|cod\s*tax|fuel)/.test(n)) return "tax";
  if (/(^net$|net\s*(amount|pay|paid|total)|amount\s*paid|remit|payable|settlement)/.test(n)) {
    return "net";
  }
  if (/(city|destination|dest)/.test(n)) return "city";
  if (/(book(ing)?\s*date|pickup\s*date)/.test(n)) return "bookDate";
  if (/(deliver(y|ed)?\s*date|return\s*date)/.test(n)) return "delDate";
  return null;
}

function mapStatus(raw) {
  const s = cellStr(raw).toLowerCase();
  if (!s) return "Unknown";
  if (/(return|rto|undeliver|cancel|refuse|rts)/.test(s)) return "Return";
  if (/(deliver|paid|success|complete|ok)/.test(s)) return "Delivered";
  return "Unknown";
}

function parseLooseDate(raw) {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
  const s = cellStr(raw);
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  return new Date(
    `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}T12:00:00+05:00`
  );
}

export function isRemittanceSpreadsheet(meta = {}) {
  const name = String(meta.filename || meta.name || "").toLowerCase();
  const mime = String(meta.mimeType || meta.type || "").toLowerCase();
  if (/\.(xlsx|xls|csv)$/i.test(name)) return true;
  if (
    /spreadsheet|excel|csv|sheet|officedocument\.spreadsheetml|ms-excel/.test(mime)
  ) {
    return true;
  }
  return false;
}

/**
 * Find best header row + column map from a 2D sheet matrix.
 */
function detectColumns(matrix) {
  let best = null;
  const maxScan = Math.min(25, matrix.length);
  for (let r = 0; r < maxScan; r++) {
    const row = matrix[r] || [];
    const map = {};
    let trackingHits = 0;
    for (let c = 0; c < row.length; c++) {
      const role = scoreHeader(row[c]);
      if (role && map[role] == null) {
        map[role] = c;
        if (role === "tracking") trackingHits += 1;
      }
    }
    // Also detect by peeking values in this "header" row if no header labels
    if (map.tracking == null) {
      for (let c = 0; c < row.length; c++) {
        if (extractTracking(row[c])) {
          // this might be a data row — treat previous as headerless
          break;
        }
      }
    }
    const score = trackingHits * 10 + Object.keys(map).length;
    if (score > (best?.score || 0) && map.tracking != null) {
      best = { headerRow: r, map, score };
    }
  }

  // Headerless: find a column that looks like tracking across many rows
  if (!best) {
    const colScores = new Map();
    for (let r = 0; r < Math.min(80, matrix.length); r++) {
      const row = matrix[r] || [];
      for (let c = 0; c < row.length; c++) {
        if (extractTracking(row[c])) {
          colScores.set(c, (colScores.get(c) || 0) + 1);
        }
      }
    }
    let topCol = -1;
    let topN = 0;
    for (const [c, n] of colScores) {
      if (n > topN) {
        topN = n;
        topCol = c;
      }
    }
    if (topCol >= 0 && topN >= 1) {
      best = { headerRow: -1, map: { tracking: topCol }, score: topN };
    }
  }
  return best;
}

/**
 * @param {Buffer} buffer
 * @param {{ filename?: string }} [meta]
 */
export function parseRemittanceSpreadsheet(buffer, meta = {}) {
  const name = String(meta.filename || "sheet.xlsx");
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  if (!wb.SheetNames?.length) {
    throw new Error("Excel file has no sheets.");
  }

  let bestParsed = null;
  let bestCount = 0;

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: true,
    });
    if (!matrix?.length) continue;

    const detected = detectColumns(matrix);
    if (!detected) continue;

    const { headerRow, map } = detected;
    const start = headerRow >= 0 ? headerRow + 1 : 0;
    const lines = [];
    const seen = new Set();

    for (let r = start; r < matrix.length; r++) {
      const row = matrix[r] || [];
      const tracking = extractTracking(row[map.tracking]);
      if (!tracking || seen.has(tracking)) continue;
      seen.add(tracking);

      const statusRaw = map.status != null ? row[map.status] : "";
      let status = mapStatus(statusRaw);
      // Infer from COD/net if status missing
      if (status === "Unknown") {
        const codGuess = map.cod != null ? absMoney(row[map.cod]) : 0;
        if (codGuess > 0) status = "Delivered";
      }

      let codAmount = map.cod != null ? absMoney(row[map.cod]) : 0;
      let shippingCharges = map.ship != null ? absMoney(row[map.ship]) : 0;
      let gst = map.gst != null ? absMoney(row[map.gst]) : 0;
      let deduction4pct = map.tax != null ? absMoney(row[map.tax]) : 0;
      let netAmount = map.net != null ? absMoney(row[map.net]) : 0;

      if (status === "Return") {
        codAmount = 0;
        netAmount = 0;
      } else if (status === "Delivered" && !netAmount && codAmount > 0) {
        netAmount =
          Math.round((codAmount - shippingCharges - gst - deduction4pct) * 100) / 100;
      }

      const orderHint =
        (map.order != null ? extractOrderNo(row[map.order]) : "") ||
        extractOrderNo(row.map(cellStr).join(" "));

      lines.push({
        trackingNumber: tracking,
        status,
        codAmount,
        shippingCharges,
        gst,
        deduction4pct,
        netAmount,
        originCity: "",
        destinationCity: map.city != null ? cellStr(row[map.city]) : "",
        weightKg: 0,
        bookingDate: map.bookDate != null ? parseLooseDate(row[map.bookDate]) : null,
        deliveryReturnDate: map.delDate != null ? parseLooseDate(row[map.delDate]) : null,
        orderNumberHint: orderHint,
        sheetOrderNumber: orderHint,
      });
    }

    if (lines.length > bestCount) {
      bestCount = lines.length;
      const delivered = lines.filter((l) => l.status === "Delivered");
      const returned = lines.filter((l) => l.status === "Return");
      const sum = (arr, key) =>
        Math.round(arr.reduce((s, l) => s + (Number(l[key]) || 0), 0) * 100) / 100;
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const baseName = name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "").slice(0, 24);
      bestParsed = {
        cprNumber: `XL-${baseName || "SHEET"}-${stamp}-${lines.length}`.toUpperCase().slice(0, 64),
        cprDate: null,
        courier: lines.some((l) => /^GW/i.test(l.trackingNumber))
          ? "Run Courier"
          : "Courier sheet",
        deliveredCount: delivered.length,
        returnedCount: returned.length,
        codTotal: sum(delivered, "codAmount"),
        shippingCharges: sum(lines, "shippingCharges"),
        gst: sum(lines, "gst"),
        deduction4pct: sum(lines, "deduction4pct"),
        netTotal: sum(delivered, "netAmount"),
        lines,
        source: "excel",
        sheetName,
      };
    }
  }

  if (!bestParsed || !bestParsed.lines.length) {
    throw new Error(
      "Excel/CSV has no tracking column. Include a column like Tracking / CN / AWB / Consignment with GW… or PostEx numbers."
    );
  }
  return bestParsed;
}

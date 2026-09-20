/**
 * Parse courier remittance Excel / CSV sheets.
 * Tuned for PostEx CPR_Transactions exports + Run Courier sheets.
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
    .replace(/^\uFEFF/, "")
    .replace(/[\s._\-/]+/g, " ")
    .trim();
}

function cellStr(v) {
  if (v == null) return "";
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString();
  }
  return String(v).trim();
}

/** Compact tracking token from a cell. */
export function extractTracking(raw) {
  const s = cellStr(raw).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!s) return "";
  const gw = s.match(/GW\d{8,}/);
  if (gw) return gw[0];
  // PostEx CN — typically 14 digits starting with 2
  const pe = s.match(/2\d{13}/);
  if (pe) return pe[0];
  if (/^\d{10,16}$/.test(s)) return s;
  if (/^[A-Z]{1,4}\d{8,}$/.test(s)) return s;
  return "";
}

function extractOrderHint(raw) {
  const s = cellStr(raw).trim();
  if (!s) return "";
  // PostEx ORDER_REF_NUMBER is the shop order number
  const ord = s.toUpperCase().match(/ORD-?\s*\d{4}-?\s*\d+/);
  if (ord) {
    return ord[0]
      .replace(/\s+/g, "")
      .replace(/^ORD(\d)/, "ORD-$1")
      .replace(/ORD-(\d{4})(\d+)/, "ORD-$1-$2");
  }
  // Older merchant refs like #CC.PK2080 — still an order number
  const ref = s.match(/#?[A-Z]{1,4}\.?PK\.?\d+/i);
  if (ref) return ref[0].replace(/^#/, "").toUpperCase();
  // Anything else in the order-ref column (≤40 chars) is the order number as-is
  return s.length <= 40 ? s.replace(/^#/, "").trim() : "";
}

function scoreHeader(h) {
  const n = normHeader(h);
  if (!n) return null;
  // Exact PostEx / Run Courier headers first
  if (n === "tracking number" || n === "trackingnumber") return "tracking";
  // Run Courier "Order ID." and PostEx "ORDER_REF_NUMBER" are both the shop order number
  if (
    n === "order id" ||
    n === "orderid" ||
    n === "order ref number" ||
    n === "orderrefnumber" ||
    n === "order number" ||
    n === "ordernumber" ||
    n === "order no" ||
    n === "orderno"
  ) {
    return "order";
  }
  if (n === "cod amount" || n === "codamount") return "cod";
  if (n === "shipping charges" || n === "shippingcharges") return "ship";
  if (n === "updated charges" || n === "updatedcharges") return "ship";
  if (n === "deduction 4%" || n === "deduction (4%)" || n === "deduction4%") return "tax";
  if (n === "net amount" || n === "netamount") return "net";
  if (n === "balance") return "net";
  if (n === "delivery city" || n === "deliverycity") return "city";
  if (n === "origin city" || n === "origincity") return "origin";
  if (n === "order pickup date" || n === "orderpickupdate") return "bookDate";
  if (n === "d r date" || n === "d/r date" || n === "dr date") return "delDate";
  if (n === "weight kg" || n === "weight (kg)") return "weight";
  if (n === "status") return "status";
  if (n === "gst") return "gst";

  if (/(tracking|consign|awb|waybill|barcode|parcel\s*id)/.test(n)) return "tracking";
  if (/\bcn\b|c n number|cn number/.test(n)) return "tracking";
  if (/(order\s*ref|order\s*(no|number|#|id)|ord\s*no|reference|ref\s*no|shop\s*order)/.test(n)) {
    return "order";
  }
  if (/(status|state|result)/.test(n)) return "status";
  if (/(^cod$|cod\s*amount|collect|invoice\s*amount|goods\s*value)/.test(n)) return "cod";
  if (/(shipping|freight|delivery\s*charge|courier\s*charge|updated\s*charges)/.test(n)) {
    return "ship";
  }
  if (/(^gst$|sales\s*tax)/.test(n)) return "gst";
  if (/(deduction|wht|withhold|4\s*%|cod\s*tax)/.test(n)) return "tax";
  if (/(^net$|net\s*(amount|pay|paid|total)|amount\s*paid|remit|payable|^balance$)/.test(n)) {
    return "net";
  }
  if (/(delivery\s*city|destination)/.test(n)) return "city";
  if (/(^origin|origin\s*city)/.test(n)) return "origin";
  if (/(pickup|book(ing)?\s*date)/.test(n)) return "bookDate";
  if (/(d\s*\/\s*r|deliver(y|ed)?\s*date|return\s*date)/.test(n)) return "delDate";
  if (/weight/.test(n)) return "weight";
  return null;
}

function mapStatus(raw) {
  const s = cellStr(raw).toLowerCase();
  if (!s) return "Unknown";
  if (/(return|rto|undeliver|cancel|refuse|rts)/.test(s)) return "Return";
  if (/(deliver|paid|success|complete)/.test(s)) return "Delivered";
  return "Unknown";
}

function parseLooseDate(raw) {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
  const s = cellStr(raw);
  // ISO / PostEx "2026-06-27 16:45:33"
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return new Date(iso);
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
  if (/spreadsheet|excel|csv|sheet|officedocument\.spreadsheetml|ms-excel/.test(mime)) {
    return true;
  }
  return false;
}

function looksLikeProductCatalogHeader(row) {
  const joined = (row || []).map(normHeader).join("|");
  return /name\|slug\|articleno/.test(joined) || /regularprice\|saleprice/.test(joined);
}

function detectColumns(matrix) {
  let best = null;
  const maxScan = Math.min(30, matrix.length);
  for (let r = 0; r < maxScan; r++) {
    const row = matrix[r] || [];
    if (looksLikeProductCatalogHeader(row)) continue;
    const map = {};
    for (let c = 0; c < row.length; c++) {
      const role = scoreHeader(row[c]);
      if (role && map[role] == null) map[role] = c;
    }
    const score = (map.tracking != null ? 20 : 0) + Object.keys(map).length;
    if (map.tracking != null && score > (best?.score || 0)) {
      best = { headerRow: r, map, score };
    }
  }

  if (!best) {
    const colScores = new Map();
    for (let r = 0; r < Math.min(100, matrix.length); r++) {
      const row = matrix[r] || [];
      for (let c = 0; c < row.length; c++) {
        if (extractTracking(row[c])) colScores.set(c, (colScores.get(c) || 0) + 1);
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
      // Still try to attach Order ID / order-number column from a nearby header row
      const map = { tracking: topCol };
      for (let r = 0; r < Math.min(30, matrix.length); r++) {
        const row = matrix[r] || [];
        for (let c = 0; c < row.length; c++) {
          const role = scoreHeader(row[c]);
          if (role && role !== "tracking" && map[role] == null) map[role] = c;
        }
        if (map.order != null) {
          best = { headerRow: r, map, score: topN + 5 };
          break;
        }
      }
      if (!best) best = { headerRow: -1, map, score: topN };
    }
  }
  return best;
}

function buildBatchFromLines(lines, meta = {}) {
  const delivered = lines.filter((l) => l.status === "Delivered");
  const returned = lines.filter((l) => l.status === "Return");
  const sum = (arr, key) =>
    Math.round(arr.reduce((s, l) => s + (Number(l[key]) || 0), 0) * 100) / 100;
  const name = String(meta.filename || "sheet.csv");
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  // Real CPR PDF names only (CPR-A1BIM294756) — not CPR_Transactions exports
  const fromName = (name.match(/\bCPR-[A-Z0-9]{5,}\b/i) || [])[0];
  const txnStamp = (name.match(/CPR_Transactions_(\d{4}-\d{2}-\d{2})/i) || [])[1]?.replace(
    /-/g,
    ""
  );
  const baseName = name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "")
    .slice(0, 28);
  const isPostEx = lines.some((l) => /^2\d{13}$/.test(String(l.trackingNumber || "")));
  const isGw = lines.some((l) => /^GW/i.test(String(l.trackingNumber || "")));
  let cprNumber;
  if (fromName) {
    cprNumber = String(fromName).toUpperCase();
  } else if (txnStamp || /cpr[_-]?transactions/i.test(name)) {
    cprNumber = `POSTEX-TXN-${txnStamp || stamp}-${lines.length}`;
  } else {
    cprNumber = `XL-${baseName || "SHEET"}-${stamp}-${lines.length}`.toUpperCase().slice(0, 64);
  }
  return {
    cprNumber: String(cprNumber).toUpperCase().slice(0, 64),
    cprDate: null,
    courier: isPostEx ? "PostEx" : isGw ? "Run Courier" : "Courier sheet",
    deliveredCount: delivered.length,
    returnedCount: returned.length,
    // Delivered COD only for remittance KPIs; return COD is not collected
    codTotal: sum(delivered, "codAmount"),
    shippingCharges: sum(lines, "shippingCharges"),
    gst: sum(lines, "gst"),
    deduction4pct: sum(lines, "deduction4pct"),
    netTotal: sum(delivered, "netAmount"),
    lines,
    source: "excel",
  };
}

/**
 * @param {Buffer} buffer
 * @param {{ filename?: string }} [meta]
 */
export function parseRemittanceSpreadsheet(buffer, meta = {}) {
  const name = String(meta.filename || "sheet.xlsx");
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  if (!wb.SheetNames?.length) throw new Error("Excel/CSV file has no sheets.");

  let bestParsed = null;
  let bestCount = 0;
  let sawProductCatalog = false;

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: true,
    });
    if (!matrix?.length) continue;
    if (looksLikeProductCatalogHeader(matrix[0] || [])) {
      sawProductCatalog = true;
      continue;
    }

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

      const status = mapStatus(map.status != null ? row[map.status] : "");
      const codAmount = map.cod != null ? absMoney(row[map.cod]) : 0;
      const shippingCharges = map.ship != null ? absMoney(row[map.ship]) : 0;
      const gst = map.gst != null ? absMoney(row[map.gst]) : 0;
      const deduction4pct = map.tax != null ? absMoney(row[map.tax]) : 0;
      // Keep signed net from sheet (returns are often negative = shipping fee)
      let netAmount = map.net != null ? parseMoney(row[map.net]) : 0;
      if (status === "Delivered" && !netAmount && codAmount > 0) {
        netAmount =
          Math.round((codAmount - shippingCharges - gst - deduction4pct) * 100) / 100;
      }

      const orderHint =
        (map.order != null ? extractOrderHint(row[map.order]) : "") ||
        extractOrderHint(row.map(cellStr).join(" ")) ||
        // Any ORD-… in the row is the order number (Run Courier Order ID. column)
        (() => {
          for (const cell of row) {
            const m = cellStr(cell).toUpperCase().match(/\bORD-\d{4}-\d+\b/);
            if (m) return m[0];
          }
          return "";
        })();

      const weightKg =
        map.weight != null ? Math.abs(Number.parseFloat(cellStr(row[map.weight]))) || 0 : 0;

      lines.push({
        trackingNumber: tracking,
        status: status === "Unknown" && codAmount > 0 ? "Delivered" : status,
        // Keep COD on returns too (invoice value) — remittance COD total still excludes them
        codAmount,
        shippingCharges,
        gst,
        deduction4pct,
        netAmount,
        originCity: map.origin != null ? cellStr(row[map.origin]) : "",
        destinationCity: map.city != null ? cellStr(row[map.city]) : "",
        weightKg,
        bookingDate: map.bookDate != null ? parseLooseDate(row[map.bookDate]) : null,
        deliveryReturnDate: map.delDate != null ? parseLooseDate(row[map.delDate]) : null,
        orderNumberHint: orderHint,
        sheetOrderNumber: orderHint,
      });
    }

    if (lines.length > bestCount) {
      bestCount = lines.length;
      bestParsed = { ...buildBatchFromLines(lines, meta), sheetName };
    }
  }

  if (!bestParsed || !bestParsed.lines.length) {
    if (sawProductCatalog) {
      throw new Error(
        "That CSV looks like a product catalog, not a PostEx CPR sheet. Upload CPR_Transactions_….csv (columns TRACKING_NUMBER, STATUS, COD_AMOUNT…) or a CPR PDF."
      );
    }
    throw new Error(
      "Excel/CSV has no tracking column. For PostEx use CPR_Transactions export with TRACKING_NUMBER. For Run Courier include Tracking / CN / AWB."
    );
  }
  return bestParsed;
}

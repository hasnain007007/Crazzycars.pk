/**
 * Parse PostEx / Call Courier Cash Payment Receipt (CPR) PDF text.
 * pdf-parse often glues columns: Delivered196.006,750.00 — handle that layout.
 */

function parseMoney(raw) {
  if (raw == null) return 0;
  let s = String(raw).trim();
  if (!s) return 0;
  const neg = /^\(.*\)$/.test(s) || s.includes("(") || s.startsWith("-");
  s = s.replace(/[()\s]/g, "").replace(/,/g, "").replace(/Rs\.?/gi, "");
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return neg ? -Math.abs(n) : n;
}

function absMoney(raw) {
  return Math.abs(parseMoney(raw));
}

/** dd/mm/yyyy → Date noon Asia/Karachi. */
export function parsePkDate(raw) {
  const m = String(raw || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (!d || !mo || !y) return null;
  return new Date(
    `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}T12:00:00+05:00`
  );
}

/**
 * Extract structured CPR data from raw PDF text.
 * @param {string} text
 */
export function parsePostexCprText(text) {
  const raw = String(text || "").replace(/\u00a0/g, " ");
  if (!/Cash Payment Receipt|CPR-/i.test(raw)) {
    throw new Error("Not a PostEx Cash Payment Receipt (CPR) PDF.");
  }

  const cprNumber = (raw.match(/CPR-[A-Z0-9]+/i) || [])[0]?.toUpperCase() || "";
  if (!cprNumber) throw new Error("Could not find CPR number.");

  let cprDate = null;
  const cprDateBlock = raw.match(/CPR-[A-Z0-9]+\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (cprDateBlock) cprDate = parsePkDate(cprDateBlock[1]);

  // Delivered35139,657.00139,657.00 → count 35 + COD 139,657.00 (not 351 + 39,657).
  let deliveredCount = 0;
  let summaryCod = 0;
  {
    const rest = (raw.match(/Delivered(\d[\d,]+\.\d{2}\d[\d,]+\.\d{2})/i) || [])[1] || "";
    for (let len = 1; len <= 3; len++) {
      const countStr = rest.slice(0, len);
      if (!/^\d+$/.test(countStr)) continue;
      const after = rest.slice(len);
      const m = after.match(
        /^(\d{1,3}(?:,\d{3})+\.\d{2}|\d+\.\d{2})(\d{1,3}(?:,\d{3})+\.\d{2}|\d+\.\d{2})/
      );
      if (!m) continue;
      const a1 = absMoney(m[1]);
      const a2 = absMoney(m[2]);
      const count = Number(countStr);
      if (count > 0 && count <= 5000 && a1 >= 100 && Math.abs(a1 - a2) < 0.02) {
        deliveredCount = count;
        summaryCod = a1;
        break;
      }
    }
  }

  let returnedCount = 0;
  {
    const rest = (raw.match(/Returned(\d[\d,]+\.\d{2})/i) || [])[1] || "";
    for (let len = 1; len <= 3; len++) {
      const countStr = rest.slice(0, len);
      if (!/^\d+$/.test(countStr)) continue;
      const after = rest.slice(len);
      const m = after.match(/^(\d{1,3}(?:,\d{3})+\.\d{2}|\d+\.\d{2})/);
      if (!m) continue;
      const count = Number(countStr);
      const amt = absMoney(m[1]);
      if (count > 0 && count <= 5000 && amt >= 0) {
        returnedCount = count;
        break;
      }
    }
  }

  const shippingCharges = absMoney(
    (raw.match(/Shipping Charges\s*\d*\(?([\d,]+\.\d{2})\)?/i) || [])[1]
  );
  const gst = absMoney((raw.match(/GST\(?([\d,]+\.\d{2})\)?/i) || [])[1]);
  const deduction4pct = absMoney(
    (raw.match(/Deduction\s*\(4%\)\(?([\d,]+\.\d{2})\)?/i) || [])[1]
  );
  const netTotal = absMoney((raw.match(/Net Total\s*([\d,]+\.\d{2})/i) || [])[1]);

  const trackRe = /\b(2\d{13})\b/g;
  const trackingMatches = [];
  let tm;
  while ((tm = trackRe.exec(raw)) !== null) {
    trackingMatches.push({ tracking: tm[1], index: tm.index });
  }

  const seen = new Set();
  const uniqueTracks = [];
  for (const row of trackingMatches) {
    if (seen.has(row.tracking)) continue;
    seen.add(row.tracking);
    uniqueTracks.push(row);
  }

  const lines = [];
  for (let i = 0; i < uniqueTracks.length; i++) {
    const { tracking, index } = uniqueTracks[i];
    const start = i === 0 ? Math.max(0, index - 500) : uniqueTracks[i - 1].index;
    const block = raw.slice(start, index);

    let status = "Unknown";
    let shippingChargesLine = 0;
    let codAmount = 0;

    const statusPair = block.match(/(Delivered|Return)(\d+\.\d{2})([\d,]+\.\d{2})/i);
    if (statusPair) {
      status = /^Delivered$/i.test(statusPair[1]) ? "Delivered" : "Return";
      shippingChargesLine = absMoney(statusPair[2]);
      codAmount = absMoney(statusPair[3]);
    }

    let netAmount = 0;
    if (status === "Delivered") {
      const dr = block.match(
        /\(D\/R\)\s*0\.00([\d,]+\.\d{2})([\d,]+\.\d{2})/i
      );
      if (dr) {
        codAmount = absMoney(dr[1]) || codAmount;
        netAmount = absMoney(dr[2]);
      }
    } else if (status === "Return") {
      const dr = block.match(/\(D\/R\)\s*0\.000\.00(\([\d,]+\.\d{2}\)|-?[\d,]+\.\d{2})/i);
      if (dr) netAmount = parseMoney(dr[1]);
    }

    let gstLine = 0;
    let deductionLine = 0;
    const trail = block.match(/0\.00(\d+\.\d{2})(\d+\.\d{2})\s*[\d.]*\s*kg/i);
    if (trail) {
      gstLine = absMoney(trail[1]);
      deductionLine = absMoney(trail[2]);
    } else {
      const trail2 = block.match(/\n0\.00(\d+\.\d{2})(\d+\.\d{2})\n/i);
      if (trail2) {
        gstLine = absMoney(trail2[1]);
        deductionLine = absMoney(trail2[2]);
      }
    }

    if (status === "Delivered" && (!netAmount || netAmount <= 0) && codAmount > 0) {
      netAmount =
        Math.round((codAmount - shippingChargesLine - gstLine - deductionLine) * 100) / 100;
    }

    const dates = [...block.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4})/g)].map((m) => m[1]);
    const bookingDate = dates[0] ? parsePkDate(dates[0]) : null;
    const deliveryReturnDate = dates.length > 1 ? parsePkDate(dates[dates.length - 1]) : null;

    const destM = block.match(
      /\n([A-Z][A-Za-z]*(?:\s[A-Z][A-Za-z]*){0,2})\n(?:Delivered|Return)/
    );
    const destinationCity = destM ? destM[1].trim() : "";
    const originCity = /GUJRANWALA/i.test(block) ? "GUJRANWALA" : "";
    const weightM = block.match(/([\d.]+)\s*kg/i);
    const weightKg = weightM ? Number.parseFloat(weightM[1]) || 0 : 0;

    lines.push({
      trackingNumber: tracking,
      status,
      codAmount,
      shippingCharges: shippingChargesLine,
      gst: gstLine,
      deduction4pct: deductionLine,
      netAmount,
      originCity,
      destinationCity,
      weightKg,
      bookingDate,
      deliveryReturnDate,
    });
  }

  return {
    cprNumber,
    cprDate,
    courier: "PostEx",
    deliveredCount:
      deliveredCount || lines.filter((l) => l.status === "Delivered").length,
    returnedCount: returnedCount || lines.filter((l) => l.status === "Return").length,
    codTotal: summaryCod,
    shippingCharges,
    gst,
    deduction4pct,
    netTotal,
    lines,
  };
}

/**
 * @param {Buffer} buffer
 */
export async function extractPdfText(buffer) {
  // Avoid pdf-parse package root (pulls test harness in some bundlers).
  const mod = await import("pdf-parse/lib/pdf-parse.js");
  const pdfParse = mod.default || mod;
  const data = await pdfParse(Buffer.from(buffer));
  return String(data?.text || "");
}

/**
 * @param {Buffer} buffer
 */
export async function parsePostexCprPdf(buffer) {
  const text = await extractPdfText(buffer);
  return parsePostexCprText(text);
}

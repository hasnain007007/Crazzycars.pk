/**
 * Parse Run Courier / Leopard remittance / payment sheet PDF text.
 * Layouts vary; we key off GW… CNs and nearby Delivered/Return + money tokens.
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

/** dd/mm/yyyy or dd-mm-yyyy → Date. */
export function parseLoosePkDate(raw) {
  const m = String(raw || "")
    .trim()
    .match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (!d || !mo || !y) return null;
  return new Date(
    `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}T12:00:00+05:00`
  );
}

export function looksLikeRunCourierRemit(text) {
  const raw = String(text || "");
  if (/Cash Payment Receipt|CPR-[A-Z0-9]+/i.test(raw)) return false;
  const gwCount = (raw.match(/\bGW\d{8,}\b/gi) || []).length;
  if (gwCount >= 1) return true;
  // OCR often inserts spaces: G W 7543…
  const gwLoose = (raw.match(/\bG[\s._-]*W[\s._-]*\d{8,}\b/gi) || []).length;
  if (gwLoose >= 1) return true;
  if (/run\s*courier|leopard/i.test(raw) && /\b[A-Z]{2}\d{8,}\b/.test(raw)) return true;
  return false;
}

/**
 * @param {string} text
 */
export function parseRunCourierRemitText(text) {
  let raw = String(text || "").replace(/\u00a0/g, " ");
  // Screenshot OCR often splits GW
  raw = raw.replace(/\bG[\s._-]*W[\s._-]*(\d{8,})\b/gi, (_, d) => `GW${d}`);
  raw = raw.replace(/\b[O0][\s._-]*W[\s._-]*(\d{8,})\b/gi, (_, d) => `GW${d}`);
  if (!looksLikeRunCourierRemit(raw)) {
    throw new Error("Not a Run Courier / Leopard remittance sheet (no GW… tracking IDs found).");
  }

  const batchId =
    (raw.match(
      /\b(?:Invoice|Batch|Remittance)\s*(?:No\.?|Number|#|:)\s*([A-Z0-9][A-Z0-9\-\/]*\d[A-Z0-9\-\/]*)/i
    ) || [])[1] || "";
  const sheetDateMatch = raw.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b/);
  const cprDate = sheetDateMatch ? parseLoosePkDate(sheetDateMatch[1]) : null;

  const trackRe = /\b(GW\d{8,})\b/gi;
  const trackingMatches = [];
  let tm;
  while ((tm = trackRe.exec(raw)) !== null) {
    trackingMatches.push({ tracking: tm[1].toUpperCase(), index: tm.index });
  }

  const seen = new Set();
  const uniqueTracks = [];
  for (const row of trackingMatches) {
    if (seen.has(row.tracking)) continue;
    seen.add(row.tracking);
    uniqueTracks.push(row);
  }

  if (!uniqueTracks.length) {
    throw new Error("No GW tracking numbers found in the PDF.");
  }

  const lines = [];
  for (let i = 0; i < uniqueTracks.length; i++) {
    const { tracking, index } = uniqueTracks[i];
    // Slice only this CN's segment (avoid bleeding amounts from neighbors)
    const end =
      i + 1 < uniqueTracks.length ? uniqueTracks[i + 1].index : Math.min(raw.length, index + 500);
    const start = index;
    const block = raw.slice(start, end);

    let status = "Unknown";
    if (/\b(Return(?:ed)?|RTO|Undelivered)\b/i.test(block)) status = "Return";
    else if (/\b(Delivered|Delivery|Paid|COD\s*Collected)\b/i.test(block)) status = "Delivered";

    const shipM = block.match(/(?:Shipping|Freight|Delivery\s*Charges?)\s*[:\s]*([\d,]+\.?\d*)/i);
    const gstM = block.match(/(?:GST|Sales\s*Tax)\s*[:\s]*([\d,]+\.?\d*)/i);
    const taxM = block.match(/(?:Deduction|WHT|4\s*%|Withholding)\s*[:\s]*([\d,]+\.?\d*)/i);
    const netM = block.match(/(?:Net|Amount\s*Paid|Remitted|Payable)\s*[:\s]*([\d,]+\.?\d*)/i);
    const codM = block.match(/(?:COD|Collect(?:ed)?)\s*[:\s]*([\d,]+\.?\d*)/i);

    let shippingCharges = shipM ? absMoney(shipM[1]) : 0;
    let gst = gstM ? absMoney(gstM[1]) : 0;
    let deduction4pct = taxM ? absMoney(taxM[1]) : 0;
    let netAmount = netM ? absMoney(netM[1]) : 0;
    let codAmount = codM ? absMoney(codM[1]) : 0;

    if (!codAmount && !netAmount && status === "Delivered") {
      const moneyTokens = [...block.matchAll(/([\d,]+\.\d{2})/g)].map((m) => absMoney(m[1]));
      const sorted = moneyTokens.filter((n) => n > 0).sort((a, b) => b - a);
      if (sorted[0]) codAmount = sorted[0];
      if (!shippingCharges && sorted[1]) shippingCharges = sorted[1];
      if (!gst && sorted[2]) gst = sorted[2];
    }

    if (status === "Return") {
      codAmount = 0;
      netAmount = 0;
    } else if (status === "Delivered" && !netAmount && codAmount > 0) {
      netAmount =
        Math.round((codAmount - shippingCharges - gst - deduction4pct) * 100) / 100;
    }

    // Order # immediately before this CN (same row), not a previous parcel's ORD
    const peek = raw.slice(Math.max(0, index - 36), index);
    const orderHint =
      (peek.match(/\b(ORD-\d{4}-\d+)\s*$/i) || [])[1] ||
      (block.match(/^\s*(ORD-\d{4}-\d+)\b/i) || [])[1] ||
      "";
    const sheetOrderNumber = orderHint ? orderHint.toUpperCase() : "";

    const dates = [...block.matchAll(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/g)].map((m) => m[1]);
    const bookingDate = dates[0] ? parseLoosePkDate(dates[0]) : null;
    const deliveryReturnDate =
      dates.length > 1 ? parseLoosePkDate(dates[dates.length - 1]) : null;

    const cityM = block.match(
      /\b(Islamabad|Lahore|Karachi|Faisalabad|Rawalpindi|Multan|Peshawar|Quetta|Sialkot|Gujranwala|Sargodha|Hyderabad|Bahawalpur)\b/i
    );

    lines.push({
      trackingNumber: tracking,
      status,
      codAmount,
      shippingCharges,
      gst,
      deduction4pct,
      netAmount,
      originCity: "",
      destinationCity: cityM ? cityM[1] : "",
      weightKg: 0,
      bookingDate,
      deliveryReturnDate,
      orderNumberHint: sheetOrderNumber,
      sheetOrderNumber,
    });
  }

  const delivered = lines.filter((l) => l.status === "Delivered");
  const returned = lines.filter((l) => l.status === "Return");
  const shippingCharges = lines.reduce((s, l) => s + (Number(l.shippingCharges) || 0), 0);
  const gst = lines.reduce((s, l) => s + (Number(l.gst) || 0), 0);
  const deduction4pct = lines.reduce((s, l) => s + (Number(l.deduction4pct) || 0), 0);
  const codTotal = delivered.reduce((s, l) => s + (Number(l.codAmount) || 0), 0);
  const netTotal = delivered.reduce((s, l) => s + (Number(l.netAmount) || 0), 0);

  const stamp = cprDate
    ? cprDate.toISOString().slice(0, 10).replace(/-/g, "")
    : new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const cprNumber = (
    (batchId && `RC-${batchId}`) ||
    `RC-${stamp}-${uniqueTracks[0].tracking.slice(-6)}`
  )
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 64);

  return {
    cprNumber,
    cprDate,
    courier: "Run Courier",
    deliveredCount: delivered.length,
    returnedCount: returned.length,
    codTotal: Math.round(codTotal * 100) / 100,
    shippingCharges: Math.round(shippingCharges * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    deduction4pct: Math.round(deduction4pct * 100) / 100,
    netTotal: Math.round(netTotal * 100) / 100,
    lines,
  };
}

/**
 * @param {Buffer} buffer
 * @param {(buf: Buffer) => Promise<string>} extractPdfText
 */
export async function parseRunCourierRemitPdf(buffer, extractPdfText) {
  const text = await extractPdfText(buffer);
  return parseRunCourierRemitText(text);
}

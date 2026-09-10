/**
 * Run Courier airbill PDF — PostEx-style layout, exactly 3 equal labels per A4.
 * Portal has no PDF API — we build from invoice HTML + order number from our DB.
 */


import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prepareRunCourierInvoiceHtml } from "./runcourierInvoice.js";

const A4_W = 595.28;
const A4_H = 841.89;
/** PostEx-style: exactly 3 equal airbills fill one A4 (no empty page footer). */
const LABELS_PER_PAGE = 3;
const PAGE_MARGIN = 10;
const SIDE_MARGIN = 12;
const LABEL_GAP = 6;
const LABEL_H = Math.floor(
  (A4_H - PAGE_MARGIN * 2 - LABEL_GAP * (LABELS_PER_PAGE - 1)) / LABELS_PER_PAGE
); // ~269pt

/** Destination city → short code (PostEx airbill style). */
const CITY_CODES = {
  gujranwala: "GRW",
  lahore: "LHE",
  karachi: "KHI",
  islamabad: "ISB",
  rawalpindi: "RWP",
  quetta: "UET",
  peshawar: "PEW",
  faisalabad: "LYP",
  multan: "MUX",
  sialkot: "SKT",
  hyderabad: "HDD",
  sukkur: "SKZ",
  sahiwal: "SWL",
  khairpur: "KHP",
  hafizabad: "HFD",
  tulamba: "TLB",
  gujrat: "GJT",
  bahawalpur: "BHV",
  sargodha: "SGI",
  abbottabad: "AAW",
};

function stripToLines(html) {
  let clean = String(html || "");
  clean = clean.replace(/<style[\s\S]*?<\/style>/gi, "");
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, "");
  clean = clean.replace(/<(br|tr|li|p|h\d|div|td|th)[^>]*>/gi, "\n");
  clean = clean.replace(/<[^>]+>/g, " ");
  clean = clean.replace(/[ \t]+/g, " ");
  return clean
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && l !== "-->" && l !== "<!--");
}

function valueAfter(lines, label, { offset = 1 } = {}) {
  const needle = String(label).toLowerCase().replace(/:$/, "");
  for (let i = 0; i < lines.length; i += 1) {
    const l = lines[i].toLowerCase().replace(/:$/, "");
    if (l === needle || l.startsWith(`${needle}:`) || l.startsWith(`${needle} `)) {
      const same = lines[i].split(":").slice(1).join(":").trim();
      if (same) return same;
      for (let j = i + offset; j < Math.min(i + offset + 3, lines.length); j += 1) {
        const v = lines[j];
        if (!v) continue;
        if (
          /^(shipper|consignee|company|name|phone|address|date|services|origin|destination|weight|booking|reference|order|cod|no\.|product|special|kindly|run courier)/i.test(
            v
          )
        ) {
          continue;
        }
        return v;
      }
    }
  }
  return "";
}

function firstMatch(lines, re) {
  for (const l of lines) {
    const m = l.match(re);
    if (m) return (m[1] || m[0] || "").trim();
  }
  return "";
}

function parseAirbillFields(html) {
  const lines = stripToLines(html);
  const tracking =
    firstMatch(lines, /\b(GW\d{6,}|\d{10,})\b/) ||
    firstMatch(lines, /^No\.\s*#?\s*(.+)$/i);

  let date = "";
  let services = "Overnight";
  let origin = "";
  let weight = "";
  let bookingType = "Invoice";
  let destination = "";

  const dateIdx = lines.findIndex((l) => /^date$/i.test(l));
  if (
    dateIdx >= 0 &&
    /^services$/i.test(lines[dateIdx + 1] || "") &&
    /^origin$/i.test(lines[dateIdx + 2] || "")
  ) {
    date = lines[dateIdx + 3] || "";
    services = lines[dateIdx + 4] || services;
    origin = lines[dateIdx + 5] || "";
  } else {
    date = firstMatch(lines, /(\d{2}\/\d{2}\/\d{4})/);
  }

  const weightIdx = lines.findIndex((l) => /^weight\s*:?$/i.test(l));
  if (
    weightIdx >= 0 &&
    /booking/i.test(lines[weightIdx + 1] || "") &&
    /destination/i.test(lines[weightIdx + 2] || "")
  ) {
    weight = lines[weightIdx + 3] || "";
    bookingType = lines[weightIdx + 4] || bookingType;
    destination = lines[weightIdx + 5] || "";
  } else {
    weight = firstMatch(lines, /([\d.]+)\s*Kg/i);
    destination = valueAfter(lines, "Destination");
  }

  let company = "crazzycars.pk";
  let shipperPhone = "";
  let pickup = "";
  let consigneeName = "";
  let consigneePhone = "";
  let consigneeAddress = "";

  const shipperIdx = lines.findIndex((l) => /^shipper$/i.test(l));
  if (shipperIdx >= 0) {
    const block = lines.slice(shipperIdx, shipperIdx + 45);
    const companyIdx = block.findIndex((l) => /^company:?$/i.test(l));
    if (companyIdx >= 0) company = block[companyIdx + 1] || company;

    // Portal HTML is a 2-col Shipper|Consignee table: first Name is consignee.
    // A later dedicated Consignee block also has Name — prefer the last Name label.
    const nameIndexes = block
      .map((l, i) => (/^name:?$/i.test(l) ? i : -1))
      .filter((i) => i >= 0);
    if (nameIndexes.length) {
      const nameIdx = nameIndexes[nameIndexes.length - 1];
      consigneeName = block[nameIdx + 1] || "";
    }

    const phoneIndexes = block
      .map((l, i) => (/^phone\s*no\s*:?$/i.test(l) ? i : -1))
      .filter((i) => i >= 0);
    if (phoneIndexes[0] != null) shipperPhone = block[phoneIndexes[0] + 1] || "";
    if (phoneIndexes.length > 1) {
      consigneePhone = block[phoneIndexes[phoneIndexes.length - 1] + 1] || "";
    }

    const pickupIdx = block.findIndex((l) => /^pickup address:?$/i.test(l));
    if (pickupIdx >= 0) pickup = block[pickupIdx + 1] || "";
    const addressIndexes = block
      .map((l, i) => (/^address:?$/i.test(l) ? i : -1))
      .filter((i) => i >= 0);
    if (!pickup && addressIndexes[0] != null) pickup = block[addressIndexes[0] + 1] || "";
    if (addressIndexes.length) {
      // Last Address: in the block is the consignee delivery address.
      const consigneeAddrIdx = addressIndexes[addressIndexes.length - 1];
      consigneeAddress = block[consigneeAddrIdx + 1] || "";
    }
  }

  if (!consigneeName) consigneeName = valueAfter(lines, "Name");
  // Never show the store/company as the consignee name.
  if (consigneeName && /^crazzycars/i.test(consigneeName)) consigneeName = "";
  const phones = lines.filter((l) => /^03\d{9}$/.test(l.replace(/\s/g, "")));
  if (!shipperPhone) shipperPhone = phones[0] || "";
  if (!consigneePhone) consigneePhone = phones[1] || phones[0] || "";
  if (!consigneeAddress) consigneeAddress = valueAfter(lines, "Address");
  if (!pickup) pickup = valueAfter(lines, "Pickup Address");

  let cod = "";
  const codIdx = lines.findIndex((l) => /^cod amount$/i.test(l));
  if (codIdx >= 0) {
    for (let j = codIdx + 1; j < Math.min(codIdx + 6, lines.length); j += 1) {
      const v = lines[j];
      if (/[\d,]+\.?\d*/.test(v) && !/^rs:?$/i.test(v)) {
        cod = v.replace(/^rs:?\s*/i, "").trim();
        break;
      }
    }
  }
  if (!cod) cod = firstMatch(lines, /([\d,]+\.\d{2})/) || "";

  let orderId = "";
  const orderIdx = lines.findIndex((l) => /^order id\.?\s*:?$/i.test(l));
  if (orderIdx >= 0) {
    const next = lines[orderIdx + 1] || "";
    if (next && !/^rs:?$/i.test(next) && !/^cod/i.test(next) && !/^reference/i.test(next)) {
      orderId = next;
    }
  }

  let reference =
    valueAfter(lines, "Reference No. #") || valueAfter(lines, "Reference No.") || "";
  if (reference === "0") reference = "";

  const product =
    valueAfter(lines, "Product Description") ||
    firstMatch(lines, /Product Description\s*:\s*(.+)/i) ||
    "";

  return {
    tracking: tracking || "",
    date,
    services,
    origin,
    destination,
    weight,
    bookingType,
    company,
    shipperPhone,
    pickup,
    consigneeName,
    consigneePhone,
    consigneeAddress,
    reference,
    orderId,
    cod,
    pieces: valueAfter(lines, "No. of Pieces") || "1",
    product,
    instructions: valueAfter(lines, "Special Instruction") || "",
  };
}

function extractDataImages(html) {
  const out = { trackingBarcode: null, orderBarcode: null, logo: null, qr: null };
  const re = /<img\b[^>]*src=(["'])(data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=\s]+)\1[^>]*>/gi;
  const imgs = [];
  let m;
  while ((m = re.exec(html))) {
    imgs.push({ dataUri: m[2].replace(/\s+/g, "") });
  }
  const pngs = imgs.filter((i) => i.dataUri.startsWith("data:image/png"));
  const jpgs = imgs.filter(
    (i) =>
      i.dataUri.startsWith("data:image/jpeg") || i.dataUri.startsWith("data:image/jpg")
  );
  // Portal only embeds tracking barcode (+ QR). Order Ref barcode is fetched separately.
  out.trackingBarcode = pngs[0]?.dataUri || null;
  out.logo = jpgs[0]?.dataUri || null;
  out.qr = pngs.length > 1 ? pngs[pngs.length - 1].dataUri : pngs[1]?.dataUri || null;
  return out;
}

async function fetchPortalBarcodeDataUri(code) {
  const value = String(code || "").trim();
  if (!value || value === "-" || value === "0") return null;
  const url = `https://portal.runcourier.com/barcode.php?code=${encodeURIComponent(value)}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "image/*,*/*", "User-Agent": "CrazzycarsLabel/1.0" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) return null;
    const ct = String(res.headers.get("content-type") || "image/png").split(";")[0].trim();
    if (!ct.startsWith("image/")) return null;
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function dataUriToBytes(dataUri) {
  const s = String(dataUri || "");
  const i = s.indexOf("base64,");
  if (i < 0) return null;
  return Buffer.from(s.slice(i + 7), "base64");
}

/** Helvetica/WinAnsi-safe text; keep common Latin punctuation. */
function pdfSafe(text) {
  return String(text || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x20-\x7E\n]/g, "")
    .trim();
}

function drawText(page, text, x, y, opts = {}) {
  const {
    size = 8,
    font,
    color = rgb(0.05, 0.05, 0.05),
    maxWidth = 0,
    lineHeight = 9,
    maxLines = 99,
  } = opts;
  const value = pdfSafe(text);
  if (!value || !font) return y;
  if (!maxWidth) {
    page.drawText(value, { x, y, size, font, color });
    return y;
  }
  const words = value.split(/\s+/);
  let line = "";
  let cy = y;
  let linesUsed = 0;
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    const width = font.widthOfTextAtSize(next, size);
    if (width > maxWidth && line) {
      page.drawText(line, { x, y: cy, size, font, color });
      cy -= lineHeight;
      linesUsed += 1;
      line = w;
      if (linesUsed >= maxLines) return cy;
    } else {
      line = next;
    }
  }
  if (line && linesUsed < maxLines) {
    page.drawText(line, { x, y: cy, size, font, color });
  }
  return cy;
}

function truncateToWidth(font, text, size, maxWidth) {
  const value = pdfSafe(text);
  if (!value || !font || !maxWidth) return value;
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;
  let out = value;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, size) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

function resolveOrderNo(fields, orderNumber) {
  const fromDb = pdfSafe(orderNumber);
  if (fromDb) return fromDb;
  const fromPortal = pdfSafe(fields.orderId || fields.reference);
  if (fromPortal && fromPortal !== "0") return fromPortal;
  return "";
}

async function embedImages(pdfDoc, images) {
  let trackingBarcodeImg = null;
  let orderBarcodeImg = null;
  let logoImg = null;
  let qrImg = null;
  try {
    if (images.trackingBarcode) {
      trackingBarcodeImg = await pdfDoc.embedPng(dataUriToBytes(images.trackingBarcode));
    }
  } catch {
    trackingBarcodeImg = null;
  }
  try {
    if (images.orderBarcode) {
      const bytes = dataUriToBytes(images.orderBarcode);
      orderBarcodeImg = images.orderBarcode.includes("image/jpeg")
        ? await pdfDoc.embedJpg(bytes)
        : await pdfDoc.embedPng(bytes);
    }
  } catch {
    orderBarcodeImg = null;
  }
  try {
    if (images.logo) {
      const bytes = dataUriToBytes(images.logo);
      logoImg = images.logo.includes("image/png")
        ? await pdfDoc.embedPng(bytes)
        : await pdfDoc.embedJpg(bytes);
    }
  } catch {
    logoImg = null;
  }
  try {
    if (images.qr) qrImg = await pdfDoc.embedPng(dataUriToBytes(images.qr));
  } catch {
    qrImg = null;
  }
  return { trackingBarcodeImg, orderBarcodeImg, logoImg, qrImg };
}

function cityCode(city) {
  const raw = String(city || "").trim();
  if (!raw) return "PK";
  const key = raw.toLowerCase();
  if (CITY_CODES[key]) return CITY_CODES[key];
  const compact = key.replace(/[^a-z]/g, "");
  const hit = Object.keys(CITY_CODES).find((k) => compact.startsWith(k.replace(/\s/g, "")) || k.startsWith(compact));
  if (hit) return CITY_CODES[hit];
  return (compact.slice(0, 3) || "PK").toUpperCase();
}

function sectionHeader(page, fonts, x, y, w, h, title) {
  const { font, bold } = fonts;
  page.drawRectangle({
    x,
    y: y - h,
    width: w,
    height: h,
    color: rgb(0.88, 0.9, 0.93),
    borderColor: rgb(0.55, 0.55, 0.55),
    borderWidth: 0.5,
  });
  page.drawText(title, {
    x: x + 4,
    y: y - h + 3.5,
    size: 7,
    font: bold,
    color: rgb(0.15, 0.15, 0.15),
  });
}

function cellBorder(page, x, y, w, h) {
  page.drawRectangle({
    x,
    y: y - h,
    width: w,
    height: h,
    borderColor: rgb(0.55, 0.55, 0.55),
    borderWidth: 0.5,
    color: undefined,
  });
}

/**
 * PostEx-style airbill: logo + barcodes header, 3 info columns, order-details footer.
 * Fills the allocated slot completely (equal thirds of A4).
 */
function drawAirbillIntoPage(page, fonts, images, fields, orderNo, region) {
  const { font, bold } = fonts;
  const { trackingBarcodeImg, orderBarcodeImg, logoImg, qrImg } = images;
  const { x: ox, y: oy, width: rw, height: rh } = region;
  const pad = 6;

  // Outer border fills full slot
  page.drawRectangle({
    x: ox,
    y: oy,
    width: rw,
    height: rh,
    borderColor: rgb(0.1, 0.1, 0.1),
    borderWidth: 1.2,
    color: rgb(1, 1, 1),
  });

  const innerX = ox + pad;
  const innerW = rw - pad * 2;
  const top = oy + rh - pad;
  const orderDisplay = orderNo || pdfSafe(fields.orderId) || "-";
  const tracking = pdfSafe(fields.tracking) || "-";
  const dest = pdfSafe(fields.destination) || "-";
  const origin = pdfSafe(fields.origin) || "Gujranwala";
  const code = cityCode(dest);

  // --- HEADER: logo | order barcode | tracking barcode | city code ---
  const headerH = 48;
  let y = top;

  // Logo / brand
  if (logoImg) {
    const lw = 52;
    const lh = Math.min(22, (logoImg.height / logoImg.width) * lw);
    page.drawImage(logoImg, {
      x: innerX,
      y: y - lh - 2,
      width: lw,
      height: lh,
    });
  } else {
    page.drawText("Run Courier", {
      x: innerX,
      y: y - 14,
      size: 10,
      font: bold,
      color: rgb(0.1, 0.35, 0.2),
    });
  }
  page.drawText("crazzycars.pk", {
    x: innerX,
    y: y - 28,
    size: 7,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Order Ref barcode (distinct from tracking — never reuse tracking barcode)
  const orderBarX = innerX + 70;
  const orderBarW = 120;
  if (orderBarcodeImg) {
    page.drawImage(orderBarcodeImg, {
      x: orderBarX,
      y: y - 28,
      width: orderBarW,
      height: 22,
    });
  }
  page.drawText(
    truncateToWidth(bold, `Order Ref: ${orderDisplay}`, 7.5, orderBarW + 10),
    {
      x: orderBarX,
      y: y - 40,
      size: 7.5,
      font: bold,
    }
  );

  // Tracking barcode
  const trackBarX = orderBarX + 135;
  const trackBarW = 130;
  if (trackingBarcodeImg) {
    page.drawImage(trackingBarcodeImg, {
      x: trackBarX,
      y: y - 28,
      width: trackBarW,
      height: 22,
    });
  }
  page.drawText(
    truncateToWidth(bold, `Tracking No: ${tracking}`, 7.5, trackBarW + 8),
    {
      x: trackBarX,
      y: y - 40,
      size: 7.5,
      font: bold,
    }
  );

  // Large city code (PostEx style)
  const codeSize = 28;
  const codeW = bold.widthOfTextAtSize(code, codeSize);
  page.drawText(code, {
    x: ox + rw - pad - codeW - 4,
    y: y - 34,
    size: codeSize,
    font: bold,
    color: rgb(0.05, 0.05, 0.05),
  });

  y = top - headerH;
  page.drawLine({
    start: { x: ox + 1, y },
    end: { x: ox + rw - 1, y },
    thickness: 0.7,
    color: rgb(0.4, 0.4, 0.4),
  });

  // --- BODY: 3 columns ---
  const footerH = 28;
  const bodyTop = y;
  const bodyBottom = oy + pad + footerH;
  const bodyH = bodyTop - bodyBottom;
  const colGap = 3;
  const col1W = Math.floor(innerW * 0.36);
  const col3W = Math.floor(innerW * 0.28);
  const col2W = innerW - col1W - col3W - colGap * 2;
  const c1x = innerX;
  const c2x = c1x + col1W + colGap;
  const c3x = c2x + col2W + colGap;

  // Column outlines
  cellBorder(page, c1x, bodyTop, col1W, bodyH);
  cellBorder(page, c2x, bodyTop, col2W, bodyH);
  cellBorder(page, c3x, bodyTop, col3W, bodyH);

  const hdrH = 12;
  // Col1: Consignee + Shipper
  sectionHeader(page, fonts, c1x, bodyTop, col1W, hdrH, "Consignee Information");
  let cy = bodyTop - hdrH - 8;
  const labelSize = 6.5;
  const valSize = 8;
  const leftPad = 4;
  const maxW1 = col1W - 10;

  page.drawText("Name:", { x: c1x + leftPad, y: cy, size: labelSize, font, color: rgb(0.35, 0.35, 0.35) });
  page.drawText(truncateToWidth(bold, fields.consigneeName || "-", valSize, maxW1 - 28), {
    x: c1x + leftPad + 28,
    y: cy,
    size: valSize,
    font: bold,
  });
  cy -= 11;
  page.drawText("Contact:", { x: c1x + leftPad, y: cy, size: labelSize, font, color: rgb(0.35, 0.35, 0.35) });
  page.drawText(truncateToWidth(bold, fields.consigneePhone || "-", valSize, maxW1 - 36), {
    x: c1x + leftPad + 36,
    y: cy,
    size: valSize,
    font: bold,
  });
  cy -= 11;
  page.drawText("Delivery Address:", {
    x: c1x + leftPad,
    y: cy,
    size: labelSize,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });
  cy -= 9;
  cy = drawText(page, fields.consigneeAddress, c1x + leftPad, cy, {
    size: 7.5,
    font,
    maxWidth: maxW1,
    lineHeight: 9,
    maxLines: 3,
  });
  cy -= 10;

  // Divider inside col1
  page.drawLine({
    start: { x: c1x + 2, y: cy + 4 },
    end: { x: c1x + col1W - 2, y: cy + 4 },
    thickness: 0.4,
    color: rgb(0.7, 0.7, 0.7),
  });
  cy -= 2;
  sectionHeader(page, fonts, c1x, cy + hdrH, col1W, hdrH, "Shipper Information");
  cy -= 8;
  page.drawText("Name:", { x: c1x + leftPad, y: cy, size: labelSize, font, color: rgb(0.35, 0.35, 0.35) });
  page.drawText(truncateToWidth(bold, fields.company || "CRAZZYCARS.PK", valSize, maxW1 - 28), {
    x: c1x + leftPad + 28,
    y: cy,
    size: valSize,
    font: bold,
  });
  cy -= 10;
  page.drawText("Contact:", { x: c1x + leftPad, y: cy, size: labelSize, font, color: rgb(0.35, 0.35, 0.35) });
  page.drawText(truncateToWidth(font, fields.shipperPhone || "-", valSize, maxW1 - 36), {
    x: c1x + leftPad + 36,
    y: cy,
    size: valSize,
    font,
  });
  cy -= 10;
  page.drawText("Pickup Address:", {
    x: c1x + leftPad,
    y: cy,
    size: labelSize,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });
  cy -= 9;
  drawText(page, fields.pickup || origin, c1x + leftPad, cy, {
    size: 7,
    font,
    maxWidth: maxW1,
    lineHeight: 8.5,
    maxLines: 3,
  });

  // Col2: Shipment Information + Remarks
  sectionHeader(page, fonts, c2x, bodyTop, col2W, hdrH, "Shipment Information");
  let my = bodyTop - hdrH - 8;
  const shipRows = [
    ["Pieces:", pdfSafe(fields.pieces) || "1"],
    ["Order Ref:", orderDisplay],
    ["Tracking No:", tracking],
    ["Origin:", origin.toUpperCase()],
    ["Destination:", dest.toUpperCase()],
    ["Return City:", origin.toUpperCase()],
  ];
  const shipValMax = col2W - 10 - 58;
  for (const [k, v] of shipRows) {
    page.drawText(k, { x: c2x + leftPad, y: my, size: labelSize, font, color: rgb(0.35, 0.35, 0.35) });
    page.drawText(truncateToWidth(bold, v, 7.5, shipValMax), {
      x: c2x + leftPad + 58,
      y: my,
      size: 7.5,
      font: bold,
    });
    my -= 11;
  }
  my -= 4;
  page.drawLine({
    start: { x: c2x + 2, y: my + 6 },
    end: { x: c2x + col2W - 2, y: my + 6 },
    thickness: 0.4,
    color: rgb(0.7, 0.7, 0.7),
  });
  sectionHeader(page, fonts, c2x, my + hdrH, col2W, hdrH, "Remarks");
  my -= 8;
  let instr = String(fields.instructions || "");
  const itemsIdx = instr.indexOf("| Items:");
  if (itemsIdx > 0) instr = instr.slice(0, itemsIdx).trim();
  if (!instr) instr = "Call customer before delivery. Do not leave parcel unattended. Allow to Open";
  drawText(page, instr, c2x + leftPad, my, {
    size: 7,
    font,
    maxWidth: col2W - 10,
    lineHeight: 8.5,
    maxLines: 5,
  });

  // Col3: Order Information + QR + Amount/Date/Type
  sectionHeader(page, fonts, c3x, bodyTop, col3W, hdrH, "Order Information");
  let oy3 = bodyTop - hdrH - 6;
  const qrSize = 58;
  const qrX = c3x + (col3W - qrSize) / 2;
  if (qrImg) {
    page.drawRectangle({
      x: qrX - 2,
      y: oy3 - qrSize - 2,
      width: qrSize + 4,
      height: qrSize + 4,
      color: rgb(1, 1, 1),
    });
    page.drawImage(qrImg, {
      x: qrX,
      y: oy3 - qrSize,
      width: qrSize,
      height: qrSize,
    });
    oy3 -= qrSize + 10;
  } else {
    oy3 -= 8;
  }

  const amount = pdfSafe(fields.cod) || "0";
  page.drawText("Amount:", {
    x: c3x + leftPad,
    y: oy3,
    size: labelSize,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });
  page.drawText(`${amount}/-`, {
    x: c3x + leftPad + 40,
    y: oy3,
    size: 11,
    font: bold,
    color: rgb(0.75, 0.05, 0.05),
  });
  oy3 -= 13;
  page.drawText("Date:", {
    x: c3x + leftPad,
    y: oy3,
    size: labelSize,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });
  page.drawText(pdfSafe(fields.date) || "-", {
    x: c3x + leftPad + 28,
    y: oy3,
    size: valSize,
    font: bold,
  });
  oy3 -= 12;
  page.drawText("Order Type:", {
    x: c3x + leftPad,
    y: oy3,
    size: labelSize,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });
  page.drawText(
    truncateToWidth(bold, fields.services || fields.bookingType || "Overnight", valSize, col3W - 60),
    {
      x: c3x + leftPad + 50,
      y: oy3,
      size: valSize,
      font: bold,
    }
  );

  // --- FOOTER: Order Details ---
  const footTop = bodyBottom;
  page.drawLine({
    start: { x: ox + 1, y: footTop },
    end: { x: ox + rw - 1, y: footTop },
    thickness: 0.7,
    color: rgb(0.4, 0.4, 0.4),
  });
  sectionHeader(page, fonts, innerX, footTop, innerW, hdrH, "Order Details");
  drawText(page, fields.product || "Car accessories", innerX + 4, footTop - hdrH - 8, {
    size: 8,
    font,
    maxWidth: innerW - 8,
    lineHeight: 9,
    maxLines: 1,
  });

  return { contentBottom: oy, usedHeight: rh };
}

async function prepareAirbillAssets(pdfDoc, html, orderNo) {
  const images = extractDataImages(html);
  if (orderNo && orderNo !== "-") {
    images.orderBarcode = await fetchPortalBarcodeDataUri(orderNo);
  }
  return embedImages(pdfDoc, images);
}

/**
 * Single airbill on a full A4 page (PostEx print behaviour).
 * Label sits in the top third; empty slots below so A4 paper + 100% scale match PostEx.
 * @param {string} invoiceLink
 * @param {{ orderNumber?: string }} [opts]
 */
export async function buildRunCourierAirbillPdf(invoiceLink, opts = {}) {
  return buildRunCourierAirbillsPdf([
    { invoiceLink, orderNumber: opts.orderNumber },
  ]);
}

/**
 * Build A4 PDF(s) with exactly 3 PostEx-style airbills per page (equal slots, full page).
 * @param {Array<{ invoiceLink: string, orderNumber?: string }>} items
 */
export async function buildRunCourierAirbillsPdf(items = []) {
  const list = (Array.isArray(items) ? items : []).filter((i) => i?.invoiceLink);
  if (!list.length) {
    return { success: false, error: "No airbills to build." };
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const labelW = A4_W - SIDE_MARGIN * 2;
  let trackingNumber = "";
  let page = null;
  let slot = 0;

  for (const item of list) {
    const prepared = await prepareRunCourierInvoiceHtml(item.invoiceLink);
    if (!prepared.success || !prepared.html) continue;
    const fields = parseAirbillFields(prepared.html);
    const orderNo = resolveOrderNo(fields, item.orderNumber);
    const embedded = await prepareAirbillAssets(pdfDoc, prepared.html, orderNo);
    if (!trackingNumber) trackingNumber = fields.tracking || "";

    if (!page || slot >= LABELS_PER_PAGE) {
      page = pdfDoc.addPage([A4_W, A4_H]);
      slot = 0;
    }

    const regionY = A4_H - PAGE_MARGIN - (slot + 1) * LABEL_H - slot * LABEL_GAP;
    drawAirbillIntoPage(
      page,
      { font, bold },
      embedded,
      fields,
      orderNo,
      { x: SIDE_MARGIN, y: regionY, width: labelW, height: LABEL_H }
    );
    slot += 1;
  }

  if (!pdfDoc.getPageCount()) {
    return { success: false, error: "Could not build any airbill pages." };
  }

  const bytes = await pdfDoc.save();
  return {
    success: true,
    pdf: Buffer.from(bytes),
    trackingNumber,
    count: list.length,
  };
}

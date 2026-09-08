/**
 * Run Courier airbill PDF — exactly 3 large labels per A4, equal slots, no empty footer.
 * Portal has no PDF API — we build from invoice HTML + order number from our DB.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prepareRunCourierInvoiceHtml } from "./runcourierInvoice.js";

const A4_W = 595.28;
const A4_H = 841.89;
/** Exactly 3 airbills per A4 — each slot fills 1/3 of the printable area. */
const LABELS_PER_PAGE = 3;
const PAGE_MARGIN = 8;
const SIDE_MARGIN = 10;
const LABEL_GAP = 6;
const LABEL_H = Math.floor(
  (A4_H - PAGE_MARGIN * 2 - LABEL_GAP * (LABELS_PER_PAGE - 1)) / LABELS_PER_PAGE
); // ~271pt

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
    const block = lines.slice(shipperIdx, shipperIdx + 35);
    const companyIdx = block.findIndex((l) => /^company:?$/i.test(l));
    const nameIdx = block.findIndex((l) => /^name:?$/i.test(l));
    if (companyIdx >= 0) company = block[companyIdx + 1] || company;
    if (nameIdx >= 0) consigneeName = block[nameIdx + 1] || "";

    const phoneIndexes = block
      .map((l, i) => (/^phone\s*no\s*:?$/i.test(l) ? i : -1))
      .filter((i) => i >= 0);
    if (phoneIndexes[0] != null) shipperPhone = block[phoneIndexes[0] + 1] || "";
    if (phoneIndexes[1] != null) consigneePhone = block[phoneIndexes[1] + 1] || "";

    const pickupIdx = block.findIndex((l) => /^pickup address:?$/i.test(l));
    if (pickupIdx >= 0) pickup = block[pickupIdx + 1] || "";
    const addressIndexes = block
      .map((l, i) => (/^address:?$/i.test(l) ? i : -1))
      .filter((i) => i >= 0);
    if (!pickup && addressIndexes[0] != null) pickup = block[addressIndexes[0] + 1] || "";
    if (addressIndexes.length) {
      const consigneeAddrIdx =
        addressIndexes.find((i) => i > (pickupIdx >= 0 ? pickupIdx : -1)) ??
        addressIndexes[addressIndexes.length - 1];
      consigneeAddress = block[consigneeAddrIdx + 1] || "";
    }
  }

  if (!consigneeName) consigneeName = valueAfter(lines, "Name");
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
  const out = { barcode: null, logo: null, qr: null };
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
  out.barcode = pngs[0]?.dataUri || null;
  out.logo = jpgs[0]?.dataUri || null;
  out.qr = pngs.length > 1 ? pngs[pngs.length - 1].dataUri : pngs[1]?.dataUri || null;
  return out;
}

function dataUriToBytes(dataUri) {
  const s = String(dataUri || "");
  const i = s.indexOf("base64,");
  if (i < 0) return null;
  return Buffer.from(s.slice(i + 7), "base64");
}

function pdfSafe(text) {
  return String(text || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
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

function resolveOrderNo(fields, orderNumber) {
  const fromDb = pdfSafe(orderNumber);
  if (fromDb) return fromDb;
  const fromPortal = pdfSafe(fields.orderId || fields.reference);
  if (fromPortal && fromPortal !== "0") return fromPortal;
  return "";
}

async function embedImages(pdfDoc, images) {
  let barcodeImg = null;
  let logoImg = null;
  let qrImg = null;
  try {
    if (images.barcode) barcodeImg = await pdfDoc.embedPng(dataUriToBytes(images.barcode));
  } catch {
    barcodeImg = null;
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
  return { barcodeImg, logoImg, qrImg };
}

/**
 * Draw one LARGE airbill into a fixed page region (fills the slot — no empty footer).
 * QR stays inset from the right edge so printers don't clip it.
 */
function drawAirbillIntoPage(page, fonts, images, fields, orderNo, region) {
  const { font, bold } = fonts;
  const { barcodeImg, logoImg, qrImg } = images;
  const { x: ox, y: oy, width: rw, height: rh } = region;
  const pad = 10;
  const contentW = rw - pad * 2;

  // Full-slot border (fills allocated height — no empty gap under content)
  page.drawRectangle({
    x: ox,
    y: oy,
    width: rw,
    height: rh,
    borderColor: rgb(0.15, 0.15, 0.15),
    borderWidth: 1.25,
    color: rgb(1, 1, 1),
  });

  let y = oy + rh - pad;

  // Reserved right column for QR (inset from border so printers don't clip it)
  const qrSize = 56;
  const qrInset = 14;
  const qrLeft = ox + rw - qrInset - qrSize;
  const headerRightLimit = qrLeft - 10;

  // --- Header: barcode | meta | QR ---
  if (barcodeImg) {
    const bw = Math.min(150, headerRightLimit - (ox + pad) - 160);
    const bh = Math.min(32, (barcodeImg.height / barcodeImg.width) * Math.max(bw, 120));
    page.drawImage(barcodeImg, {
      x: ox + pad,
      y: y - bh,
      width: Math.max(120, bw),
      height: bh,
    });
  }
  page.drawText(pdfSafe(fields.tracking) || "-", {
    x: ox + pad + 2,
    y: y - 42,
    size: 13,
    font: bold,
  });

  const metaX = ox + pad + 155;
  const metaColW = Math.max(70, (headerRightLimit - metaX) / 3);
  const meta = [
    ["Date", fields.date],
    ["Service", fields.services],
    ["Origin", fields.origin],
    ["Weight", fields.weight],
    ["Type", fields.bookingType],
    ["Dest", fields.destination],
  ];
  meta.forEach(([k, v], idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const mx = metaX + col * metaColW;
    const my = y - 6 - row * 20;
    page.drawText(k, { x: mx, y: my, size: 7, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(pdfSafe(v) || "-", { x: mx, y: my - 10, size: 9.5, font: bold });
  });

  if (qrImg) {
    // White pad under QR for quiet zone / scan reliability
    page.drawRectangle({
      x: qrLeft - 3,
      y: y - qrSize - 3,
      width: qrSize + 6,
      height: qrSize + 6,
      color: rgb(1, 1, 1),
      borderWidth: 0,
    });
    page.drawImage(qrImg, {
      x: qrLeft,
      y: y - qrSize,
      width: qrSize,
      height: qrSize,
    });
  }
  if (logoImg) {
    const lw = Math.min(52, qrSize + 4);
    const lh = Math.min(18, (logoImg.height / logoImg.width) * lw);
    page.drawImage(logoImg, {
      x: qrLeft + (qrSize - lw) / 2,
      y: y - qrSize - lh - 3,
      width: lw,
      height: lh,
    });
  }

  y = oy + rh - pad - 62;

  page.drawLine({
    start: { x: ox + pad, y },
    end: { x: ox + rw - pad, y },
    thickness: 0.7,
    color: rgb(0.55, 0.55, 0.55),
  });
  y -= 11;

  // --- Shipper / Consignee ---
  const colW = contentW / 2 - 8;
  const leftX = ox + pad;
  const rightX = ox + pad + colW + 12;
  page.drawText("SHIPPER", { x: leftX, y, size: 8, font: bold });
  page.drawText("CONSIGNEE", { x: rightX, y, size: 8, font: bold });
  y -= 11;

  page.drawText(pdfSafe(fields.company) || "crazzycars.pk", {
    x: leftX,
    y,
    size: 10,
    font: bold,
  });
  page.drawText(pdfSafe(fields.consigneeName) || "-", {
    x: rightX,
    y,
    size: 10,
    font: bold,
  });
  y -= 11;
  page.drawText(pdfSafe(fields.shipperPhone) || "-", { x: leftX, y, size: 9, font });
  page.drawText(pdfSafe(fields.consigneePhone) || "-", { x: rightX, y, size: 9, font });
  y -= 10;

  const leftEnd = drawText(page, fields.pickup, leftX, y, {
    size: 8.5,
    font,
    maxWidth: colW,
    lineHeight: 10,
    maxLines: 3,
  });
  const rightEnd = drawText(page, fields.consigneeAddress, rightX, y, {
    size: 8.5,
    font,
    maxWidth: colW,
    lineHeight: 10,
    maxLines: 3,
  });
  y = Math.min(leftEnd, rightEnd) - 8;

  page.drawLine({
    start: { x: ox + pad, y },
    end: { x: ox + rw - pad, y },
    thickness: 0.6,
    color: rgb(0.6, 0.6, 0.6),
  });
  y -= 12;

  const orderDisplay = orderNo || "-";
  page.drawText(`Order: ${orderDisplay}`, {
    x: leftX,
    y,
    size: 10,
    font: bold,
  });
  page.drawText(`Ref: ${orderDisplay}`, {
    x: leftX + 185,
    y,
    size: 10,
    font: bold,
  });
  page.drawText(`COD: Rs ${pdfSafe(fields.cod) || "0"}`, {
    x: leftX + 340,
    y,
    size: 12,
    font: bold,
    color: rgb(0.75, 0.05, 0.05),
  });
  page.drawText(`Pcs: ${pdfSafe(fields.pieces) || "1"}`, {
    x: leftX + 490,
    y,
    size: 10,
    font,
  });
  y -= 14;

  page.drawText("Product:", { x: leftX, y, size: 9, font: bold });
  y = drawText(page, fields.product, leftX + 48, y, {
    size: 9,
    font,
    maxWidth: contentW - 52,
    lineHeight: 11,
    maxLines: 2,
  });
  y -= 10;

  let instr = String(fields.instructions || "");
  const itemsIdx = instr.indexOf("| Items:");
  if (itemsIdx > 0) instr = instr.slice(0, itemsIdx).trim();
  page.drawText("Note:", { x: leftX, y, size: 9, font: bold });
  drawText(page, instr, leftX + 32, y, {
    size: 8,
    font,
    maxWidth: contentW - 36,
    lineHeight: 10,
    maxLines: 2,
  });

  return { contentBottom: oy, usedHeight: rh };
}

/**
 * @param {string} invoiceLink
 * @param {{ orderNumber?: string }} [opts]
 */
export async function buildRunCourierAirbillPdf(invoiceLink, opts = {}) {
  const prepared = await prepareRunCourierInvoiceHtml(invoiceLink);
  if (!prepared.success || !prepared.html) {
    return { success: false, error: prepared.error || "Could not load airbill." };
  }

  const fields = parseAirbillFields(prepared.html);
  const orderNo = resolveOrderNo(fields, opts.orderNumber);
  const images = extractDataImages(prepared.html);
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const embedded = await embedImages(pdfDoc, images);

  // Single label = one full 1/3-A4 slot (same size as batch labels).
  const labelW = A4_W - SIDE_MARGIN * 2;
  const page = pdfDoc.addPage([A4_W, LABEL_H + PAGE_MARGIN * 2]);
  drawAirbillIntoPage(
    page,
    { font, bold },
    embedded,
    fields,
    orderNo,
    { x: SIDE_MARGIN, y: PAGE_MARGIN, width: labelW, height: LABEL_H }
  );

  const bytes = await pdfDoc.save();
  return {
    success: true,
    pdf: Buffer.from(bytes),
    trackingNumber: fields.tracking || "",
    orderNumber: orderNo,
  };
}

/**
 * Build A4 PDF(s) with exactly 3 equal large airbills per page (no empty footer).
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
    const embedded = await embedImages(pdfDoc, extractDataImages(prepared.html));
    if (!trackingNumber) trackingNumber = fields.tracking || "";

    if (!page || slot >= LABELS_PER_PAGE) {
      page = pdfDoc.addPage([A4_W, A4_H]);
      slot = 0;
    }

    // Slot 0 = top, slot 2 = bottom — equal thirds fill the page.
    const regionY =
      A4_H - PAGE_MARGIN - (slot + 1) * LABEL_H - slot * LABEL_GAP;
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

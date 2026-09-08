/**
 * Compact Run Courier airbill PDF (half-A4 height so two fit on one A4 sheet).
 * Portal has no PDF API — we build from invoice HTML + order number from our DB.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prepareRunCourierInvoiceHtml } from "./runcourierInvoice.js";

const A4_W = 595.28;
const A4_H = 841.89;
/** One airbill sticker height — two stack cleanly on one A4. */
const LABEL_H = 410;

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
 * Draw one compact airbill into a page region (origin bottom-left of the region).
 */
function drawAirbillIntoPage(page, fonts, images, fields, orderNo, region) {
  const { font, bold } = fonts;
  const { barcodeImg, logoImg, qrImg } = images;
  const { x: ox, y: oy, width: rw, height: rh } = region;
  const margin = 8;
  const contentW = rw - margin * 2;
  const top = oy + rh - margin;

  // Outer border
  page.drawRectangle({
    x: ox + 2,
    y: oy + 2,
    width: rw - 4,
    height: rh - 4,
    borderColor: rgb(0.35, 0.35, 0.35),
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });

  // Cut line hint at bottom of sticker (for stacking on A4)
  page.drawLine({
    start: { x: ox + 10, y: oy + 6 },
    end: { x: ox + rw - 10, y: oy + 6 },
    thickness: 0.4,
    color: rgb(0.75, 0.75, 0.75),
    dashArray: [3, 3],
  });

  let y = top - 2;

  // --- Header: barcode | meta | qr+logo ---
  if (barcodeImg) {
    const bw = 120;
    const bh = Math.min(28, (barcodeImg.height / barcodeImg.width) * bw);
    page.drawImage(barcodeImg, {
      x: ox + margin,
      y: y - bh,
      width: bw,
      height: bh,
    });
  }
  page.drawText(pdfSafe(fields.tracking) || "-", {
    x: ox + margin + 4,
    y: y - 40,
    size: 11,
    font: bold,
  });

  const metaX = ox + margin + 130;
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
    const mx = metaX + col * 88;
    const my = y - 8 - row * 22;
    page.drawText(k, { x: mx, y: my, size: 6, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(pdfSafe(v) || "-", { x: mx, y: my - 9, size: 8, font: bold });
  });

  if (qrImg) {
    page.drawImage(qrImg, {
      x: ox + rw - margin - 52,
      y: y - 48,
      width: 44,
      height: 44,
    });
  }
  if (logoImg) {
    const lw = 44;
    const lh = Math.min(22, (logoImg.height / logoImg.width) * lw);
    page.drawImage(logoImg, {
      x: ox + rw - margin - 52,
      y: y - 48 - lh - 2,
      width: lw,
      height: lh,
    });
  }

  y -= 76;
  page.drawLine({
    start: { x: ox + margin, y },
    end: { x: ox + rw - margin, y },
    thickness: 0.6,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 12;

  // --- Shipper / Consignee ---
  const colW = contentW / 2 - 6;
  const leftX = ox + margin;
  const rightX = ox + margin + colW + 12;
  page.drawText("SHIPPER", { x: leftX, y, size: 7, font: bold });
  page.drawText("CONSIGNEE", { x: rightX, y, size: 7, font: bold });
  y -= 11;

  page.drawText(pdfSafe(fields.company) || "crazzycars.pk", {
    x: leftX,
    y,
    size: 8,
    font: bold,
  });
  page.drawText(pdfSafe(fields.consigneeName) || "-", {
    x: rightX,
    y,
    size: 8,
    font: bold,
  });
  y -= 10;
  page.drawText(pdfSafe(fields.shipperPhone) || "-", { x: leftX, y, size: 7, font });
  page.drawText(pdfSafe(fields.consigneePhone) || "-", { x: rightX, y, size: 7, font });
  y -= 10;

  const leftEnd = drawText(page, fields.pickup, leftX, y, {
    size: 7,
    font,
    maxWidth: colW,
    lineHeight: 8,
    maxLines: 2,
  });
  const rightEnd = drawText(page, fields.consigneeAddress, rightX, y, {
    size: 7,
    font,
    maxWidth: colW,
    lineHeight: 8,
    maxLines: 2,
  });
  y = Math.min(leftEnd, rightEnd) - 10;

  page.drawLine({
    start: { x: ox + margin, y: y + 4 },
    end: { x: ox + rw - margin, y: y + 4 },
    thickness: 0.5,
    color: rgb(0.75, 0.75, 0.75),
  });

  // --- Order no / COD row (order number on BOTH reference + order id) ---
  const orderDisplay = orderNo || "-";
  page.drawText(`Order No: ${orderDisplay}`, {
    x: leftX,
    y,
    size: 8,
    font: bold,
  });
  page.drawText(`Ref: ${orderDisplay}`, {
    x: leftX + 175,
    y,
    size: 8,
    font: bold,
  });
  page.drawText(`COD: Rs ${pdfSafe(fields.cod) || "0"}`, {
    x: leftX + 320,
    y,
    size: 10,
    font: bold,
    color: rgb(0.75, 0.05, 0.05),
  });
  page.drawText(`Pcs: ${pdfSafe(fields.pieces) || "1"}`, {
    x: leftX + 460,
    y,
    size: 8,
    font,
  });
  y -= 12;

  page.drawText("Product:", { x: leftX, y, size: 7, font: bold });
  y = drawText(page, fields.product, leftX + 42, y, {
    size: 7,
    font,
    maxWidth: contentW - 48,
    lineHeight: 8,
    maxLines: 2,
  });
  y -= 10;

  // Trim redundant "Items:" duplication from instructions for compact label
  let instr = String(fields.instructions || "");
  const itemsIdx = instr.indexOf("| Items:");
  if (itemsIdx > 0) instr = instr.slice(0, itemsIdx).trim();
  page.drawText("Note:", { x: leftX, y, size: 7, font: bold });
  drawText(page, instr, leftX + 28, y, {
    size: 6.5,
    font,
    maxWidth: contentW - 34,
    lineHeight: 7.5,
    maxLines: 2,
  });
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

  // Compact half-A4 page — print 2 pages/sheet or stack two labels on A4 via batch builder.
  const page = pdfDoc.addPage([A4_W, LABEL_H]);
  drawAirbillIntoPage(
    page,
    { font, bold },
    embedded,
    fields,
    orderNo,
    { x: 0, y: 0, width: A4_W, height: LABEL_H }
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
 * Build one A4 PDF with up to 2 airbills per page (stacked).
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
  let trackingNumber = "";
  let page = null;
  let slot = 0; // 0 = top, 1 = bottom

  for (const item of list) {
    const prepared = await prepareRunCourierInvoiceHtml(item.invoiceLink);
    if (!prepared.success || !prepared.html) continue;
    const fields = parseAirbillFields(prepared.html);
    const orderNo = resolveOrderNo(fields, item.orderNumber);
    const embedded = await embedImages(pdfDoc, extractDataImages(prepared.html));
    if (!trackingNumber) trackingNumber = fields.tracking || "";

    if (!page || slot > 1) {
      page = pdfDoc.addPage([A4_W, A4_H]);
      slot = 0;
    }

    const regionY = slot === 0 ? A4_H - LABEL_H - 10 : 10;
    drawAirbillIntoPage(
      page,
      { font, bold },
      embedded,
      fields,
      orderNo,
      { x: 0, y: regionY, width: A4_W, height: LABEL_H }
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

/**
 * Build a real PDF airbill from Run Courier portal invoice HTML + inlined images.
 * Portal has no PDF API; html2canvas often captures blank due to floated layout.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prepareRunCourierInvoiceHtml } from "./runcourierInvoice.js";

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
        if (/^(shipper|consignee|company|name|phone|address|date|services|origin|destination|weight|booking|reference|order|cod|no\.|product|special|kindly|run courier)/i.test(v)) {
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

  // Header cells are emitted as 3 labels then 3 values (portal table row).
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

  // Shipper | Consignee are side-by-side (headers adjacent), then paired fields.
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
    reference: valueAfter(lines, "Reference No. #") || valueAfter(lines, "Reference No.") || "0",
    orderId,
    cod,
    pieces: valueAfter(lines, "No. of Pieces") || "1",
    product,
    instructions: valueAfter(lines, "Special Instruction") || "",
    disclaimer: lines
      .filter((l) => /run courier|kindly do not|aggregate model/i.test(l))
      .slice(0, 4)
      .join(" "),
  };
}

function extractDataImages(html) {
  const out = { barcode: null, logo: null, qr: null };
  const re = /<img\b[^>]*src=(["'])(data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=\s]+)\1[^>]*>/gi;
  const imgs = [];
  let m;
  while ((m = re.exec(html))) {
    imgs.push({ tag: m[0], dataUri: m[2].replace(/\s+/g, "") });
  }
  // Portal order: barcode png, logo jpg, qr png
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

function drawText(page, text, x, y, opts = {}) {
  const {
    size = 9,
    font,
    color = rgb(0.05, 0.05, 0.05),
    maxWidth = 0,
    lineHeight = 11,
  } = opts;
  const value = String(text || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E\n]/g, "")
    .trim();
  if (!value) return y;
  if (!maxWidth) {
    page.drawText(value, { x, y, size, font, color });
    return y;
  }
  const words = value.split(/\s+/);
  let line = "";
  let cy = y;
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    const width = font.widthOfTextAtSize(next, size);
    if (width > maxWidth && line) {
      page.drawText(line, { x, y: cy, size, font, color });
      cy -= lineHeight;
      line = w;
    } else {
      line = next;
    }
  }
  if (line) {
    page.drawText(line, { x, y: cy, size, font, color });
  }
  return cy;
}

function drawBox(page, x, y, w, h, border = rgb(0.75, 0.75, 0.75)) {
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    borderColor: border,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });
}

function drawLabelValue(page, font, bold, x, y, label, value, maxWidth) {
  page.drawText(String(label), { x, y, size: 8, font: bold, color: rgb(0.2, 0.2, 0.2) });
  return drawText(page, value, x + 72, y, { size: 9, font, maxWidth: maxWidth - 72, lineHeight: 11 });
}

/**
 * @returns {Promise<{ success: boolean, pdf?: Buffer, error?: string, trackingNumber?: string }>}
 */
export async function buildRunCourierAirbillPdf(invoiceLink) {
  const prepared = await prepareRunCourierInvoiceHtml(invoiceLink);
  if (!prepared.success || !prepared.html) {
    return { success: false, error: prepared.error || "Could not load airbill." };
  }

  const fields = parseAirbillFields(prepared.html);
  const images = extractDataImages(prepared.html);
  const pdfDoc = await PDFDocument.create();
  // Landscape-ish airbill on A4 portrait top half (matches sticker print)
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 24;
  const contentW = 595.28 - margin * 2;
  let yTop = 841.89 - margin;

  // Outer border for airbill block (~ half page)
  const blockH = 400;
  const blockY = yTop - blockH;
  drawBox(page, margin, blockY, contentW, blockH, rgb(0.55, 0.55, 0.55));

  // Header row: barcode | meta | logo/qr
  let barcodeImg = null;
  let logoImg = null;
  let qrImg = null;
  try {
    if (images.barcode) {
      barcodeImg = await pdfDoc.embedPng(dataUriToBytes(images.barcode));
    }
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
    if (images.qr) {
      qrImg = await pdfDoc.embedPng(dataUriToBytes(images.qr));
    }
  } catch {
    qrImg = null;
  }

  const headerY = yTop - 8;
  if (barcodeImg) {
    const bw = 150;
    const bh = (barcodeImg.height / barcodeImg.width) * bw;
    page.drawImage(barcodeImg, {
      x: margin + 10,
      y: headerY - bh - 4,
      width: bw,
      height: bh,
    });
  }
  page.drawText(fields.tracking || "-", {
    x: margin + 20,
    y: headerY - 58,
    size: 12,
    font: bold,
  });

  // Meta grid
  const metaX = margin + 175;
  const metaItems = [
    ["Date", fields.date],
    ["Services", fields.services],
    ["Origin", fields.origin],
    ["Weight", fields.weight],
    ["Booking", fields.bookingType],
    ["Destination", fields.destination],
  ];
  let my = headerY - 14;
  metaItems.forEach(([k, v], idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = metaX + col * 95;
    const y = my - row * 28;
    page.drawText(k, { x, y, size: 7, font, color: rgb(0.35, 0.35, 0.35) });
    page.drawText(String(v || "-"), { x, y: y - 11, size: 9, font: bold });
  });

  if (qrImg) {
    page.drawImage(qrImg, {
      x: margin + contentW - 78,
      y: headerY - 70,
      width: 58,
      height: 58,
    });
  }
  if (logoImg) {
    const lw = 58;
    const lh = Math.min(50, (logoImg.height / logoImg.width) * lw);
    page.drawImage(logoImg, {
      x: margin + contentW - 78,
      y: headerY - 70 - lh - 4,
      width: lw,
      height: lh,
    });
  }

  // Divider under header
  const midY = headerY - 120;
  page.drawLine({
    start: { x: margin, y: midY },
    end: { x: margin + contentW, y: midY },
    thickness: 0.8,
    color: rgb(0.7, 0.7, 0.7),
  });

  // Shipper / Consignee columns
  const colW = contentW / 2 - 8;
  let sy = midY - 16;
  page.drawText("SHIPPER", { x: margin + 8, y: sy, size: 9, font: bold, color: rgb(0.15, 0.15, 0.15) });
  page.drawText("CONSIGNEE", {
    x: margin + 8 + colW + 8,
    y: sy,
    size: 9,
    font: bold,
    color: rgb(0.15, 0.15, 0.15),
  });
  sy -= 16;
  drawLabelValue(page, font, bold, margin + 8, sy, "Company:", fields.company, colW);
  drawLabelValue(
    page,
    font,
    bold,
    margin + 8 + colW + 8,
    sy,
    "Name:",
    fields.consigneeName,
    colW
  );
  sy -= 14;
  drawLabelValue(page, font, bold, margin + 8, sy, "Phone:", fields.shipperPhone, colW);
  drawLabelValue(
    page,
    font,
    bold,
    margin + 8 + colW + 8,
    sy,
    "Phone:",
    fields.consigneePhone,
    colW
  );
  sy -= 14;
  page.drawText("Pickup Address:", {
    x: margin + 8,
    y: sy,
    size: 8,
    font: bold,
    color: rgb(0.2, 0.2, 0.2),
  });
  page.drawText("Address:", {
    x: margin + 8 + colW + 8,
    y: sy,
    size: 8,
    font: bold,
    color: rgb(0.2, 0.2, 0.2),
  });
  sy -= 12;
  const leftEnd = drawText(page, fields.pickup, margin + 8, sy, {
    size: 8,
    font,
    maxWidth: colW - 4,
    lineHeight: 10,
  });
  const rightEnd = drawText(page, fields.consigneeAddress, margin + 8 + colW + 8, sy, {
    size: 8,
    font,
    maxWidth: colW - 4,
    lineHeight: 10,
  });
  sy = Math.min(leftEnd, rightEnd) - 18;

  page.drawLine({
    start: { x: margin, y: sy + 8 },
    end: { x: margin + contentW, y: sy + 8 },
    thickness: 0.6,
    color: rgb(0.75, 0.75, 0.75),
  });

  // COD / pieces row
  page.drawText(`Reference #: ${fields.reference || "0"}`, {
    x: margin + 8,
    y: sy,
    size: 9,
    font,
  });
  page.drawText(`Order ID: ${fields.orderId || "—"}`, {
    x: margin + 160,
    y: sy,
    size: 9,
    font,
  });
  page.drawText(`COD: Rs ${fields.cod || "0"}`, {
    x: margin + 320,
    y: sy,
    size: 11,
    font: bold,
    color: rgb(0.75, 0.1, 0.1),
  });
  page.drawText(`Pieces: ${fields.pieces || "1"}`, {
    x: margin + 460,
    y: sy,
    size: 9,
    font,
  });
  sy -= 18;

  page.drawText("Product:", { x: margin + 8, y: sy, size: 8, font: bold });
  sy = drawText(page, fields.product, margin + 55, sy, {
    size: 8,
    font,
    maxWidth: contentW - 70,
    lineHeight: 10,
  });
  sy -= 14;
  page.drawText("Special Instruction:", { x: margin + 8, y: sy, size: 8, font: bold });
  sy = drawText(page, fields.instructions, margin + 8, sy - 12, {
    size: 8,
    font,
    maxWidth: contentW - 16,
    lineHeight: 10,
  });
  sy -= 16;
  drawText(page, fields.disclaimer, margin + 8, Math.max(blockY + 10, sy), {
    size: 6.5,
    font,
    color: rgb(0.35, 0.35, 0.35),
    maxWidth: contentW - 16,
    lineHeight: 8,
  });

  const bytes = await pdfDoc.save();
  return {
    success: true,
    pdf: Buffer.from(bytes),
    trackingNumber: fields.tracking || "",
  };
}

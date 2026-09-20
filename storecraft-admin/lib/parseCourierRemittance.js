/**
 * Auto-detect courier remittance PDF, screenshot, or Excel/CSV and parse.
 */
import { extractPdfText, parsePostexCprText } from "@/lib/postexCprParse";
import { looksLikeRunCourierRemit, parseRunCourierRemitText } from "@/lib/runCourierRemitParse";
import {
  extractScreenshotText,
  isRemittanceImage,
  normalizeOcrRemittanceText,
} from "@/lib/extractScreenshotText";
import {
  isRemittanceSpreadsheet,
  parseRemittanceSpreadsheet,
} from "@/lib/parseRemittanceSpreadsheet";

function isPdf(meta = {}) {
  const name = String(meta.filename || meta.name || "").toLowerCase();
  const mime = String(meta.mimeType || meta.type || "").toLowerCase();
  return mime === "application/pdf" || name.endsWith(".pdf");
}

/**
 * Parse a single remittance buffer (PDF, image, or Excel/CSV).
 * @param {Buffer} buffer
 * @param {{ filename?: string, mimeType?: string, name?: string, type?: string }} [meta]
 */
export async function parseCourierRemittance(buffer, meta = {}) {
  if (isRemittanceSpreadsheet(meta)) {
    return parseRemittanceSpreadsheet(buffer, meta);
  }

  let text = "";
  let source = "pdf";

  if (isRemittanceImage(meta)) {
    source = "screenshot";
    text = await extractScreenshotText(buffer);
  } else if (isPdf(meta) || (!meta.filename && !meta.mimeType)) {
    source = "pdf";
    text = await extractPdfText(buffer);
  } else {
    try {
      source = "screenshot";
      text = await extractScreenshotText(buffer);
    } catch {
      text = await extractPdfText(buffer);
      source = "pdf";
    }
  }

  text = normalizeOcrRemittanceText(text);

  if (/Cash Payment Receipt|CPR-[A-Z0-9]+/i.test(text)) {
    const parsed = parsePostexCprText(text);
    return { ...parsed, source };
  }
  if (looksLikeRunCourierRemit(text)) {
    const parsed = parseRunCourierRemitText(text);
    return { ...parsed, source };
  }

  const preview = text.replace(/\s+/g, " ").trim().slice(0, 160);
  throw new Error(
    source === "screenshot"
      ? `Screenshot OCR found no tracking IDs (GW… / PostEx CN). Make sure the CN column is visible and sharp. OCR preview: “${preview}…”`
      : "Unrecognized file. Upload a PostEx CPR PDF, Run Courier Excel/CSV, remittance PDF, or a clear screenshot."
  );
}

/** @deprecated use parseCourierRemittance */
export async function parseCourierRemittancePdf(buffer) {
  return parseCourierRemittance(buffer, { filename: "remittance.pdf", mimeType: "application/pdf" });
}

/**
 * Merge multiple remittance files into one batch (dedupe by tracking).
 * @param {Array<{ buffer: Buffer, filename?: string, mimeType?: string }>} files
 */
export async function parseCourierRemittanceFiles(files) {
  const list = Array.isArray(files) ? files.filter((f) => f?.buffer?.length) : [];
  if (!list.length) throw new Error("No files uploaded.");

  if (list.length === 1) {
    return parseCourierRemittance(list[0].buffer, list[0]);
  }

  const parsedParts = [];
  for (const f of list) {
    parsedParts.push(await parseCourierRemittance(f.buffer, f));
  }

  const lineByTn = new Map();
  for (const part of parsedParts) {
    for (const line of part.lines || []) {
      const key = String(line.trackingNumber || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
      if (!key) continue;
      if (!lineByTn.has(key)) lineByTn.set(key, line);
    }
  }
  const lines = [...lineByTn.values()];
  if (!lines.length) {
    throw new Error("No tracking lines found across the uploaded files.");
  }

  const primary = parsedParts[0];
  const delivered = lines.filter((l) => l.status === "Delivered");
  const returned = lines.filter((l) => l.status === "Return");
  const sum = (arr, key) =>
    Math.round(arr.reduce((s, l) => s + (Number(l[key]) || 0), 0) * 100) / 100;

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const sources = new Set(parsedParts.map((p) => p.source || "pdf"));
  const source =
    sources.size === 1 ? [...sources][0] : sources.has("excel") ? "excel" : "mixed";

  const cprNumber =
    primary.cprNumber && !/^RC-\d{8}-/i.test(primary.cprNumber)
      ? primary.cprNumber
      : `RC-MULTI-${stamp}-${lines.length}`;

  return {
    cprNumber,
    cprDate: primary.cprDate || null,
    courier: primary.courier || "Run Courier",
    deliveredCount: delivered.length,
    returnedCount: returned.length,
    codTotal: sum(delivered, "codAmount"),
    shippingCharges: sum(lines, "shippingCharges"),
    gst: sum(lines, "gst"),
    deduction4pct: sum(lines, "deduction4pct"),
    netTotal: sum(delivered, "netAmount"),
    lines,
    source,
    fileCount: list.length,
  };
}

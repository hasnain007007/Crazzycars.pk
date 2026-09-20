/**
 * OCR remittance screenshots (Run Courier portal often blocks PDF download).
 * Uses tesseract.js; preprocesses with sharp when available for clearer text.
 */

function isImageMime(mime, name = "") {
  const m = String(mime || "").toLowerCase();
  const n = String(name || "").toLowerCase();
  if (/^image\/(png|jpe?g|webp|gif|bmp)$/.test(m)) return true;
  return /\.(png|jpe?g|webp|gif|bmp)$/i.test(n);
}

export function isRemittanceImage(fileMeta = {}) {
  return isImageMime(fileMeta.mimeType || fileMeta.type, fileMeta.filename || fileMeta.name);
}

/**
 * Optional contrast boost for phone screenshots.
 * @param {Buffer} buffer
 * @returns {Promise<Buffer>}
 */
async function preprocessForOcr(buffer) {
  try {
    const sharpMod = await import("sharp");
    const sharp = sharpMod.default || sharpMod;
    return await sharp(buffer)
      .rotate() // honor EXIF
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer();
  } catch {
    return buffer;
  }
}

/**
 * Fix common OCR mistakes around GW tracking IDs.
 * @param {string} text
 */
export function normalizeOcrRemittanceText(text) {
  let t = String(text || "").replace(/\u00a0/g, " ");
  // G W 7543… / GW 7543… → GW7543…
  t = t.replace(/\bG[\s._-]*W[\s._-]*(\d{8,})\b/gi, (_, d) => `GW${d}`);
  // 0W / O W misreads of GW
  t = t.replace(/\b[O0][\s._-]*W[\s._-]*(\d{8,})\b/gi, (_, d) => `GW${d}`);
  // GVV / CW occasional misreads
  t = t.replace(/\b(?:GVV|CW|OW)[\s._-]*(\d{8,})\b/gi, (_, d) => `GW${d}`);
  // ORD spaces
  t = t.replace(/\bORD[\s_-]*(\d{4})[\s_-]*(\d+)\b/gi, (_, y, n) => `ORD-${y}-${n}`);
  // Collapse weird newlines glued to money
  t = t.replace(/(\d)\s+\.\s+(\d{2})\b/g, "$1.$2");
  return t;
}

/**
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
export async function extractScreenshotText(buffer) {
  const prepared = await preprocessForOcr(Buffer.from(buffer));
  const Tesseract = await import("tesseract.js");
  const recognize = Tesseract.recognize || Tesseract.default?.recognize;
  if (typeof recognize !== "function") {
    throw new Error("OCR engine unavailable (tesseract.js).");
  }
  const result = await recognize(prepared, "eng", {
    logger: () => {},
  });
  const text = String(result?.data?.text || result?.text || "");
  if (!text.trim()) {
    throw new Error("Could not read text from screenshot. Try a clearer full-page capture.");
  }
  return normalizeOcrRemittanceText(text);
}

/**
 * Auto-detect courier remittance PDF type and parse.
 */
import { extractPdfText, parsePostexCprText } from "@/lib/postexCprParse";
import { looksLikeRunCourierRemit, parseRunCourierRemitText } from "@/lib/runCourierRemitParse";

/**
 * @param {Buffer} buffer
 */
export async function parseCourierRemittancePdf(buffer) {
  const text = await extractPdfText(buffer);
  if (/Cash Payment Receipt|CPR-[A-Z0-9]+/i.test(text)) {
    return parsePostexCprText(text);
  }
  if (looksLikeRunCourierRemit(text)) {
    return parseRunCourierRemitText(text);
  }
  throw new Error(
    "Unrecognized PDF. Upload a PostEx Cash Payment Receipt (CPR) or a Run Courier / Leopard remittance sheet with tracking IDs."
  );
}

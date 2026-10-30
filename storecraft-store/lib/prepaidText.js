/**
 * Prepaid-only products (body kits): no COD wording in any shown text.
 * Shared by the render-time guard (scrubPaymentClaims) and scripts/fix-prepaid-text-2026-10.mjs
 * so the stored text and the page follow the same rule. No `@/` imports (scripts use it).
 */
import { STORE_POLICY } from "../config/store-policy.js";

const pkr = (n) => Number(n).toLocaleString("en-PK");

export const PREPAID_TEXT_LINE = `Prepaid only — pay by JazzCash, Meezan or bank transfer. Delivery Rs ${pkr(
  STORE_POLICY.shipping.standardFeePKR
)} (Rs ${pkr(STORE_POLICY.shipping.bulkyFeePKR || 500)} with bulky items).`;

const COD_WORDS = /\b(cash on delivery|COD|booking advance)\b/i;
/** Sentences that correctly say COD is NOT offered stay. */
const NEGATED = /\b(not available|isn't available|is not offered|not offered|without (COD|cash on delivery)|not COD|no (COD|cash on delivery))\b/i;
/** One sentence of text (never crosses an HTML tag). */
const SENTENCE = /[^.!?<>\n]*[.!?]?/g;

/**
 * Replace every sentence that mentions COD / booking advance with PREPAID_TEXT_LINE (once).
 * Works on plain text and on HTML (tags are left in place; empty <p>/<li> are dropped).
 */
export function stripCodSentences(raw, replacement = PREPAID_TEXT_LINE) {
  const text = String(raw ?? "");
  if (!text || !COD_WORDS.test(text)) return text;
  // Text that already states prepaid only gets the COD sentences removed, not a second line.
  let used = text.includes(replacement) || /\bprepaid only\b/i.test(text);
  const out = text.replace(SENTENCE, (sentence) => {
    // Keep questions ("Is Cash on Delivery available…?") — their answers say no.
    if (!sentence.trim() || !COD_WORDS.test(sentence) || NEGATED.test(sentence) || sentence.trim().endsWith("?")) {
      return sentence;
    }
    const lead = sentence.match(/^\s*/)[0];
    if (used) return "";
    used = true;
    return `${lead}${replacement}`;
  });
  return out
    .replace(/<(p|li)[^>]*>\s*<\/\1>/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;])/g, "$1")
    .trim();
}

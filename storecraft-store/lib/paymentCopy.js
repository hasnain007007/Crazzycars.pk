/**
 * Single source for payment / trust lines used on PDP, category FAQs,
 * Offer schema, llms.txt, and related storefront copy.
 * Do not invent alternate COD/prepaid wording elsewhere.
 */
import { stripCodSentences } from "./prepaidText.js";

export const COD_LINE =
  "Cash on Delivery across Pakistan (small advance booking)";

export const PREPAID_LINE = "Prepaid order, delivery across Pakistan";

export const TRUST_LINE =
  "CrazzyCars.pk, Gujranwala car accessories shop since 2023, WhatsApp 03284010007.";

/** Category FAQ first answer (non–body-kit categories). */
export const CATEGORY_COD_FAQ_ANSWER =
  "Yes, on eligible items. Cash on Delivery across Pakistan (small advance booking): pay a small booking amount, then the balance on delivery. Body kits are prepaid.";

/** Body-kit category COD FAQ answer — first line must be PREPAID_LINE. */
export const BODY_KIT_COD_FAQ_ANSWER = `${PREPAID_LINE}. Cash on Delivery is not available for body kits — pay with JazzCash, Meezan, or bank transfer before we ship.`;

export function paymentLineForProduct(allowsCod) {
  return allowsCod ? COD_LINE : PREPAID_LINE;
}

/**
 * Replace banned / outdated COD marketing phrases in product HTML or plain text
 * without mutating stored admin SEO fields. Used at render / JSON-LD time.
 */
export function scrubPaymentClaims(text, allowsCod = true) {
  let t = String(text || "");
  if (!t) return t;
  const line = paymentLineForProduct(allowsCod);
  t = t.replace(
    /Cash on Delivery all over Pakistan\s*[—–-]?\s*WhatsApp\s*0?3284010007!?/gi,
    line
  );
  t = t.replace(/Yes\s*[—–-]\s*Cash on Delivery all over Pakistan!?/gi, line);
  t = t.replace(/Cash on Delivery available nationwide/gi, line);
  t = t.replace(/Backed by CrazzyCars nationwide Cash on Delivery/gi, TRUST_LINE);
  t = t.replace(/No advance payment required/gi, line);
  t = t.replace(/COD orders need a small booking[^.<]*/gi, COD_LINE);
  // Prepaid products: any remaining COD / booking-advance sentence becomes the prepaid line.
  if (!allowsCod) t = stripCodSentences(t);
  return t;
}

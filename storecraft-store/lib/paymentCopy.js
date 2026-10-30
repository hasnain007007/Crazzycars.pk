/**
 * Single source for payment / trust lines used on PDP, category FAQs,
 * Offer schema, llms.txt, and related storefront copy.
 * Do not invent alternate COD/prepaid wording elsewhere.
 */
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

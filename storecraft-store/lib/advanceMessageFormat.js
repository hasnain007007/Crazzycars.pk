/**
 * Pure helpers for COD / advance payment CMS templates.
 * Kept free of path aliases so unit tests can import via relative path.
 */
import { formatPrice, roundRupees } from "./currency.js";

/**
 * Collapse doubled currency tokens ("Rs. Rs.300", "PKR PKR 300").
 * Safe on already-correct strings.
 */
export function collapseRepeatedCurrencyPrefix(text) {
  return String(text || "")
    .replace(/(Rs\.?\s*){2,}/gi, "Rs.")
    .replace(/(PKR\s*){2,}/gi, "PKR ");
}

/**
 * Replace {amount} with a formatted price without doubling an existing Rs./PKR prefix
 * already present in the CMS template.
 */
export function fillAmountPlaceholder(message, amount) {
  const amt = Math.max(0, roundRupees(amount));
  const amountStr = formatPrice(amt);
  let body = String(message || "");
  body = body.replace(/(Rs\.?\s*|PKR\s*)\{amount\}/gi, amountStr);
  body = body.replace(/\{amount\}/gi, amountStr);
  return collapseRepeatedCurrencyPrefix(body);
}

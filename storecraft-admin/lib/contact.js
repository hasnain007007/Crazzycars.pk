/**
 * Thin PK phone / WhatsApp helpers (mirrors storecraft-store/lib/contact.ts).
 * Prefer settings when present; fall back to confirmed store defaults.
 */

export const PHONE_E164 = "+923284010007";
export const PHONE_DISPLAY = "0328 4010007";

/**
 * Normalize any common PK mobile form to +923xxxxxxxxx.
 * Accepts 03xxxxxxxxx, 3xxxxxxxxx, 923xxxxxxxxx, +923xxxxxxxxx.
 */
export function toE164PK(input) {
  let digits = String(input || "").replace(/\D/g, "");
  if (!digits) return PHONE_E164;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) {
    digits = `92${digits.slice(1)}`;
  } else if (digits.length === 10 && digits.startsWith("3")) {
    digits = `92${digits}`;
  } else if (digits.startsWith("920") && digits.length === 13) {
    digits = `92${digits.slice(3)}`;
  }
  if (!digits.startsWith("92") && digits.length >= 10) {
    digits = `92${digits.replace(/^0+/, "")}`;
  }
  return `+${digits}`;
}

/** Digits only for wa.me (923xxxxxxxxx). */
export function waMeDigits(input) {
  return toE164PK(input ?? PHONE_E164).replace(/\D/g, "");
}

/** https://wa.me/923… with optional prefilled text. */
export function waLink(e164OrLocal, text) {
  const digits = waMeDigits(e164OrLocal);
  const base = `https://wa.me/${digits}`;
  if (text == null || String(text).trim() === "") return base;
  return `${base}?text=${encodeURIComponent(String(text))}`;
}

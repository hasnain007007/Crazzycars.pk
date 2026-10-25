/**
 * Single source for store phone / WhatsApp links (Pakistan).
 * Prefer settings when present; fall back to confirmed store defaults.
 */
import { STORE_CONTACT } from "@/config/store-policy";

export const PHONE_E164 = STORE_CONTACT.phoneE164 || "+923284010007";
export const PHONE_DISPLAY = "0328 4010007";
export const WHATSAPP_URL = `https://wa.me/${PHONE_E164.replace(/\D/g, "")}`;

/**
 * Normalize any common PK mobile form to +923xxxxxxxxx.
 * Accepts 03xxxxxxxxx, 3xxxxxxxxx, 923xxxxxxxxx, +923xxxxxxxxx.
 */
export function toE164PK(input: unknown): string {
  let digits = String(input || "").replace(/\D/g, "");
  if (!digits) return PHONE_E164;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) {
    digits = `92${digits.slice(1)}`;
  } else if (digits.length === 10 && digits.startsWith("3")) {
    digits = `92${digits}`;
  } else if (digits.startsWith("920") && digits.length === 13) {
    // Rare: 9203… → 923…
    digits = `92${digits.slice(3)}`;
  }
  if (!digits.startsWith("92") && digits.length >= 10) {
    digits = `92${digits.replace(/^0+/, "")}`;
  }
  return `+${digits}`;
}

/** Digits only for wa.me (923xxxxxxxxx). */
export function waMeDigits(input?: unknown): string {
  return toE164PK(input ?? PHONE_E164).replace(/\D/g, "");
}

/** https://wa.me/923… with optional prefilled text. */
export function waLink(e164OrLocal?: unknown, text?: string): string {
  const digits = waMeDigits(e164OrLocal);
  const base = `https://wa.me/${digits}`;
  if (text == null || String(text).trim() === "") return base;
  return `${base}?text=${encodeURIComponent(String(text))}`;
}

/** tel:+923… href */
export function telHref(input?: unknown): string {
  return `tel:${toE164PK(input ?? PHONE_E164)}`;
}

/** Schema.org telephone — always E.164 with leading +. */
export function schemaTelephone(input?: unknown): string {
  return toE164PK(input ?? PHONE_E164);
}

/** Display string for UI (keeps local 03… style when input is local). */
export function phoneDisplay(input?: unknown): string {
  const e164 = toE164PK(input ?? PHONE_E164);
  const d = e164.replace(/\D/g, "");
  if (d.startsWith("92") && d.length === 12) {
    return `0${d.slice(2, 5)} ${d.slice(5)}`;
  }
  return PHONE_DISPLAY;
}

/**
 * Guest-checkout emails are synthetic placeholders, not real inboxes.
 * Display phone + “Guest checkout” instead of guest+…@guest.checkout.
 */

const GUEST_EMAIL_RE = /^(guest\+|invoice\+)/i;
const GUEST_DOMAIN_RE = /@(guest\.checkout|guest\.invoice)$/i;

export function isGuestCheckoutEmail(email) {
  const e = String(email || "").trim();
  if (!e) return false;
  return GUEST_EMAIL_RE.test(e) || GUEST_DOMAIN_RE.test(e);
}

/** Digits only, for matching / display. */
export function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

/**
 * Prefer real phone; fall back to digits embedded in guest+{phone}@… email.
 */
export function resolveCustomerPhone({ phone, email } = {}) {
  const fromPhone = digitsOnly(phone);
  if (fromPhone.length >= 10) return fromPhone;
  const e = String(email || "");
  const m = e.match(/^(?:guest|invoice)\+(\d+)@/i);
  if (m?.[1]) return m[1];
  return fromPhone || "";
}

/** Loose PK-friendly display: 03xx… or +92… */
export function formatPhoneDisplay(phone) {
  const d = digitsOnly(phone);
  if (!d) return "";
  if (d.length === 11 && d.startsWith("0")) {
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  }
  if (d.length === 12 && d.startsWith("92")) {
    return `+${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  }
  return d;
}

/**
 * Secondary line under customer name in the orders list.
 * @returns {{ primary: string, secondary?: string, isGuest: boolean }}
 */
export function formatCustomerListMeta({ name, email, phone } = {}) {
  const resolvedPhone = resolveCustomerPhone({ phone, email });
  const phoneLabel = formatPhoneDisplay(resolvedPhone);

  if (isGuestCheckoutEmail(email)) {
    return {
      primary: name || "Guest",
      secondary: phoneLabel ? `Guest checkout · ${phoneLabel}` : "Guest checkout",
      isGuest: true,
      phone: resolvedPhone,
    };
  }

  return {
    primary: name || "—",
    secondary: phoneLabel || email || "",
    isGuest: false,
    phone: resolvedPhone,
  };
}

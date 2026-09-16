/**
 * Pakistani mobile normalize / validate for customer accounts.
 * Canonical form: 03XXXXXXXXX (11 digits).
 */
export function digitsOnly(raw) {
  return String(raw || "").replace(/\D/g, "");
}

/**
 * @returns {string} normalized 03… phone, or "" if invalid/empty
 */
export function normalizePkMobile(raw) {
  let d = digitsOnly(raw);
  if (!d) return "";
  if (d.startsWith("92") && d.length >= 12) d = `0${d.slice(2)}`;
  if (d.length === 10 && d.startsWith("3")) d = `0${d}`;
  if (!/^03\d{9}$/.test(d)) return "";
  return d;
}

export function isValidPkMobile(raw) {
  return Boolean(normalizePkMobile(raw));
}

/** Guest checkout placeholder email for a normalized phone. */
export function guestEmailForNormalizedPhone(phone) {
  const p = normalizePkMobile(phone);
  if (!p) return "";
  return `guest+${p}@guest.checkout`;
}

/**
 * Pakistan mobile normalize/validate (admin twin of storecraft-store/lib/pkPhone.js).
 */

export function digitsOnly(raw) {
  return String(raw || "").replace(/\D/g, "");
}

export function normalizePkMobile(raw) {
  let digits = digitsOnly(raw);
  if (digits.startsWith("0092")) digits = digits.slice(2);
  if (digits.startsWith("92") && digits.length === 12) {
    digits = `0${digits.slice(2)}`;
  }
  if (digits.length === 10 && digits.startsWith("3")) {
    digits = `0${digits}`;
  }
  const ok = /^03\d{9}$/.test(digits);
  const waDigits = ok ? `92${digits.slice(1)}` : "";
  return {
    ok,
    normalized: ok ? digits : "",
    digits,
    waDigits: ok ? waDigits : digits.length >= 10 ? (digits.startsWith("0") ? `92${digits.slice(1)}` : digits) : "",
  };
}

export function phoneForStorage(raw) {
  const result = normalizePkMobile(raw);
  if (result.ok) {
    return { phone: result.normalized, phoneValid: true, phoneRaw: String(raw || "").trim().slice(0, 40) };
  }
  const cleaned = String(raw || "").replace(/[^\d+]/g, "").trim().slice(0, 40);
  if (result.digits.length >= 10) {
    return { phone: cleaned || result.digits, phoneValid: false, phoneRaw: cleaned };
  }
  if (cleaned) {
    return { phone: cleaned, phoneValid: false, phoneRaw: cleaned };
  }
  return { phone: "", phoneValid: false, phoneRaw: "" };
}

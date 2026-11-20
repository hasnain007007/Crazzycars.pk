/**
 * Phone normalize/validate (admin twin of storecraft-store/lib/pkPhone.js).
 * PK locals stay 03XXXXXXXXX; overseas numbers keep E.164 for WhatsApp/recover.
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

/**
 * Accept PK or international mobiles for abandoned-cart WhatsApp / convert / set-contact.
 * Returns wa.me digits (country code, no +) when ok.
 * Handles trunk-zero mistakes like +9660547… → 966547…
 */
export function normalizeWhatsAppPhone(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) {
    return { ok: false, normalized: "", waDigits: "", phoneValid: false, region: "" };
  }

  const pk = normalizePkMobile(trimmed);
  if (pk.ok) {
    return {
      ok: true,
      normalized: pk.normalized,
      waDigits: pk.waDigits,
      phoneValid: true,
      region: "PK",
    };
  }

  let digits = digitsOnly(trimmed);
  if (digits.startsWith("00")) digits = digits.slice(2);

  // Drop national trunk 0 after country code when input was +CC0… (common GCC/EU paste).
  if (trimmed.startsWith("+") || trimmed.startsWith("00")) {
    for (const ccLen of [1, 2, 3]) {
      if (digits.length > ccLen + 8 && digits[ccLen] === "0") {
        const candidate = digits.slice(0, ccLen) + digits.slice(ccLen + 1);
        if (candidate.length >= 10 && candidate.length <= 15) {
          digits = candidate;
          break;
        }
      }
    }
  }

  // Local PK without country code already failed normalizePkMobile — don't treat as intl.
  if (/^0\d{9,}$/.test(digits) || (digits.length === 10 && digits.startsWith("3"))) {
    return {
      ok: false,
      normalized: "",
      waDigits: "",
      phoneValid: false,
      region: "",
      error: "Enter a valid mobile with country code (e.g. 03XX… or +966 5X…).",
    };
  }

  const ok = digits.length >= 10 && digits.length <= 15;
  return {
    ok,
    normalized: ok ? `+${digits}` : "",
    waDigits: ok ? digits : "",
    phoneValid: ok,
    region: ok ? (digits.startsWith("92") ? "PK" : "INTL") : "",
    error: ok ? "" : "Enter a valid mobile with country code (10–15 digits).",
  };
}

export function phoneForStorage(raw) {
  const intl = normalizeWhatsAppPhone(raw);
  if (intl.ok) {
    return {
      phone: intl.normalized,
      phoneValid: true,
      phoneRaw: String(raw || "").trim().slice(0, 40),
    };
  }
  const cleaned = String(raw || "").replace(/[^\d+]/g, "").trim().slice(0, 40);
  const digits = digitsOnly(cleaned);
  if (digits.length >= 10) {
    return { phone: cleaned || digits, phoneValid: false, phoneRaw: cleaned };
  }
  if (cleaned) {
    return { phone: cleaned, phoneValid: false, phoneRaw: cleaned };
  }
  return { phone: "", phoneValid: false, phoneRaw: "" };
}

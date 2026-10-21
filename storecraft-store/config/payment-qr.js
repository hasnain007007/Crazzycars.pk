/**
 * Payment QR codes shown on /advance-payment, keyed by payment method.
 * Each QR was decoded and checked against the account it pays (Oct 2026).
 * `matches` must appear in that method's account number or IBAN in admin Settings;
 * if the account is changed in admin, the old QR is hidden automatically.
 */
export const PAYMENT_QR = {
  jazzcash: {
    src: "/payments/jazzcash-raast-qr.png",
    width: 640,
    height: 904,
    alt: "JazzCash and Raast payment QR code for CrazzyCars.pk",
    matches: "03107767799",
    tillId: "981558961",
    tillHint: "Or dial *786*10# and enter the Till ID to pay from any JazzCash account.",
  },
  bankTransfer: {
    src: "/payments/bank-alfalah-qr.png",
    width: 640,
    height: 502,
    alt: "Bank Alfalah Raast payment QR code for CrazzyCars.pk",
    matches: "PK07ALFH0933001010574815",
  },
  meezan: {
    src: "/payments/meezan-bank-qr.png",
    width: 640,
    height: 640,
    alt: "Meezan Bank Raast payment QR code",
    matches: "PK65MEZN0009060108167081",
  },
};

const norm = (v) => String(v || "").replace(/[\s-]/g, "").toUpperCase();

/** QR for a method only while its admin account still matches the QR. */
export function paymentQrFor(key, method) {
  const qr = PAYMENT_QR[key];
  if (!qr) return null;
  const want = norm(qr.matches);
  const have = [method?.accountNumber, method?.iban].map(norm);
  return have.some((h) => h && (h.includes(want) || want.includes(h))) ? qr : null;
}

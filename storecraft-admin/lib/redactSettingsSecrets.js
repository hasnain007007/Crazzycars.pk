/**
 * Never serialize payment provider secrets in API JSON.
 * Apply only on the way out — never mutate the Mongo document with this.
 */
const STRIPE_SECRET_KEYS = ["secretKey", "webhookSecret"];

export function redactSettingsSecrets(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const clone = JSON.parse(JSON.stringify(raw));
  const payment = clone.payment;
  if (payment && typeof payment === "object") {
    delete payment.stripeSecretKey;
    if (payment.stripe && typeof payment.stripe === "object") {
      for (const key of STRIPE_SECRET_KEYS) delete payment.stripe[key];
    }
    if (payment.paypal && typeof payment.paypal === "object") {
      delete payment.paypal.clientSecret;
    }
  }
  return clone;
}

/** Drop blank secret fields from a PUT patch so a redacted GET cannot wipe stored keys. */
export function omitBlankPaymentSecrets(payment) {
  if (!payment || typeof payment !== "object") return payment;
  const next = { ...payment };
  if (!String(next.stripeSecretKey || "").trim()) delete next.stripeSecretKey;
  if (next.stripe && typeof next.stripe === "object") {
    const stripe = { ...next.stripe };
    for (const key of STRIPE_SECRET_KEYS) {
      if (!String(stripe[key] || "").trim()) delete stripe[key];
    }
    next.stripe = stripe;
  }
  if (next.paypal && typeof next.paypal === "object") {
    const paypal = { ...next.paypal };
    if (!String(paypal.clientSecret || "").trim()) delete paypal.clientSecret;
    next.paypal = paypal;
  }
  return next;
}

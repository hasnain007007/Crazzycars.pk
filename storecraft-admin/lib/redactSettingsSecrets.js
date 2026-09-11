/**
 * Drop retired card-processor blobs from settings JSON.
 * Mongo may still hold leftover Stripe/PayPal keys; they must never serialize.
 * Apply only on the way out — never mutate the saved document with this.
 */
export function redactSettingsSecrets(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const clone = JSON.parse(JSON.stringify(raw));
  if (clone.payment && typeof clone.payment === "object") {
    delete clone.payment.stripe;
    delete clone.payment.paypal;
    delete clone.payment.stripeSecretKey;
    delete clone.payment.stripePublishableKey;
    delete clone.payment.stripeWebhookSecret;
    delete clone.payment.stripeEnabled;
  }
  // Mask CAPI token in GET responses — UI keeps a local value after typing; empty means "unchanged".
  if (clone.seo && typeof clone.seo === "object" && clone.seo.metaCapiAccessToken) {
    const t = String(clone.seo.metaCapiAccessToken);
    clone.seo.metaCapiAccessTokenMasked = t.length > 8 ? `••••${t.slice(-4)}` : "••••";
    clone.seo.metaCapiAccessToken = "";
    clone.seo.metaCapiConfigured = true;
  }
  return clone;
}

/** Ignore retired provider fields on PUT so they cannot be written back. */
export function omitBlankPaymentSecrets(payment) {
  if (!payment || typeof payment !== "object") return payment;
  const next = { ...payment };
  delete next.stripe;
  delete next.paypal;
  delete next.stripeSecretKey;
  delete next.stripePublishableKey;
  delete next.stripeWebhookSecret;
  delete next.stripeEnabled;
  return next;
}

/** Keep existing CAPI token when admin saves SEO without re-entering the secret. */
export function omitBlankSeoSecrets(seo) {
  if (!seo || typeof seo !== "object") return seo;
  const next = { ...seo };
  if (!String(next.metaCapiAccessToken || "").trim()) {
    delete next.metaCapiAccessToken;
  }
  delete next.metaCapiAccessTokenMasked;
  delete next.metaCapiConfigured;
  return next;
}

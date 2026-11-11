/**
 * Pure helpers for cart sync merge / stage (unit-tested; no DOM/Mongo).
 */

export const CHECKOUT_STAGES = [
  "browsing",
  "cart",
  "checkout_details",
  "checkout_payment",
  "checkout_confirm",
];

export function normalizeCheckoutStage(raw) {
  const s = String(raw || "").trim();
  return CHECKOUT_STAGES.includes(s) ? s : "";
}

/** Prefer non-empty incoming over existing; never blank-out existing with empty incoming. */
export function preferNonEmpty(existing, incoming, max = 200) {
  const next = String(incoming || "").trim().slice(0, max);
  if (next) return next;
  return String(existing || "").trim().slice(0, max);
}

/**
 * Merge draft + explicit payloads. Explicit wins on non-empty fields.
 * Draft cannot overwrite a newer explicit payload field with empty/stale empty.
 */
export function mergeContactPayload(draftPayload = {}, explicit = {}) {
  const dCust = draftPayload.customer || {};
  const eCust = explicit.customer || {};
  const dShip = draftPayload.shippingAddress || {};
  const eShip = explicit.shippingAddress || {};

  const customer = {
    name: preferNonEmpty(dCust.name, eCust.name, 120),
    email: preferNonEmpty(dCust.email, eCust.email, 160).toLowerCase(),
    phone: preferNonEmpty(dCust.phone, eCust.phone, 40),
  };
  const shippingAddress = {
    name: preferNonEmpty(dShip.name, eShip.name, 120) || customer.name,
    email: preferNonEmpty(dShip.email, eShip.email, 160).toLowerCase() || customer.email,
    phone: preferNonEmpty(dShip.phone, eShip.phone, 40) || customer.phone,
    street: preferNonEmpty(dShip.street, eShip.street, 200),
    street2: preferNonEmpty(dShip.street2, eShip.street2, 200),
    area: preferNonEmpty(dShip.area, eShip.area, 120),
    city: preferNonEmpty(dShip.city, eShip.city, 80),
    state: preferNonEmpty(dShip.state, eShip.state, 80),
    zip: preferNonEmpty(dShip.zip, eShip.zip, 20),
    country: preferNonEmpty(dShip.country, eShip.country, 60) || "Pakistan",
  };

  const hasCustomer = Object.values(customer).some((v) => String(v || "").trim());
  const hasAddress = ["street", "street2", "area", "city", "state", "zip"].some((k) =>
    String(shippingAddress[k] || "").trim()
  );

  return { customer, shippingAddress, hasCustomer, hasAddress };
}

export function isCompleteAddress(addr = {}) {
  return Boolean(
    String(addr.street || "").trim() &&
      String(addr.city || "").trim() &&
      String(addr.state || addr.province || "").trim()
  );
}

export function stageFromCheckoutStep(activeStep) {
  const n = Number(activeStep) || 1;
  if (n >= 3) return "checkout_confirm";
  if (n >= 2) return "checkout_payment";
  return "checkout_details";
}

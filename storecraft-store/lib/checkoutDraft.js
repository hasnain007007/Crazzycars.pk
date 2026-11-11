/**
 * Persist partial checkout contact so abandoned-cart sync can recover
 * name / phone / email / address even if the shopper never submits.
 */
"use client";

export const CHECKOUT_DRAFT_KEY = "cc_checkout_draft_v1";

const EMPTY = {
  name: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  street: "",
  street2: "",
  area: "",
  city: "",
  state: "",
  zip: "",
  country: "Pakistan",
};

function clean(value, max = 200) {
  return String(value || "").trim().slice(0, max);
}

export function normalizeCheckoutDraft(raw = {}) {
  const firstName = clean(raw.firstName, 60);
  const lastName = clean(raw.lastName, 60);
  const name =
    clean(raw.name, 120) || `${firstName} ${lastName}`.trim();
  return {
    name,
    firstName,
    lastName,
    email: clean(raw.email, 160).toLowerCase(),
    phone: clean(raw.phone, 40),
    street: clean(raw.street || raw.address || raw.line1, 200),
    street2: clean(raw.street2 || raw.line2, 200),
    area: clean(raw.area, 120),
    city: clean(raw.city, 80),
    state: clean(raw.state || raw.province, 80),
    zip: clean(raw.zip || raw.postcode, 20),
    country: clean(raw.country, 60) || "Pakistan",
  };
}

export function readCheckoutDraft() {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return { ...EMPTY };
    return normalizeCheckoutDraft(JSON.parse(raw));
  } catch {
    return { ...EMPTY };
  }
}

export function writeCheckoutDraft( partial = {}) {
  if (typeof window === "undefined") return readCheckoutDraft();
  const next = normalizeCheckoutDraft({ ...readCheckoutDraft(), ...partial });
  try {
    localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return next;
}

export function clearCheckoutDraft() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CHECKOUT_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function draftHasContact(draft) {
  const d = normalizeCheckoutDraft(draft || {});
  const phoneDigits = d.phone.replace(/\D/g, "");
  const emailOk = d.email.includes("@") && !d.email.startsWith("guest+");
  return Boolean(d.name || emailOk || phoneDigits.length >= 10 || d.street || d.city);
}

/** Shape expected by /api/cart/sync */
export function draftToSyncPayload(draft) {
  const d = normalizeCheckoutDraft(draft || {});
  return {
    customer: {
      name: d.name,
      email: d.email,
      phone: d.phone,
    },
    shippingAddress: {
      name: d.name,
      email: d.email,
      phone: d.phone,
      street: d.street,
      street2: d.street2,
      area: d.area,
      city: d.city,
      state: d.state,
      zip: d.zip,
      country: d.country,
    },
  };
}

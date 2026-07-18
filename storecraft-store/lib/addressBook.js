/** Shared helpers for customer address book + checkout shipping. */

export const EMPTY_ADDRESS = {
  label: "Home",
  firstName: "",
  lastName: "",
  phone: "",
  street: "",
  street2: "",
  area: "",
  city: "",
  province: "",
  postcode: "",
  country: "Pakistan",
  isDefault: false,
};

export function serializeAddress(a) {
  if (!a) return null;
  const province = String(a.province || a.state || "").trim();
  const postcode = String(a.postcode || a.zip || a.postalCode || "").trim();
  const street = String(a.street || a.address || a.line1 || "").trim();
  const street2 = String(a.street2 || a.line2 || "").trim();
  return {
    id: a._id != null ? String(a._id) : undefined,
    label: String(a.label || "Home").trim() || "Home",
    firstName: String(a.firstName || "").trim(),
    lastName: String(a.lastName || "").trim(),
    phone: String(a.phone || "").trim(),
    street,
    street2,
    area: String(a.area || "").trim(),
    city: String(a.city || "").trim(),
    province,
    state: province,
    postcode,
    zip: postcode,
    country: String(a.country || "Pakistan").trim() || "Pakistan",
    isDefault: Boolean(a.isDefault),
  };
}

export function normalizeAddressInput(body = {}) {
  const province = String(body.province || body.state || "").trim();
  const postcode = String(body.postcode || body.zip || body.postalCode || "").trim();
  const street = String(body.street || body.address || body.line1 || "").trim();
  const street2 = String(body.street2 || body.line2 || "").trim();
  return {
    label: String(body.label || "Home").trim() || "Home",
    firstName: String(body.firstName || "").trim(),
    lastName: String(body.lastName || "").trim(),
    phone: String(body.phone || "").trim(),
    street,
    street2,
    area: String(body.area || "").trim(),
    city: String(body.city || "").trim(),
    province,
    state: province,
    postcode,
    zip: postcode,
    country: String(body.country || "Pakistan").trim() || "Pakistan",
    isDefault: Boolean(body.isDefault),
  };
}

export function validateAddress(addr) {
  const errors = {};
  if (!addr.street) errors.street = "Street address is required";
  if (!addr.city) errors.city = "City is required";
  if (!addr.province) errors.province = "Province is required";
  if (!addr.phone) errors.phone = "Phone is required";
  return errors;
}

/** Map address-book entry → checkout/order shippingAddress shape. */
export function toShippingAddress(addr, fallbackName = "", fallbackPhone = "") {
  const n = normalizeAddressInput(addr);
  const nameFromParts = [n.firstName, n.lastName].filter(Boolean).join(" ").trim();
  const name = String(addr.name || nameFromParts || fallbackName).trim();
  const phone = n.phone || String(fallbackPhone || "").trim();
  const streetLine = [n.street, n.street2].filter(Boolean).join(", ");
  return {
    name,
    phone,
    street: n.street,
    street2: n.street2,
    line1: n.street,
    line2: n.street2,
    address: streetLine || n.street,
    area: n.area,
    city: n.city,
    state: n.province,
    province: n.province,
    zip: n.postcode,
    postcode: n.postcode,
    postalCode: n.postcode,
    country: n.country,
  };
}

/** Singular legacy `address` field kept in sync with default book entry. */
export function toLegacySingularAddress(addr) {
  const n = normalizeAddressInput(addr);
  return {
    street: [n.street, n.street2].filter(Boolean).join(", ") || n.street,
    street2: n.street2,
    area: n.area,
    city: n.city,
    state: n.province,
    country: n.country,
    zip: n.postcode,
  };
}

export function pickDefaultAddress(addresses = []) {
  const list = Array.isArray(addresses) ? addresses : [];
  if (!list.length) return null;
  return list.find((a) => a.isDefault) || list[0];
}

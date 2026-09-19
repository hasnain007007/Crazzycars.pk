/**
 * Shared admin order list search helpers.
 * Optimized for courier tracking IDs (GW…, PE…, numeric CN) as well as
 * order # / phone / name / product text.
 */

export function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Strip spaces / dashes / punctuation so GW 7543-… still matches GW7543… */
export function compactTrackingToken(raw) {
  return String(raw || "")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

/**
 * Heuristic: query is primarily a courier tracking / CN lookup.
 * Used to widen filters (ignore saved views) so booked parcels are findable.
 */
export function looksLikeTrackingId(raw) {
  const compact = compactTrackingToken(raw);
  if (compact.length < 8) return false;
  if (/^(GW|PE|PX|TRX|TCS|LEO|LHR|KHI|ISB)[A-Z0-9]*\d{6,}$/i.test(compact)) return true;
  if (/^\d{10,}$/.test(compact)) return true;
  if (/^[A-Z]{1,4}\d{8,}$/.test(compact)) return true;
  // Long mixed token with mostly digits (typical CN)
  const digits = compact.replace(/\D/g, "");
  return digits.length >= 10 && digits.length / compact.length >= 0.7;
}

/** Allow optional separators between each character of a compact CN. */
function flexibleTokenRegex(compact) {
  if (!compact || compact.length < 6) return null;
  return new RegExp(compact.split("").map(escapeRegex).join("[\\s._-]*"), "i");
}

/**
 * Build the `$or` clause for order list search.
 * Returns null when search is empty.
 */
export function buildOrderSearchOr(search) {
  const raw = String(search || "").trim();
  if (!raw) return null;

  const compact = compactTrackingToken(raw);
  const digits = raw.replace(/\D/g, "");
  const rx = new RegExp(escapeRegex(raw), "i");
  const compactRx = compact.length >= 6 ? new RegExp(escapeRegex(compact), "i") : null;
  const flexRx = flexibleTokenRegex(compact);

  const trackingFields = [
    "trackingNumber",
    "tracking.number",
    "courierSettlement.trackingNumber",
    "trackingUrl",
  ];

  const or = [
    { orderNumber: rx },
    { "customer.name": rx },
    { "customer.email": rx },
    { "customer.phone": rx },
    { "shippingAddress.phone": rx },
    { "shippingAddress.name": rx },
    { "shippingAddress.city": rx },
    { "items.name": rx },
    { "items.articleNo": rx },
    { "items.sku": rx },
    { tags: rx },
    { courier: rx },
    { "timeline.note": rx },
    { "statusHistory.note": rx },
    { "internalNotes.note": rx },
    { "internalNotes.text": rx },
  ];

  for (const field of trackingFields) {
    or.push({ [field]: rx });
    if (compactRx) or.push({ [field]: compactRx });
    if (flexRx) or.push({ [field]: flexRx });
    // Exact compact equality (fast path when indexed)
    if (compact.length >= 8) {
      or.push({ [field]: compact });
      or.push({ [field]: compact.toLowerCase() });
    }
  }

  // Phone-heavy guest checkouts: match digit runs in phone / guest+…@ email
  if (digits.length >= 7) {
    const digitRx = new RegExp(escapeRegex(digits));
    or.push({ "customer.phone": digitRx });
    or.push({ "shippingAddress.phone": digitRx });
    or.push({ "customer.email": new RegExp(`guest\\+${escapeRegex(digits)}`, "i") });
  }

  // Digits-only CN / tracking suffix (works even when pasted without GW prefix)
  if (digits.length >= 8) {
    const digitRx = new RegExp(escapeRegex(digits));
    for (const field of trackingFields) {
      or.push({ [field]: digitRx });
    }
  }

  return or;
}

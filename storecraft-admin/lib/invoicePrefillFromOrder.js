/**
 * Build CreateInvoiceForm customer fields from an existing order
 * (repeat-customer / "New order" flow).
 */

function normalizePersonName(raw) {
  const cleaned = String(raw || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  return cleaned.replace(/\b(?:[A-Za-zÀ-ÿ]\s+){2,}[A-Za-zÀ-ÿ]\b/g, (chunk) =>
    chunk.replace(/\s+/g, "")
  );
}

function customerFullName(order) {
  const fromShipping = normalizePersonName(order?.shippingAddress?.name);
  if (fromShipping) return fromShipping;

  const fn = normalizePersonName(order?.customer?.firstName);
  const ln = normalizePersonName(order?.customer?.lastName);
  const combined = normalizePersonName(`${fn} ${ln}`);
  if (combined) return combined;

  return normalizePersonName(order?.customer?.name);
}

function buildStreetAddress(order) {
  const addr = order?.shippingAddress || {};
  const line1 = String(addr.street || addr.line1 || "").trim();
  const line2 = String(addr.street2 || addr.line2 || "").trim();
  const area = String(addr.area || "").trim();
  const fullAddr = String(addr.address || "").trim();

  const parts = [];
  if (line1) parts.push(line1);
  if (line2 && line2 !== line1) parts.push(line2);
  if (area && !parts.some((p) => p.toLowerCase().includes(area.toLowerCase()))) {
    parts.push(area);
  }

  if (!parts.length && fullAddr) return fullAddr;

  // Prefer structured lines; append leftover full address only if it adds info.
  const joined = parts.join(", ");
  if (fullAddr && joined && !joined.includes(fullAddr) && !fullAddr.includes(joined)) {
    return `${joined}, ${fullAddr}`;
  }
  return joined || fullAddr;
}

/**
 * @returns {{ name: string, phone: string, email: string, city: string, address: string, customerId: string|null, orderNumber: string, province: string }}
 */
export function customerPrefillFromOrder(order) {
  const addr = order?.shippingAddress || {};
  const name = customerFullName(order);
  const phone = String(addr.phone || order?.customer?.phone || "").trim();
  const rawEmail = String(order?.customer?.email || addr.email || "").trim();
  const email =
    rawEmail && !rawEmail.toLowerCase().includes("@guest.") ? rawEmail : "";
  const city = String(addr.city || "").trim();
  const address = buildStreetAddress(order);
  const province = String(addr.province || addr.state || "").trim();
  const customerId = order?.customer?.customerId
    ? String(order.customer.customerId)
    : null;

  return {
    name,
    phone,
    email,
    city,
    address: province && address && !address.includes(province)
      ? `${address}, ${province}`
      : address || (province ? province : ""),
    customerId,
    orderNumber: String(order?.orderNumber || "").trim(),
    province,
  };
}

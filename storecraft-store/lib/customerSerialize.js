/** Shape returned to the storefront for /api/customer/me and similar. */

export function customerForStorefront(doc) {
  if (!doc) return null;
  const c = doc;
  const id = c._id?.toString?.() || String(c._id);
  const fn = (c.firstName || "").trim();
  const ln = (c.lastName || "").trim();
  const name = (c.name || "").trim();
  let firstName = fn;
  let lastName = ln;
  if (!firstName && name) {
    const parts = name.split(/\s+/);
    firstName = parts[0] || "";
    lastName = parts.slice(1).join(" ") || "";
  }
  return {
    id,
    firstName,
    lastName,
    name,
    email: c.email,
    phone: c.phone || "",
    addresses: c.addresses || [],
    wishlist: c.wishlist || [],
    createdAt: c.createdAt,
  };
}

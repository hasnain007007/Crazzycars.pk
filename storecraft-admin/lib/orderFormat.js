/**
 * Helpers for order money fields (legacy root `total` vs `pricing.total`).
 */
export function orderGrandTotal(doc) {
  if (doc?.pricing && typeof doc.pricing.total === "number") return doc.pricing.total;
  if (typeof doc?.total === "number") return doc.total;
  return 0;
}

export function orderPricing(doc) {
  if (doc?.pricing && typeof doc.pricing.total === "number") {
    return {
      subtotal: Number(doc.pricing.subtotal) || 0,
      discount: Number(doc.pricing.discount) || 0,
      shippingCost: Number(doc.pricing.shippingCost) || 0,
      total: Number(doc.pricing.total) || 0,
    };
  }
  return {
    subtotal: Number(doc.subtotal) || 0,
    discount: Number(doc.discount) || 0,
    shippingCost: Number(doc.shippingCost) || 0,
    total: Number(doc.total) || 0,
  };
}

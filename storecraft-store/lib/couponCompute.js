/**
 * Compute discount for a coupon against an order subtotal (server-side).
 */
export function computeCouponDiscount(coupon, orderAmount, categoryIds = []) {
  if (!coupon || coupon.status === "inactive") {
    return { valid: false, discount: 0, message: "Coupon is not active." };
  }
  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
    return { valid: false, discount: 0, message: "Coupon has expired." };
  }
  const limit = Number(coupon.usageLimit) || 0;
  if (limit > 0 && (coupon.usedCount || 0) >= limit) {
    return { valid: false, discount: 0, message: "Coupon usage limit reached." };
  }
  const minAmt = Number(coupon.minOrderAmount) || 0;
  if (orderAmount < minAmt) {
    return {
      valid: false,
      discount: 0,
      message: `Minimum order amount is Rs. ${Math.round(minAmt).toLocaleString("en-GB")}.`,
    };
  }
  if (coupon.appliesTo === "categories" && Array.isArray(coupon.categoryIds) && coupon.categoryIds.length) {
    const set = new Set(coupon.categoryIds.map((id) => String(id)));
    const ok = (categoryIds || []).some((id) => set.has(String(id)));
    if (!ok) {
      return { valid: false, discount: 0, message: "Coupon does not apply to these products." };
    }
  }

  let discount = 0;
  if (coupon.discountType === "percentage") {
    const pct = Number(coupon.discountValue) || 0;
    discount = (orderAmount * pct) / 100;
    const cap = Number(coupon.maxDiscount) || 0;
    if (cap > 0 && discount > cap) discount = cap;
  } else {
    discount = Number(coupon.discountValue) || 0;
  }
  discount = Math.min(discount, orderAmount);
  discount = Math.round(discount); // whole rupees
  return { valid: true, discount, message: "Coupon applied." };
}

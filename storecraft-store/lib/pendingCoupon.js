/**
 * Promo code typed in the cart drawer, carried to checkout for this browser tab.
 * sessionStorage only — cleared when the order is placed or the code is removed.
 */
const KEY = "cc-pending-coupon";

export function readPendingCoupon() {
  try {
    return String(sessionStorage.getItem(KEY) || "").trim().toUpperCase();
  } catch {
    return "";
  }
}

export function writePendingCoupon(code) {
  try {
    const c = String(code || "").trim().toUpperCase();
    if (c) sessionStorage.setItem(KEY, c);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* storage blocked — checkout still has its own coupon box */
  }
}

/** Same request checkout makes; returns { valid, discount, message }. */
export async function validateCoupon(code, { orderAmount, items } = {}) {
  const c = String(code || "").trim().toUpperCase();
  if (!c) return { valid: false, discount: 0, message: "" };
  const categoryIds = [
    ...new Set(
      (items || []).flatMap((item) =>
        Array.isArray(item.categoryIds) ? item.categoryIds.map((x) => String(x || "").trim()).filter(Boolean) : []
      )
    ),
  ];
  try {
    const res = await fetch("/api/coupon/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: c, orderAmount: Number(orderAmount) || 0, categoryIds }),
    });
    const json = await res.json();
    if (json.success && json.valid) {
      return { valid: true, discount: Number(json.discount) || 0, message: json.message || "Coupon applied." };
    }
    return { valid: false, discount: 0, message: json.message || json.error || "Invalid coupon." };
  } catch {
    return { valid: false, discount: 0, message: "Could not check the code. Try again at checkout." };
  }
}

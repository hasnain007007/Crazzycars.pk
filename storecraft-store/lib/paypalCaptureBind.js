/**
 * Bind a PayPal order/capture to a store order the same way Stripe mark-paid
 * binds PaymentIntent.metadata.orderId (`app/api/orders/[id]/route.js`).
 * Also require the captured (or authorized) amount to equal order.pricing.total.
 */

export function paypalCustomIdFromOrder(paypalOrder) {
  const unit = paypalOrder?.purchase_units?.[0] || {};
  return String(unit.custom_id || unit.customId || "").trim();
}

export function paypalAmountFromOrder(paypalOrder) {
  const cap = paypalOrder?.purchase_units?.[0]?.payments?.captures?.[0];
  const fromCapture = cap?.amount?.value;
  const fromUnit = paypalOrder?.purchase_units?.[0]?.amount?.value;
  const n = Number(fromCapture ?? fromUnit);
  return n;
}

/**
 * @returns {{ ok: true, amount: number } | { ok: false, status: number, error: string }}
 */
export function assertPayPalMatchesOrder(paypalOrder, storeOrder, orderId) {
  const customId = paypalCustomIdFromOrder(paypalOrder);
  if (!customId || customId !== String(orderId)) {
    return { ok: false, status: 403, error: "Payment does not match this order." };
  }

  const paid = paypalAmountFromOrder(paypalOrder);
  const expected = Number(storeOrder?.pricing?.total);
  if (!Number.isFinite(paid) || paid <= 0 || !Number.isFinite(expected) || expected <= 0) {
    return { ok: false, status: 403, error: "Payment does not match this order." };
  }

  if (Math.round(paid * 100) !== Math.round(expected * 100)) {
    return { ok: false, status: 403, error: "Payment does not match this order." };
  }

  return { ok: true, amount: paid };
}

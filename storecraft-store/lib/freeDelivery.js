import { formatPrice } from "@/lib/currency";
import { isAdvancePaymentMethod } from "@/lib/pakistaniPaymentMethods";

/** Default COD free-delivery threshold (Rs.) when settings omit a value. */
export const DEFAULT_FREE_SHIPPING_THRESHOLD = 2999;

const DEFAULT_ADVANCE_MESSAGE =
  "To confirm your order, please pay at least Rs. 500 in advance as delivery charges paid to TCS courier. Send payment screenshot on WhatsApp to confirm.";

export const DEFAULT_SHIPPING_RULES = {
  freeShippingThreshold: DEFAULT_FREE_SHIPPING_THRESHOLD,
  freeShippingOnAdvancePayment: true,
  freeShippingOnOrderAbove: 10000,
  freeShippingOnOrderAboveEnabled: true,
  advancePaymentMessage: DEFAULT_ADVANCE_MESSAGE,
  advancePaymentAmount: 500,
  advancePaymentMessageEnabled: true,
  advancePaymentMessageTitle: "Confirm Your Order",
};

/** Normalize storePayment shipping rule fields with fallbacks. */
export function normalizeShippingRules(storePayment) {
  const p = storePayment && typeof storePayment === "object" ? storePayment : {};
  return {
    ...p,
    freeShippingThreshold: Math.max(
      0,
      Number(p.freeShippingThreshold) || DEFAULT_SHIPPING_RULES.freeShippingThreshold
    ),
    freeShippingOnAdvancePayment:
      p.freeShippingOnAdvancePayment !== undefined ? Boolean(p.freeShippingOnAdvancePayment) : true,
    freeShippingOnOrderAbove: Math.max(
      0,
      Number(p.freeShippingOnOrderAbove) || DEFAULT_SHIPPING_RULES.freeShippingOnOrderAbove
    ),
    freeShippingOnOrderAboveEnabled:
      p.freeShippingOnOrderAboveEnabled !== undefined
        ? Boolean(p.freeShippingOnOrderAboveEnabled)
        : true,
    advancePaymentAmount: Math.max(0, Number(p.advancePaymentAmount) || 500),
    advancePaymentMessageEnabled:
      p.advancePaymentMessageEnabled !== undefined ? Boolean(p.advancePaymentMessageEnabled) : true,
    advancePaymentMessageTitle:
      String(p.advancePaymentMessageTitle || "").trim() ||
      DEFAULT_SHIPPING_RULES.advancePaymentMessageTitle,
    advancePaymentMessage:
      String(p.advancePaymentMessage || "").trim() || DEFAULT_ADVANCE_MESSAGE,
  };
}

/** COD free-delivery minimum order (Rs.) from admin storePayment settings. */
export function getFreeShippingThreshold(storePayment) {
  if (!storePayment || typeof storePayment !== "object") {
    return DEFAULT_FREE_SHIPPING_THRESHOLD;
  }
  const t = Number(storePayment.freeShippingThreshold);
  return Number.isFinite(t) && t > 0 ? t : DEFAULT_FREE_SHIPPING_THRESHOLD;
}

/** Progress bar threshold: large-order rule when enabled, else legacy COD threshold. */
export function getProgressBarThreshold(storePayment) {
  const sp = normalizeShippingRules(storePayment);
  if (sp.freeShippingOnOrderAboveEnabled && sp.freeShippingOnOrderAbove > 0) {
    return sp.freeShippingOnOrderAbove;
  }
  return getFreeShippingThreshold(sp);
}

/** Progress toward free delivery (cart subtotal vs threshold). */
export function getCodFreeDeliveryProgress(cartTotal, threshold) {
  const total = Math.max(0, Number(cartTotal) || 0);
  const th = Math.max(0, Number(threshold) || DEFAULT_FREE_SHIPPING_THRESHOLD);
  if (th <= 0) {
    return { unlocked: true, remaining: 0, percent: 100, threshold: th };
  }
  if (total >= th) {
    return { unlocked: true, remaining: 0, percent: 100, threshold: th };
  }
  const remaining = Math.round((th - total) * 100) / 100;
  const percent = Math.min(100, Math.max(0, (total / th) * 100));
  return { unlocked: false, remaining, percent, threshold: th };
}

/**
 * Apply admin shipping rules on top of zone-calculated shipping.
 */
export function applyShippingRules({
  zoneShippingCost,
  cartTotal,
  paymentMethod,
  zoneIsFree = false,
  storePayment,
}) {
  const sp = normalizeShippingRules(storePayment);
  const total = Math.max(0, Number(cartTotal) || 0);
  let cost = zoneIsFree ? 0 : Math.max(0, Number(zoneShippingCost) || 0);
  let freeReason = zoneIsFree ? "zone" : null;

  if (sp.freeShippingOnOrderAboveEnabled && sp.freeShippingOnOrderAbove > 0 && total >= sp.freeShippingOnOrderAbove) {
    cost = 0;
    freeReason = "order_above";
  }

  if (sp.freeShippingOnAdvancePayment !== false && isAdvancePaymentMethod(paymentMethod)) {
    cost = 0;
    freeReason = "advance_payment";
  }

  return {
    shippingCost: cost,
    isFree: cost === 0,
    freeReason,
    orderAboveThreshold: sp.freeShippingOnOrderAbove,
    orderAboveEnabled: sp.freeShippingOnOrderAboveEnabled,
  };
}

export function formatAdvancePaymentMessage(message, amount, whatsapp) {
  const amt = Math.max(0, Number(amount) || 0);
  const wa = String(whatsapp || "").trim();
  const amountStr = formatPrice(amt);
  return String(message || DEFAULT_ADVANCE_MESSAGE)
    .replace(/\{amount\}/gi, amountStr)
    .replace(/\{whatsapp\}/gi, wa || "WhatsApp");
}

export function shouldShowAdvancePaymentMessage({ paymentMethod, shippingCost, storePayment }) {
  const sp = normalizeShippingRules(storePayment);
  if (!sp.advancePaymentMessageEnabled) return false;
  const pm = String(paymentMethod || "cod").toLowerCase();
  if (pm !== "cod") return false;
  return Math.max(0, Number(shippingCost) || 0) > 0;
}

export function buildAdvancePaymentOrderNote(storePayment, whatsapp = "") {
  const sp = normalizeShippingRules(storePayment);
  if (!sp.advancePaymentMessageEnabled) return "";
  const body = formatAdvancePaymentMessage(
    sp.advancePaymentMessage,
    sp.advancePaymentAmount,
    whatsapp
  );
  const title = sp.advancePaymentMessageTitle;
  return title ? `${title}: ${body}` : body;
}

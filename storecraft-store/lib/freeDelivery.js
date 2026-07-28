import { formatPrice } from "@/lib/currency";
import { isAdvancePaymentMethod } from "@/lib/pakistaniPaymentMethods";

/** Default COD free-delivery threshold (Rs.) when settings omit a value. */
export const DEFAULT_FREE_SHIPPING_THRESHOLD = 9999;

const DEFAULT_ADVANCE_MESSAGE =
  "To confirm your order, please pay delivery charges of {amount} in advance.\n\nSend payment screenshot on WhatsApp: {whatsapp}";

export const DEFAULT_SHIPPING_RULES = {
  freeShippingThreshold: DEFAULT_FREE_SHIPPING_THRESHOLD,
  freeShippingOnAdvancePayment: false,
  freeShippingOnOrderAbove: 10000,
  freeShippingOnOrderAboveEnabled: false,
  advancePaymentMessage: DEFAULT_ADVANCE_MESSAGE,
  advancePaymentAmount: 250,
  advancePaymentMessageEnabled: true,
  advancePaymentMessageTitle: "Confirm Your Order",
  advancePaymentDiscountEnabled: true,
  advancePaymentDiscountPercent: 3,
  flatDeliveryCharge: 250,
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
    freeShippingOnAdvancePayment: p.freeShippingOnAdvancePayment === true,
    freeShippingOnOrderAbove: Math.max(
      0,
      Number(p.freeShippingOnOrderAbove) || DEFAULT_SHIPPING_RULES.freeShippingOnOrderAbove
    ),
    freeShippingOnOrderAboveEnabled: p.freeShippingOnOrderAboveEnabled === true,
    advancePaymentAmount: Math.max(
      0,
      Number(p.advancePaymentAmount) || DEFAULT_SHIPPING_RULES.advancePaymentAmount
    ),
    advancePaymentMessageEnabled:
      p.advancePaymentMessageEnabled !== undefined ? Boolean(p.advancePaymentMessageEnabled) : true,
    advancePaymentMessageTitle:
      String(p.advancePaymentMessageTitle || "").trim() ||
      DEFAULT_SHIPPING_RULES.advancePaymentMessageTitle,
    advancePaymentMessage:
      String(p.advancePaymentMessage || "").trim() || DEFAULT_ADVANCE_MESSAGE,
    advancePaymentDiscountEnabled:
      p.advancePaymentDiscountEnabled !== undefined
        ? Boolean(p.advancePaymentDiscountEnabled)
        : true,
    advancePaymentDiscountPercent: Math.min(
      100,
      Math.max(0, Number(p.advancePaymentDiscountPercent) || 3)
    ),
    flatDeliveryCharge: Math.max(
      0,
      Number(p.flatDeliveryCharge) || DEFAULT_SHIPPING_RULES.flatDeliveryCharge
    ),
  };
}

/**
 * 3% (configurable) off when paying in advance (JazzCash, bank, Meezan, etc.).
 * Applied on cart total after coupon discount.
 */
export function computeAdvancePaymentDiscount({
  amountAfterCoupon,
  paymentMethod,
  storePayment,
}) {
  const sp = normalizeShippingRules(storePayment);
  if (sp.advancePaymentDiscountEnabled === false) {
    return { discount: 0, percent: 0, applied: false };
  }
  if (!isAdvancePaymentMethod(paymentMethod)) {
    return { discount: 0, percent: sp.advancePaymentDiscountPercent, applied: false };
  }
  const base = Math.max(0, Number(amountAfterCoupon) || 0);
  const percent = sp.advancePaymentDiscountPercent;
  const discount = Math.max(0, Math.round(base * (percent / 100) * 100) / 100);
  return { discount, percent, applied: discount > 0 };
}

/** COD free-delivery minimum order (Rs.) from admin storePayment settings. */
export function getFreeShippingThreshold(storePayment) {
  if (!storePayment || typeof storePayment !== "object") {
    return DEFAULT_FREE_SHIPPING_THRESHOLD;
  }
  const t = Number(storePayment.freeShippingThreshold);
  return Number.isFinite(t) && t > 0 ? t : DEFAULT_FREE_SHIPPING_THRESHOLD;
}

/**
 * Single customer-facing free-delivery threshold (Rs.).
 * Prefer the enabled "order above" rule; otherwise the COD freeShippingThreshold.
 * All UI (hero, cart, checkout, announcement copy helpers) must use this — not hardcodes.
 */
export function getProgressBarThreshold(storePayment) {
  const sp = normalizeShippingRules(storePayment);
  if (sp.freeShippingOnOrderAboveEnabled && sp.freeShippingOnOrderAbove > 0) {
    return sp.freeShippingOnOrderAbove;
  }
  return getFreeShippingThreshold(sp);
}

/** Alias — the one source of truth for free-delivery messaging + eligibility. */
export function getEffectiveFreeDeliveryThreshold(storePayment) {
  return getProgressBarThreshold(storePayment);
}

/** e.g. "Rs. 9,999" */
export function formatFreeDeliveryThreshold(storePayment) {
  const n = getEffectiveFreeDeliveryThreshold(storePayment);
  return `Rs. ${Number(n).toLocaleString("en-PK")}`;
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
 * Flat delivery charge (default Rs. 250) is used when set — delivery is not free
 * unless an explicit free-shipping rule is enabled.
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
  const flat = Math.max(0, Number(sp.flatDeliveryCharge) || 0);

  let cost =
    flat > 0
      ? flat
      : zoneIsFree
        ? 0
        : Math.max(0, Number(zoneShippingCost) || 0);
  let freeReason = flat > 0 ? null : zoneIsFree ? "zone" : null;

  // Same threshold the UI shows (progress bar / hero / checkout note).
  const freeAt = getProgressBarThreshold(sp);
  if (freeAt > 0 && total >= freeAt) {
    cost = 0;
    freeReason = sp.freeShippingOnOrderAboveEnabled ? "order_above" : "threshold";
  }

  // Only free for advance payment when admin explicitly enables it
  if (sp.freeShippingOnAdvancePayment === true && isAdvancePaymentMethod(paymentMethod)) {
    cost = 0;
    freeReason = "advance_payment";
  }

  return {
    shippingCost: cost,
    isFree: cost === 0,
    freeReason,
    orderAboveThreshold: sp.freeShippingOnOrderAbove,
    orderAboveEnabled: sp.freeShippingOnOrderAboveEnabled,
    freeDeliveryThreshold: freeAt,
  };
}

export function formatWhatsAppDisplay(whatsapp) {
  const raw = String(whatsapp || "").replace(/\D/g, "");
  if (!raw) return "03284010007";
  // 923284010007 → 03284010007
  if (raw.startsWith("92") && raw.length >= 12) return `0${raw.slice(2)}`;
  if (raw.startsWith("0")) return raw;
  if (raw.length === 10) return `0${raw}`;
  return raw;
}

export function formatAdvancePaymentMessage(message, amount, whatsapp) {
  const amt = Math.max(0, Number(amount) || 0);
  const wa = formatWhatsAppDisplay(whatsapp);
  const amountStr = formatPrice(amt);
  return String(message || DEFAULT_ADVANCE_MESSAGE)
    .replace(/\{amount\}/gi, amountStr)
    .replace(/\{whatsapp\}/gi, wa);
}

/** Account lines for COD delivery-charge advance payment box. */
export function getAdvancePaymentAccountLines(pakistaniPaymentMethods) {
  const pm = pakistaniPaymentMethods || {};
  const bank = pm.bankTransfer?.enabled !== false ? pm.bankTransfer : null;
  const source = bank?.accountNumber || bank?.iban ? bank : pm.meezan?.accountNumber ? pm.meezan : bank;
  if (!source) return [];
  const lines = [];
  if (source.bankName) lines.push({ label: "Bank", value: source.bankName });
  if (source.accountNumber) lines.push({ label: "Account", value: source.accountNumber });
  if (source.accountTitle) lines.push({ label: "Title", value: source.accountTitle });
  if (source.iban) lines.push({ label: "IBAN", value: source.iban });
  return lines;
}

export function shouldShowAdvancePaymentMessage({ paymentMethod, shippingCost, storePayment }) {
  const sp = normalizeShippingRules(storePayment);
  if (!sp.advancePaymentMessageEnabled) return false;
  const pm = String(paymentMethod || "cod").toLowerCase();
  if (pm !== "cod") return false;
  return Math.max(0, Number(shippingCost) || 0) > 0;
}

export function buildAdvancePaymentOrderNote(storePayment, whatsapp = "", pakistaniPaymentMethods = null) {
  const sp = normalizeShippingRules(storePayment);
  if (!sp.advancePaymentMessageEnabled) return "";
  const body = formatAdvancePaymentMessage(
    sp.advancePaymentMessage,
    sp.advancePaymentAmount,
    whatsapp
  );
  const accounts = getAdvancePaymentAccountLines(pakistaniPaymentMethods)
    .map((l) => `${l.label}: ${l.value}`)
    .join(" | ");
  const title = sp.advancePaymentMessageTitle;
  const full = accounts ? `${body} | ${accounts}` : body;
  return title ? `${title}: ${full}` : full;
}

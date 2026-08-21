/**
 * Shipping fee helpers (legacy filename).
 * Flat STORE_POLICY fee only — no order-value waiver.
 */
import { formatPrice } from "@/lib/currency";
import { isAdvancePaymentMethod } from "@/lib/pakistaniPaymentMethods";
import { STORE_POLICY } from "@/config/store-policy";
import { standardDeliveryFeeShort } from "@/lib/storePolicyCopy";

const DEFAULT_ADVANCE_MESSAGE =
  "Important: You must pay the delivery charges of {amount} in advance to confirm your Cash on Delivery order.\n\nAfter paying, send the payment screenshot on WhatsApp: {whatsapp}\n\nProduct payment will be collected on delivery. Without the delivery-charge payment + screenshot, we cannot process your order.";

export const DEFAULT_FREE_SHIPPING_THRESHOLD = 0;

export const DEFAULT_SHIPPING_RULES = {
  freeShippingThreshold: 0,
  freeShippingOnAdvancePayment: false,
  freeShippingOnOrderAbove: 0,
  freeShippingOnOrderAboveEnabled: false,
  advancePaymentMessage: DEFAULT_ADVANCE_MESSAGE,
  advancePaymentAmount: STORE_POLICY.shipping.standardFeePKR,
  advancePaymentMessageEnabled: true,
  advancePaymentMessageTitle: "Confirm Your Order",
  advancePaymentDiscountEnabled: true,
  advancePaymentDiscountPercent: 3,
  flatDeliveryCharge: STORE_POLICY.shipping.standardFeePKR,
};

/** Normalize storePayment shipping rule fields with fallbacks. */
export function normalizeShippingRules(storePayment) {
  const p = storePayment && typeof storePayment === "object" ? storePayment : {};
  return {
    ...p,
    freeShippingThreshold: 0,
    freeShippingOnAdvancePayment: false,
    freeShippingOnOrderAbove: 0,
    freeShippingOnOrderAboveEnabled: false,
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
    flatDeliveryCharge: STORE_POLICY.shipping.standardFeePKR,
  };
}

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

/** @deprecated Always 0 — no free-delivery threshold. */
export function getFreeShippingThreshold() {
  return 0;
}

/** @deprecated Always 0. */
export function getProgressBarThreshold() {
  return 0;
}

/** @deprecated Always 0. */
export function getEffectiveFreeDeliveryThreshold() {
  return 0;
}

/** @deprecated Use {@link standardDeliveryFeeShort}. */
export function formatFreeDeliveryThreshold() {
  return standardDeliveryFeeShort();
}

/** No free-delivery progress — stub for any leftover callers. */
export function getCodFreeDeliveryProgress() {
  return { unlocked: true, remaining: 0, percent: 100, threshold: 0 };
}

/** Strip free-delivery marketing fields from shipping API responses. */
export function toPublicShippingQuote(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const {
    isFree: _isFree,
    freeReason: _freeReason,
    freeShippingThreshold: _freeThreshold,
    freeShippingEnabled: _freeEnabled,
    freeShippingNote: _freeNote,
    showFreeShippingProgress: _freeProgress,
    freeApplied: _freeApplied,
    freeDeliveryThreshold: _freeDeliveryThreshold,
    ...rest
  } = raw;
  return rest;
}

/**
 * Apply store policy on top of zone/courier quotes.
 * Flat STORE_POLICY fee unless an explicit courier base (spoiler / Daewoo) is passed.
 * Never waives delivery for order value or advance payment.
 */
export function applyShippingRules({ storePayment, baseDeliveryCharge }) {
  normalizeShippingRules(storePayment);
  const flat = STORE_POLICY.shipping.standardFeePKR;
  const hasExplicitBase =
    baseDeliveryCharge !== undefined &&
    baseDeliveryCharge !== null &&
    Number.isFinite(Number(baseDeliveryCharge));
  const explicitBase = hasExplicitBase ? Math.max(0, Number(baseDeliveryCharge) || 0) : null;
  const cost = hasExplicitBase ? explicitBase : flat;

  return {
    shippingCost: cost,
    isFree: false,
    freeReason: null,
    orderAboveThreshold: 0,
    orderAboveEnabled: false,
    freeDeliveryThreshold: 0,
    baseDeliveryCharge: hasExplicitBase ? explicitBase : flat,
  };
}

/** Canonical local WhatsApp / phone from STORE_POLICY (e.g. 03284010007). */
export function storePolicyWhatsApp() {
  return String(STORE_POLICY.contact?.whatsapp || STORE_POLICY.contact?.phone || "").trim();
}

export function formatWhatsAppDisplay(whatsapp) {
  const raw = String(whatsapp || storePolicyWhatsApp()).replace(/\D/g, "");
  if (!raw) return storePolicyWhatsApp();
  if (raw.startsWith("92") && raw.length >= 12) return `0${raw.slice(2)}`;
  if (raw.startsWith("0")) return raw;
  if (raw.length === 10) return `0${raw}`;
  return raw;
}

/** Digits for wa.me / tel links (923…). */
export function whatsappWaMeDigits(whatsapp) {
  const display = formatWhatsAppDisplay(whatsapp || storePolicyWhatsApp());
  return String(display).replace(/\D/g, "").replace(/^0/, "92");
}

/** Substitute {whatsapp} in CMS / default copy. */
export function applyWhatsAppPlaceholder(text, whatsapp) {
  const wa = formatWhatsAppDisplay(whatsapp || storePolicyWhatsApp());
  return String(text || "").replace(/\{whatsapp\}/gi, wa);
}

export function formatAdvancePaymentMessage(message, amount, whatsapp) {
  const amt = Math.max(0, Number(amount) || 0);
  const amountStr = formatPrice(amt);
  return applyWhatsAppPlaceholder(
    String(message || DEFAULT_ADVANCE_MESSAGE).replace(/\{amount\}/gi, amountStr),
    whatsapp
  );
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

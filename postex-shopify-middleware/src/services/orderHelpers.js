"use strict";

/**
 * Phone / address helpers for PostEx booking safety.
 */

/** Normalize Pakistani mobile numbers to 03XXXXXXXXX (11 digits). */
function normalizePhone(raw) {
  let s = String(raw || "").replace(/[^\d+]/g, "");
  if (s.startsWith("+92")) s = "0" + s.slice(3);
  else if (s.startsWith("92") && s.length >= 12) s = "0" + s.slice(2);
  s = s.replace(/\D/g, "");
  if (s.length === 10 && s.startsWith("3")) s = "0" + s;
  return s;
}

function isValidPkPhone(normalized) {
  return /^03\d{9}$/.test(String(normalized || ""));
}

/** Flatten address, strip emojis/newlines, cap length. */
function sanitizeAddress(address1, address2, maxLen = 250) {
  const joined = [address1, address2]
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .join(", ");
  const cleaned = joined
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, maxLen);
}

function buildItemsSummary(lineItems) {
  if (!Array.isArray(lineItems) || !lineItems.length) return "Order items";
  return lineItems
    .map((li) => {
      const title = li.title || li.name || "Item";
      const qty = Number(li.quantity) || 1;
      return `${title} x${qty}`;
    })
    .join(", ")
    .slice(0, 500);
}

function countItems(lineItems) {
  if (!Array.isArray(lineItems)) return 1;
  const n = lineItems.reduce((s, li) => s + (Number(li.quantity) || 0), 0);
  return Math.max(1, n);
}

/**
 * COD amount for PostEx:
 * - paid online → 0
 * - pending COD → order total minus any already-captured amount
 */
function computeCodAmount(shopifyOrder) {
  const financial = String(shopifyOrder.financial_status || "").toLowerCase();
  if (financial === "paid") return 0;

  const total = Number(shopifyOrder.total_price || shopifyOrder.current_total_price || 0);
  let captured = 0;
  if (Array.isArray(shopifyOrder.payment_gateway_names)) {
    /* gateway names alone don't tell amount */
  }
  // Shopify sometimes exposes total_outstanding
  if (shopifyOrder.total_outstanding != null && shopifyOrder.total_outstanding !== "") {
    return Math.max(0, Number(shopifyOrder.total_outstanding) || 0);
  }
  // Partial payments: prefer current_total_price - total_received if present
  if (shopifyOrder.total_received != null) {
    captured = Number(shopifyOrder.total_received) || 0;
  }
  return Math.max(0, Math.round((total - captured) * 100) / 100);
}

module.exports = {
  normalizePhone,
  isValidPkPhone,
  sanitizeAddress,
  buildItemsSummary,
  countItems,
  computeCodAmount,
};

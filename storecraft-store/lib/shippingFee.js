/**
 * Single source for delivery fees — checkout, JSON-LD, ai-catalog, policy copy.
 *
 * - Body kits → Rs 0 (customer pays courier at the receiving shop)
 * - Bulky (separators, mats, spoilers, splitters, …) → bulkyFeePKR (500)
 * - Everything else → standardFeePKR (250)
 */
import { STORE_POLICY } from "../config/store-policy.js";
import { productIsBulkyForShipping, productIsShopPaidFreight } from "./bulkyShipping.js";
import { isBodyKitProduct } from "./codEligibility.js";

/**
 * Shipping rate in PKR for a single product (Offer.shippingDetails.shippingRate).
 * @param {object} [product]
 * @returns {number}
 */
export function getShippingRate(product) {
  const std = Number(STORE_POLICY.shipping.standardFeePKR) || 250;
  const bulkyFee = Number(STORE_POLICY.shipping.bulkyFeePKR) || 500;
  if (!product) return std;
  // Bulky name/category wins over body-kits co-tag (e.g. diffuser under body-kits-extensions).
  if (productIsBulkyForShipping(product)) return bulkyFee;
  if (productIsShopPaidFreight(product)) return 0;
  return std;
}

/**
 * @param {object} [product]
 * @returns {number} PKR fee for this product alone (cart may still take max of lines).
 */
export function shippingFeePkr(product) {
  return getShippingRate(product);
}

/**
 * Cart-level fee:
 * - any bulky (non-body-kit) line → bulky fee
 * - all body-kit lines → 0 (shop-paid freight)
 * - else → standard fee
 * @param {Array<object>} [lines]
 */
export function cartShippingFeePkr(lines = []) {
  const list = (Array.isArray(lines) ? lines : []).map((line) => line?.product || line).filter(Boolean);
  if (!list.length) return Number(STORE_POLICY.shipping.standardFeePKR) || 250;

  const bulkyFee = Number(STORE_POLICY.shipping.bulkyFeePKR) || 500;
  if (list.some((p) => productIsBulkyForShipping(p))) return bulkyFee;

  const nonShopPaid = list.filter((p) => !productIsShopPaidFreight(p) && !isBodyKitProduct(p));
  if (nonShopPaid.length === 0) return 0;

  return Number(STORE_POLICY.shipping.standardFeePKR) || 250;
}

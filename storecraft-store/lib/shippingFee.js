/**
 * Single source for delivery fees — checkout, JSON-LD, ai-catalog, policy copy.
 */
import { STORE_POLICY } from "../config/store-policy.js";
import { isBodyKitProduct } from "./codEligibility.js";
import { productIsBulkyForShipping } from "./bulkyShipping.js";

/**
 * Shipping rate in PKR for a single product (Offer.shippingDetails.shippingRate).
 * 500 for bulky (flag, category, or name match); otherwise 250.
 * @param {object} [product]
 * @returns {number}
 */
export function getShippingRate(product) {
  const std = Number(STORE_POLICY.shipping.standardFeePKR) || 250;
  const bulkyFee = Number(STORE_POLICY.shipping.bulkyFeePKR) || 500;
  const bulky =
    productIsBulkyForShipping(product) ||
    (product ? isBodyKitProduct(product) : false);
  return bulky ? bulkyFee : std;
}

/**
 * @param {object} [product]
 * @returns {number} PKR fee for this product alone (cart may still take max of lines).
 */
export function shippingFeePkr(product) {
  return getShippingRate(product);
}

/**
 * Cart-level fee: any bulky / body-kit line → bulky fee.
 * @param {Array<object>} [lines]
 */
export function cartShippingFeePkr(lines = []) {
  const list = Array.isArray(lines) ? lines : [];
  const bulkyFee = Number(STORE_POLICY.shipping.bulkyFeePKR) || 500;
  for (const line of list) {
    const p = line?.product || line;
    if (getShippingRate(p) >= bulkyFee) {
      return bulkyFee;
    }
  }
  return Number(STORE_POLICY.shipping.standardFeePKR) || 250;
}

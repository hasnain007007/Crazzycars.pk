/**
 * Single source for delivery fees — checkout, JSON-LD, ai-catalog, policy copy.
 */
import { STORE_POLICY } from "../config/store-policy.js";
import { isBodyKitProduct } from "./codEligibility.js";

/**
 * @param {object} [product]
 * @returns {number} PKR fee for this product alone (cart may still take max of lines).
 */
export function shippingFeePkr(product) {
  const bulky =
    Boolean(product?.isBulky) ||
    Boolean(product?.is_bulky) ||
    (product ? isBodyKitProduct(product) : false);
  const std = Number(STORE_POLICY.shipping.standardFeePKR) || 250;
  const bulkyFee = Number(STORE_POLICY.shipping.bulkyFeePKR) || 500;
  return bulky ? bulkyFee : std;
}

/**
 * Cart-level fee: any bulky / body-kit line → bulky fee.
 * @param {Array<object>} [lines]
 */
export function cartShippingFeePkr(lines = []) {
  const list = Array.isArray(lines) ? lines : [];
  for (const line of list) {
    const p = line?.product || line;
    if (shippingFeePkr(p) >= (Number(STORE_POLICY.shipping.bulkyFeePKR) || 500)) {
      return Number(STORE_POLICY.shipping.bulkyFeePKR) || 500;
    }
  }
  return Number(STORE_POLICY.shipping.standardFeePKR) || 250;
}

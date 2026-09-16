/**
 * Tiered shipping floors: regular Rs. 250, bulky Rs. 500.
 * Final charge = MAX(floor, zone rate). Never stacked per-item.
 */
import { STORE_POLICY } from "@/config/store-policy";

export function regularShippingFeePKR() {
  return Math.max(0, Number(STORE_POLICY.shipping.standardFeePKR) || 250);
}

export function bulkyShippingFeePKR() {
  return Math.max(
    regularShippingFeePKR(),
    Number(STORE_POLICY.shipping.bulkyFeePKR) || 500
  );
}

/** Floor for MAX(floor, zoneRate). */
export function shippingFloorPKR(hasBulky) {
  return hasBulky ? bulkyShippingFeePKR() : regularShippingFeePKR();
}

export function cartHasBulkyItem(items) {
  return (items || []).some((item) => item && item.isBulky === true);
}

/**
 * Apply policy floor on top of a zone/courier quote.
 * @param {number} zoneRate
 * @param {boolean} hasBulky
 */
export function applyShippingFloor(zoneRate, hasBulky) {
  const zone = Math.max(0, Number(zoneRate) || 0);
  const floor = shippingFloorPKR(!!hasBulky);
  return Math.max(floor, zone > 0 ? zone : floor);
}

export const SHIPPING_ADVANCE_BANNER_EN =
  "Shipping: Rs. 250 regular · Rs. 500 bulky (splitters, side skirts, spoilers, floor mats, etc.). Pay shipping in advance; the rest is Cash on Delivery.";

export const SHIPPING_ADVANCE_BANNER_UR =
  "شپنگ: عام آرڈر Rs. 250، بڑے آئٹمز Rs. 500۔ شپنگ پہلے ادا کریں؛ باقی کیش آن ڈیلیوری۔";

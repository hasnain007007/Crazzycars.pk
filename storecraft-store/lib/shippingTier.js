/**
 * Tiered shipping floors from STORE_POLICY (standardFeePKR / bulkyFeePKR).
 * Final charge = MAX(floor, zone rate). Never stacked per-item.
 */
import { STORE_POLICY } from "@/config/store-policy";

export function regularShippingFeePKR() {
  return Math.max(0, Number(STORE_POLICY.shipping.standardFeePKR) || 0);
}

export function bulkyShippingFeePKR() {
  return Math.max(
    regularShippingFeePKR(),
    Number(STORE_POLICY.shipping.bulkyFeePKR) || 0
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

export {
  shippingAdvanceBannerEn as SHIPPING_ADVANCE_BANNER_EN,
  shippingAdvanceBannerUr as SHIPPING_ADVANCE_BANNER_UR,
} from "@/lib/storePolicyCopy";

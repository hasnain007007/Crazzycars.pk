/**
 * Tiered shipping floors from STORE_POLICY (standardFeePKR / bulkyFeePKR).
 * Final charge = MAX(floor, zone rate). Never stacked per-item.
 * Body-kit-only carts → floor 0 (courier paid at receiving shop).
 */
import { STORE_POLICY } from "@/config/store-policy";
import { productIsBulkyForShipping, productIsShopPaidFreight } from "@/lib/bulkyShipping";

export function regularShippingFeePKR() {
  return Math.max(0, Number(STORE_POLICY.shipping.standardFeePKR) || 0);
}

export function bulkyShippingFeePKR() {
  return Math.max(
    regularShippingFeePKR(),
    Number(STORE_POLICY.shipping.bulkyFeePKR) || 0
  );
}

/**
 * Floor for MAX(floor, zoneRate).
 * @param {boolean} hasBulky
 * @param {{ shopPaidFreightOnly?: boolean }} [opts]
 */
export function shippingFloorPKR(hasBulky, opts = {}) {
  if (opts?.shopPaidFreightOnly) return 0;
  return hasBulky ? bulkyShippingFeePKR() : regularShippingFeePKR();
}

/** True when any cart line needs the bulky Rs 500 floor (excludes body kits). */
export function cartHasBulkyItem(items) {
  return (items || []).some((item) => item && productIsBulkyForShipping(item));
}

/** True when every cart line is shop-paid freight (body kit → Rs 0 on site). */
export function cartIsShopPaidFreightOnly(items) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return false;
  // Any bulky line (mats/separators/diffusers) forces the Rs 500 floor.
  if (list.some((item) => productIsBulkyForShipping(item))) return false;
  return list.every(
    (item) => item.isBodyKit === true || productIsShopPaidFreight(item)
  );
}

/**
 * Resolve cart shipping floor from line products (name/slug/categories/isBulky).
 * @param {Array<object>} items
 * @returns {number}
 */
export function resolveCartShippingFloor(items) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return regularShippingFeePKR();
  if (cartIsShopPaidFreightOnly(list)) return 0;
  if (cartHasBulkyItem(list)) return bulkyShippingFeePKR();
  return regularShippingFeePKR();
}

/**
 * Apply policy floor on top of a zone/courier quote.
 * @param {number} zoneRate
 * @param {boolean} hasBulky
 * @param {{ shopPaidFreightOnly?: boolean }} [opts]
 */
export function applyShippingFloor(zoneRate, hasBulky, opts = {}) {
  if (opts?.shopPaidFreightOnly) return 0;
  const zone = Math.max(0, Number(zoneRate) || 0);
  const floor = shippingFloorPKR(!!hasBulky, opts);
  return Math.max(floor, zone > 0 ? zone : floor);
}

export {
  shippingAdvanceBannerEn as SHIPPING_ADVANCE_BANNER_EN,
  shippingAdvanceBannerUr as SHIPPING_ADVANCE_BANNER_UR,
} from "@/lib/storePolicyCopy";

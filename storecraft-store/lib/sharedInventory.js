/**
 * Shared physical inventory — car-specific listings can sell the same stock as a
 * universal (or other) parent product via inventorySourceProductId.
 */

/**
 * @param {object|null|undefined} product
 * @returns {string|null} parent product id string, or null when this doc owns stock
 */
export function inventorySourceId(product) {
  if (!product || typeof product !== "object") return null;
  const raw =
    product.inventorySourceProductId ??
    product.inventorySourceProduct?._id ??
    product.inventory_source_product_id;
  if (!raw) return null;
  const id = String(raw._id || raw).trim();
  return id && id !== "undefined" && id !== "null" ? id : null;
}

/**
 * Resolve the product document that holds purchasable quantity.
 * @param {object} product
 * @param {Map<string, object>|Record<string, object>|null} [byId]
 */
export function resolveInventoryProduct(product, byId = null) {
  if (!product) return product;
  const srcId = inventorySourceId(product);
  if (!srcId) return product;
  if (byId instanceof Map) {
    return byId.get(srcId) || product;
  }
  if (byId && typeof byId === "object" && byId[srcId]) {
    return byId[srcId];
  }
  const embedded = product.inventorySourceProduct;
  if (embedded && typeof embedded === "object" && embedded.inventory) {
    return embedded;
  }
  return product;
}

/**
 * Quantity available for sale (follows shared parent when set).
 */
export function sharedStockQuantity(product, byId = null) {
  const target = resolveInventoryProduct(product, byId);
  return (
    Number(target?.inventory?.quantity) ||
    Number(target?.inventory?.stock) ||
    Number(target?.stock) ||
    0
  );
}

export function sharedTracksInventory(product, byId = null) {
  const target = resolveInventoryProduct(product, byId);
  return target?.inventory?.trackInventory !== false;
}

export function sharedAllowsBackorder(product, byId = null) {
  const target = resolveInventoryProduct(product, byId);
  return target?.inventory?.allowBackorder === true;
}

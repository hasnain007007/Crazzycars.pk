/**
 * Stock alert sync after product inventory changes.
 */
import StockAlert from "@/lib/models/StockAlert.model";

/**
 * @param {import("mongoose").Document} product — saved Product document with inventory populated
 */
export async function syncStockAlertForProduct(product) {
  const id = product._id;
  const track = product.inventory?.trackInventory !== false;
  const q = Number(product.inventory?.quantity) || 0;
  const th = Number(product.inventory?.lowStockThreshold ?? 5);

  if (!track || q > th) {
    await StockAlert.updateMany(
      { product: id, resolved: false },
      { $set: { resolved: true, status: "restocked" } }
    );
    return;
  }

  await StockAlert.findOneAndUpdate(
    { product: id, resolved: false },
    {
      $set: {
        quantity: q,
        threshold: th,
        resolved: false,
        status: "active",
      },
      // Do not repeat keys from $set inside $setOnInsert; Mongo rejects conflicting paths.
      $setOnInsert: { product: id },
    },
    { upsert: true }
  );
}

import { normalizeMediaImages } from "@/lib/productPayload";
import { imageBelongsToProduct } from "@/lib/mediaAltGuard";

/**
 * Persist-safe image rows (drops client-only keys like _localId).
 * Prefer photos that belong to this SKU; never wipe the whole gallery when
 * the alt-guard false-positives (that left products with visible UI photos
 * but empty JSON-LD `image` after the next admin save).
 */
export function sanitizeMediaImages(images, product = {}) {
  const normalized = normalizeMediaImages(images);
  if (!normalized.length) return [];
  const owned = normalized.filter((img) => imageBelongsToProduct(img, product));
  return owned.length ? owned : normalized;
}

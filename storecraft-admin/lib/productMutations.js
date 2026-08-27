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
 * Also drops photos whose alt or Cloudinary filename belong to another SKU.
 */
export function sanitizeMediaImages(images, product = {}) {
  return normalizeMediaImages(images).filter((img) => imageBelongsToProduct(img, product));
}

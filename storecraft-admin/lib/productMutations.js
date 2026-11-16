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
import { applyCustomerFacingAlts, imageBelongsToProduct } from "@/lib/mediaAltGuard";

function filterOwnedOrKeep(normalized, product = {}) {
  if (!normalized.length) return [];
  const owned = normalized.filter((img) => imageBelongsToProduct(img, product));
  return owned.length ? owned : normalized;
}

/**
 * Persist-safe image rows for admin/API create + update (gallery save).
 * Empty alts get product name / "name - detail". Forbidden alts are REJECTED
 * (clear error) — never silently rewritten on these paths.
 */
export function sanitizeMediaImages(images, product = {}) {
  const prepared = filterOwnedOrKeep(normalizeMediaImages(images), product);
  return applyCustomerFacingAlts(prepared, product, { mode: "reject" }).images;
}

/**
 * CSV import only: forbidden alts are auto-fixed to the product name.
 * Returns { images, altFixes } so the import response can list every change.
 */
export function sanitizeMediaImagesForCsv(images, product = {}) {
  const prepared = filterOwnedOrKeep(normalizeMediaImages(images), product);
  return applyCustomerFacingAlts(prepared, product, { mode: "csv" });
}

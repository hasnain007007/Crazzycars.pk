/**
 * Cloudinary account dquier8fv is disabled — order/invoice line snapshots still
 * embed those URLs. Prefer the live product /media image when available.
 */

const CLOUDINARY_RE = /res\.cloudinary\.com|dquier8fv/i;

export function isBrokenCloudinaryUrl(url) {
  return CLOUDINARY_RE.test(String(url || ""));
}

export function productMainImageUrl(product) {
  const images = Array.isArray(product?.media?.images) ? product.media.images : [];
  if (!images.length) return "";
  const main = images.find((img) => img?.isMain && img?.url) || images.find((img) => img?.url);
  return String(main?.url || "").trim();
}

/**
 * @param {{ image?: string, productId?: unknown }[]} items
 * @param {Map<string, { media?: { images?: { url?: string, isMain?: boolean }[] } }>} productById
 */
export function resolveLineItemImages(items, productById) {
  const list = Array.isArray(items) ? items : [];
  const map = productById instanceof Map ? productById : new Map();
  return list.map((item) => {
    const image = String(item?.image || "").trim();
    if (!image || !isBrokenCloudinaryUrl(image)) return item;
    const pid = item?.productId ? String(item.productId) : "";
    const live = pid ? productMainImageUrl(map.get(pid)) : "";
    if (!live) return { ...item, image: "" };
    return { ...item, image: live };
  });
}

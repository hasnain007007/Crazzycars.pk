/**
 * Image alt fallbacks for catalogue surfaces.
 * Decorative images should pass decorative=true → "".
 */

export function productImageAlt(image, product, index = null) {
  if (!product && !image) return "";
  const fromImg = String(image?.altText || image?.alt || "").trim();
  if (fromImg) return fromImg;
  const name = String(product?.name || product?.title || "").trim();
  if (!name) return "";
  if (index != null && Number(index) >= 0) {
    return `${name} – image ${Number(index) + 1}`;
  }
  return name;
}

export function categoryImageAlt(image, category) {
  const fromImg = String(image?.altText || image?.alt || "").trim();
  if (fromImg) return fromImg;
  return String(category?.name || "").trim();
}

export function decorativeAlt() {
  return "";
}

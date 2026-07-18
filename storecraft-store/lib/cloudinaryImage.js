/**
 * Optimize Cloudinary delivery URLs (f_auto, q_auto, width).
 * Leaves non-Cloudinary URLs unchanged.
 */
export function cloudinaryUrl(src, { width, height, crop = "fill", quality = "auto" } = {}) {
  const url = String(src || "").trim();
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }
  // Already transformed
  if (/\/upload\/[^/]*f_auto/.test(url) || /\/upload\/w_\d+/.test(url)) {
    return url;
  }
  const parts = [];
  parts.push("f_auto");
  parts.push(`q_${quality}`);
  if (width) parts.push(`w_${Math.round(width)}`);
  if (height) parts.push(`h_${Math.round(height)}`);
  if (width || height) parts.push(`c_${crop}`);
  const transform = parts.join(",");
  return url.replace("/upload/", `/upload/${transform}/`);
}

export function heroImageUrl(src) {
  return cloudinaryUrl(src, { width: 1920, height: 900, crop: "fill" });
}

export function heroImageUrlMobile(src) {
  return cloudinaryUrl(src, { width: 828, height: 1100, crop: "fill" });
}

export function cardImageUrl(src) {
  return cloudinaryUrl(src, { width: 600, height: 600, crop: "fill" });
}

export function storyImageUrlOptimized(src) {
  return cloudinaryUrl(src, { width: 900, height: 700, crop: "fill" });
}

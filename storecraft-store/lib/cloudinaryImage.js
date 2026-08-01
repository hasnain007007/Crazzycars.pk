/**
 * Optimize Cloudinary delivery URLs (f_auto, q_auto, width).
 * Re-applies transforms so callers can request slot-appropriate sizes.
 * Leaves non-Cloudinary URLs unchanged.
 */

const UPLOAD_RE =
  /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video|raw)\/upload\/)(.+)$/i;

function isTransformSegment(segment) {
  if (!segment) return false;
  if (segment.includes(",")) return true;
  return /^(f_|q_|w_|h_|c_|g_|e_|b_|dpr_)/.test(segment);
}

function stripTransforms(remainder) {
  let path = remainder;
  while (path) {
    const seg = path.split("/")[0];
    if (!isTransformSegment(seg)) break;
    path = path.slice(seg.length + 1);
  }
  return path;
}

export function cloudinaryUrl(src, { width, height, crop = "fill", quality = "auto" } = {}) {
  const url = String(src || "").trim();
  if (!url) return url;

  const match = url.match(UPLOAD_RE);
  if (!match) return url;

  const prefix = match[1];
  const remainder = stripTransforms(match[2]);

  const parts = ["f_auto", `q_${quality}`];
  if (width) parts.push(`w_${Math.round(width)}`);
  if (height) parts.push(`h_${Math.round(height)}`);
  if (width || height) parts.push(`c_${crop}`);
  const transform = parts.join(",");

  return `${prefix}${transform}/${remainder}`;
}

/** Responsive srcset for Cloudinary images (raw <img> when next/image is not used). */
export function cloudinarySrcSet(src, widths = [320, 480, 640]) {
  const unique = [...new Set(widths.map((w) => Math.round(w)).filter((w) => w > 0))].sort((a, b) => a - b);
  return unique
    .map((w) => `${cloudinaryUrl(src, { width: w, height: w, crop: "fill" })} ${w}w`)
    .join(", ");
}

/**
 * Homepage hero — designed banners often include left/right copy in the artwork.
 * Serve larger + sharper than product thumbs so text/artwork stays crisp on retina.
 */
export function heroImageUrl(src) {
  return cloudinaryUrl(src, { width: 2400, crop: "limit", quality: "auto:best" });
}

export function heroImageUrlMobile(src) {
  return cloudinaryUrl(src, { width: 1200, crop: "limit", quality: "auto:best" });
}

/** Product / card thumbnails — default 480px (2× for ~240px slots). */
export function cardImageUrl(src, width = 480) {
  return cloudinaryUrl(src, { width, height: width, crop: "fill" });
}

/** Category grid circles — ~200–320px rendered. */
export function categoryImageUrl(src, width = 360) {
  return cloudinaryUrl(src, { width, height: width, crop: "fill" });
}

/** Category page single banner (wide landscape). */
export function categoryBannerUrl(src) {
  return cloudinaryUrl(src, { width: 1400, height: 480, crop: "fill" });
}

/** Category page hero collage slots (legacy). */
export function categoryHeroImageUrl(src, width = 320) {
  return cloudinaryUrl(src, { width, height: width, crop: "fill" });
}

export function storyImageUrlOptimized(src) {
  return cloudinaryUrl(src, { width: 720, height: 560, crop: "fill" });
}

/** Small logo / brand chip. */
export function logoImageUrl(src, width = 120) {
  return cloudinaryUrl(src, { width, crop: "limit" });
}

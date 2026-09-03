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

export function isLocalMedia(src) {
  const u = String(src || "").trim();
  return /crazzycars\.pk\/media\/|^\/media\//i.test(u);
}

export function cloudinaryUrl(src, { width, height, crop = "fill", quality = "auto", format = "auto", gravity, effects = [] } = {}) {
  const url = String(src || "").trim();
  if (!url) return url;

  // Local /media/ images — use Next.js image optimizer
  if (isLocalMedia(url)) {
    const w = width || 480;
    const q = typeof quality === "number" ? quality : 75;
    // Normalize to absolute URL for next/image loader
    const abs = url.startsWith("/media/") ? `https://crazzycars.pk${url}` : url;
    return `/_next/image?url=${encodeURIComponent(abs)}&w=${w}&q=${q}`;
  }

  const match = url.match(UPLOAD_RE);
  if (!match) return url;

  const prefix = match[1];
  const remainder = stripTransforms(match[2]);

  const parts = [];
  if (format) parts.push(`f_${format}`);
  if (quality != null && quality !== "") parts.push(`q_${quality}`);
  if (width) parts.push(`w_${Math.round(width)}`);
  if (height) parts.push(`h_${Math.round(height)}`);
  if (width || height) parts.push(`c_${crop}`);
  if (gravity) parts.push(`g_${gravity}`);
  for (const effect of Array.isArray(effects) ? effects : []) {
    if (effect) parts.push(String(effect));
  }
  const transform = parts.join(",");

  return `${prefix}${transform}/${remainder}`;
}

/** Responsive srcset for Cloudinary or local media images. */
export function cloudinarySrcSet(src, widths = [320, 480, 640], { crop = "fill" } = {}) {
  const unique = [...new Set(widths.map((w) => Math.round(w)).filter((w) => w > 0))].sort((a, b) => a - b);
  return unique
    .map((w) => {
      const opts = crop === "fill" ? { width: w, height: w, crop: "fill" } : { width: w, crop };
      return `${cloudinaryUrl(src, opts)} ${w}w`;
    })
    .join(", ");
}

/**
 * Homepage hero — slot-sized, not 2560@q100 (that blew mobile LCP past 2.5s).
 * `auto:good` keeps designed-banner text sharp without a lossless multi-megabyte file.
 * c_limit never upscales.
 */
export function heroImageUrl(src) {
  return cloudinaryUrl(src, { width: 1920, crop: "limit", quality: "auto:good", format: "auto" });
}

export function heroImageUrlMobile(src) {
  return cloudinaryUrl(src, { width: 828, crop: "limit", quality: "auto:good", format: "auto" });
}

/** PDP main viewer — contain-fit, no square crop. 720 is 2× a ~360px mobile column. */
export function pdpImageUrl(src, width = 720) {
  return cloudinaryUrl(src, { width, crop: "limit" });
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

/** Wide cinematic cover for the homepage editorial band. */
export function editorialCoverUrl(src) {
  return cloudinaryUrl(src, {
    width: 1600,
    height: 1000,
    crop: "fill",
    quality: "auto:good",
    format: "auto",
    gravity: "auto",
    effects: ["e_saturation:-18", "e_brightness:-4", "e_contrast:8"],
  });
}

/** Small parts-detail plate on the editorial band. */
export function editorialInsetUrl(src) {
  return cloudinaryUrl(src, {
    width: 360,
    height: 240,
    crop: "fill",
    quality: "auto:good",
    format: "auto",
    gravity: "auto",
    effects: ["e_saturation:-15", "e_brightness:-8"],
  });
}

/** Small logo / brand chip. */
export function logoImageUrl(src, width = 120) {
  return cloudinaryUrl(src, { width, crop: "limit" });
}

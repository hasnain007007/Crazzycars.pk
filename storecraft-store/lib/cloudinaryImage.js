/**
 * Optimize Cloudinary delivery URLs (f_auto, q_auto, width).
 * Re-applies transforms so callers can request slot-appropriate sizes.
 * Local /media URLs go through Next `/_next/image` at the nearest allowed width
 * so product/category cards stop downloading full-size WebPs.
 */

const UPLOAD_RE =
  /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video|raw)\/upload\/)(.+)$/i;

/** Must match next.config.mjs images.deviceSizes + imageSizes. */
const NEXT_IMAGE_WIDTHS = [
  16, 32, 48, 64, 96, 128, 256, 360, 400, 480, 640, 750, 828, 1080, 1200, 1920,
];

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

/** Absolute or relative /media/... path for the Next image optimizer. */
export function localMediaPath(src) {
  const raw = String(src || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw, "https://crazzycars.pk");
    if (!u.pathname.startsWith("/media/")) return "";
    return u.pathname;
  } catch {
    return raw.startsWith("/media/") ? raw.split("?")[0] : "";
  }
}

function nearestNextWidth(width) {
  const n = Math.round(Number(width) || 0);
  if (n <= 0) return null;
  let best = NEXT_IMAGE_WIDTHS[0];
  for (const w of NEXT_IMAGE_WIDTHS) {
    if (w < n) {
      best = w;
      continue;
    }
    // Prefer the smallest allowed width that is >= request (no soft upscale).
    return Math.abs(w - n) <= Math.abs(best - n) ? w : best;
  }
  return best;
}

function localMediaOptimizedUrl(src, width, quality = 82) {
  const path = localMediaPath(src);
  if (!path) return String(src || "").trim();
  const w = nearestNextWidth(width);
  if (!w) return path;
  const q = Math.min(90, Math.max(50, Math.round(Number(quality) || 82)));
  return `/_next/image?url=${encodeURIComponent(path)}&w=${w}&q=${q}`;
}

export function cloudinaryUrl(src, { width, height, crop = "fill", quality = "auto", format = "auto", gravity, effects = [] } = {}) {
  const url = String(src || "").trim();
  if (!url) return url;

  // Slot-sized local media via Next optimizer (cards/thumbs). Full URLs when no width.
  if (isLocalMedia(url)) {
    if (!width) return localMediaPath(url) || url;
    const q =
      quality === "auto" || quality === "auto:good"
        ? 82
        : quality === "auto:eco"
          ? 75
          : quality === "auto:best"
            ? 86
            : Number(quality) || 82;
    return localMediaOptimizedUrl(url, width, q);
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
 * Local banners are already compressed WebP (~100–160KB); serve directly for LCP
 * (avoid /_next/image cold-generate on the first paint). Mobile still gets a smaller w.
 */
export function heroImageUrl(src) {
  if (isLocalMedia(src)) return localMediaPath(src) || String(src || "").trim();
  return cloudinaryUrl(src, { width: 1920, crop: "limit", quality: "auto:good", format: "auto" });
}

export function heroImageUrlMobile(src) {
  if (isLocalMedia(src)) return localMediaOptimizedUrl(src, 828, 78);
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

/**
 * Optimize Cloudinary delivery URLs (f_auto, q_auto, width).
 * Re-applies transforms so callers can request slot-appropriate sizes.
 *
 * Local /media is served directly (already compressed WebP on the VPS).
 * Do NOT wrap local media in `/_next/image?q=…` — Next only allows a small
 * set of quality values, and invalid `q` returns HTTP 400 (blank site images).
 */

const UPLOAD_RE =
  /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video|raw)\/upload\/)(.+)$/i;

/** True when src is a Cloudinary delivery URL (transforms OK again — account live). */
export function isCloudinaryUrl(src) {
  return /res\.cloudinary\.com/i.test(String(src || ""));
}

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

/** If a stale client still has `/_next/image?url=/media/...`, unwrap it. */
export function unwrapNextImageUrl(src) {
  const raw = String(src || "").trim();
  if (!raw) return "";
  if (!raw.includes("/_next/image")) return raw;
  try {
    const u = new URL(raw, "https://crazzycars.pk");
    const inner = u.searchParams.get("url");
    if (inner) return unwrapNextImageUrl(decodeURIComponent(inner));
  } catch {
    /* keep raw */
  }
  return raw;
}

export function isLocalMedia(src) {
  const u = unwrapNextImageUrl(src);
  return /crazzycars\.pk\/media\/|^\/media\//i.test(u);
}

/** Absolute or relative /media/... path (query stripped). */
export function localMediaPath(src) {
  const raw = unwrapNextImageUrl(src);
  if (!raw) return "";
  try {
    const u = new URL(raw, "https://crazzycars.pk");
    if (!u.pathname.startsWith("/media/")) return "";
    return u.pathname;
  } catch {
    return raw.startsWith("/media/") ? raw.split("?")[0] : "";
  }
}

/**
 * Prefer prebuilt -400.webp thumbs for card-sized local media.
 * Categories and products use `{stem}-400.webp` beside the master.
 * Missing thumbs: <img onError> falls back to the original master URL.
 */
function localMediaForWidth(src, width) {
  const path = localMediaPath(src) || "";
  const w = Number(width) || 0;
  if (!path || !(w > 0 && w <= 480)) {
    return path || unwrapNextImageUrl(src) || String(src || "").trim();
  }
  if (/-400\.(webp|jpe?g|png)$/i.test(path)) {
    return path;
  }
  if (/\/media\/(categories|products|uploads)\//i.test(path)) {
    return path.replace(/\.(webp|jpe?g|png|gif|avif)$/i, "-400.webp");
  }
  return path || unwrapNextImageUrl(src) || String(src || "").trim();
}

export function cloudinaryUrl(src, { width, height, crop = "fill", quality = "auto", format = "auto", gravity, effects = [] } = {}) {
  const url = String(src || "").trim();
  if (!url) return url;

  // Local masters are already compressed. Serve them directly — never /_next/image.
  if (isLocalMedia(url) || unwrapNextImageUrl(url).includes("/media/")) {
    return localMediaForWidth(url, width);
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

/** Responsive srcset — Cloudinary only. Local media uses a single pre-sized file. */
export function cloudinarySrcSet(src, widths = [320, 480, 640], { crop = "fill" } = {}) {
  if (isLocalMedia(src) || unwrapNextImageUrl(src).includes("/media/")) {
    return "";
  }
  const unique = [...new Set(widths.map((w) => Math.round(w)).filter((w) => w > 0))].sort((a, b) => a - b);
  return unique
    .map((w) => {
      const opts = crop === "fill" ? { width: w, height: w, crop: "fill" } : { width: w, crop };
      return `${cloudinaryUrl(src, opts)} ${w}w`;
    })
    .join(", ");
}

/**
 * Homepage hero — local banners are HQ-compressed WebP on /media.
 * Desktop: master. Mobile: dedicated *-mobile.webp when present in Mongo,
 * otherwise the same master (heroImageUrlMobile still returns a path).
 */
export function heroImageUrl(src) {
  if (isLocalMedia(src)) return localMediaPath(src) || String(src || "").trim();
  return cloudinaryUrl(src, { width: 1920, crop: "limit", quality: "auto:good", format: "auto" });
}

export function heroImageUrlMobile(src) {
  if (isLocalMedia(src)) return localMediaPath(src) || String(src || "").trim();
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

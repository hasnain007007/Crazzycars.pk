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
 * Local /media derivatives (masters kept on disk).
 *
 * IMPORTANT: suffix size is NOT reliable across folders.
 * Product gallery handoffs often ship `-sm.webp` at 200×200 and `-400.webp` at
 * 400×400 while the master is 1200×1200. Some legacy `-sm` files are full-res.
 * Always inspect pixels when diagnosing; never assume `-sm` means "PDP large".
 *
 * Slot mapping for products / cars / brand:
 *  - thumb strip + cards (≤480) → `-400.webp` (srcset: 400 + 800 only)
 *  - PDP main stage → `-1200.webp` (srcset: 800 + 1200; master only onError)
 *
 * Categories / banners may still prefer `-sm` via categoryBannerUrl().
 * Missing derivatives: <img onError> falls back -400/-800/-1200 → master.
 */
const DERIV_SUFFIX_RE = /-(400|sm|800|1200|full)\.(webp|jpe?g|png|gif|avif)$/i;

function localMediaMasterPath(path) {
  return String(path || "").replace(DERIV_SUFFIX_RE, ".$2");
}

function localMediaForWidth(src, width) {
  const path = localMediaPath(src) || "";
  const fallback = path || unwrapNextImageUrl(src) || String(src || "").trim();
  if (!path) return fallback;
  // Already a concrete derivative — keep as requested.
  if (DERIV_SUFFIX_RE.test(path)) return path;
  if (!/\/media\/(categories|products|uploads|blogs|vehicles|cars|brand)\//i.test(path)) {
    return fallback;
  }
  const master = localMediaMasterPath(path);
  const stem = master.replace(/\.(webp|jpe?g|png|gif|avif)$/i, "");
  const w = Number(width) || 0;
  // Thumbnail strip + card slots → -400.webp.
  if (w > 0 && w <= 480) {
    return `${stem}-400.webp`;
  }
  // Mid cards / hover → -800.webp (never the multi-MB master).
  if (w > 0 && w <= 900) {
    return `${stem}-800.webp`;
  }
  // PDP gallery main stage → -1200.webp (master only via onError fallback).
  return `${stem}-1200.webp`;
}

/** Build sibling derivative path from any /media URL. */
export function localMediaDerivative(src, kind /* "sm" | "400" | "800" | "1200" | "original" */) {
  const path = localMediaPath(src) || "";
  if (!path) return String(src || "").trim();
  const master = localMediaMasterPath(path);
  const stem = master.replace(/\.(webp|jpe?g|png|gif|avif)$/i, "");
  if (kind === "original") return master;
  if (kind === "sm") return `${stem}-sm.webp`;
  if (kind === "400") return `${stem}-400.webp`;
  if (kind === "800") return `${stem}-800.webp`;
  if (kind === "1200") return `${stem}-1200.webp`;
  return master;
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

/**
 * Responsive srcset for local /media.
 * - card: -400 / -800 only (NEVER the master — that was the Jaecoo 2 MB leak)
 * - gallery: -800 / -1200 only (master only via <img onError>)
 */
/**
 * Client-safe srcset builder (no disk check). Prefer `localMediaSrcSetExisting`
 * from `@/lib/resolveLocalMedia` on the server when emitting HTML srcset.
 * Missing files fall back via <img onError>; nightly HEAD audit catches gaps.
 */
export function localMediaSrcSet(src, { mode = "card" } = {}) {
  const path = localMediaPath(src) || "";
  if (!path) return "";
  if (!/\/media\/(categories|products|uploads|blogs|vehicles|cars|brand)\//i.test(path)) {
    return "";
  }
  const master = localMediaMasterPath(path);
  const stem = master.replace(/\.(webp|jpe?g|png|gif|avif)$/i, "");
  if (mode === "gallery") {
    return `${stem}-800.webp 800w, ${stem}-1200.webp 1200w`;
  }
  // Cards / related / listings — cap at 800w so desktop DPR never fetches the master.
  return `${stem}-400.webp 400w, ${stem}-800.webp 800w`;
}

/** Responsive srcset — Cloudinary widths, or local derivative pair. */
export function cloudinarySrcSet(src, widths = [320, 480, 640], { crop = "fill", mode } = {}) {
  if (isLocalMedia(src) || unwrapNextImageUrl(src).includes("/media/")) {
    const maxW = Math.max(0, ...widths.map((w) => Math.round(Number(w) || 0)));
    const resolvedMode = mode || (maxW > 900 ? "gallery" : "card");
    return localMediaSrcSet(src, { mode: resolvedMode });
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

/**
 * PDP main viewer — local -1200.webp (or Cloudinary limit-fit).
 * Pass width ≥ 901 so localMediaForWidth picks the gallery derivative.
 */
export function pdpImageUrl(src, width = 1200) {
  return cloudinaryUrl(src, { width, crop: "limit" });
}

/** Product / card thumbnails — default 400px slot (srcset adds -800 for DPR). */
export function cardImageUrl(src, width = 400) {
  return cloudinaryUrl(src, { width, height: width, crop: "fill" });
}

/** Category grid circles — ~200–320px rendered. */
export function categoryImageUrl(src, width = 360) {
  return cloudinaryUrl(src, { width, height: width, crop: "fill" });
}

/**
 * Category page hero banner — prefer S7 `-sm.webp` (many `-800.webp` files 404'd and
 * poisoned LCP). LocalMediaImg falls back to master when -sm is missing.
 */
export function categoryBannerUrl(src) {
  const path = localMediaPath(src) || "";
  if (path && /\/media\/(categories|uploads|brand)\//i.test(path)) {
    if (/-(sm|800)\.webp$/i.test(path)) return path.replace(/-800\.webp$/i, "-sm.webp");
    if (/-400\.(webp|jpe?g|png)$/i.test(path)) {
      return path.replace(/-400\.(webp|jpe?g|png)$/i, "-sm.webp");
    }
    return path.replace(/\.(webp|jpe?g|png|gif|avif)$/i, "-sm.webp");
  }
  return cloudinaryUrl(src, { width: 800, height: 480, crop: "fill" });
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
  // Local masters can be multi-hundred KB; prefer prebuilt -800.webp when present.
  if (isLocalMedia(src) || unwrapNextImageUrl(src).includes("/media/")) {
    const path = localMediaPath(src);
    if (path && /\/media\/(brand|uploads|categories)\//i.test(path)) {
      return path.replace(/\.(webp|jpe?g|png|gif|avif)$/i, "-800.webp");
    }
    return path || unwrapNextImageUrl(src) || String(src || "").trim();
  }
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

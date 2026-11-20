/**
 * Server-only: pick a /media derivative that actually exists on disk.
 *
 * PDP / OG / LCP should prefer the master. Product `-sm.webp` is often a 200×200
 * thumbnail from the gallery pipeline — never assume it is display-sized.
 *
 * Avoid path.join(dynamic) — Turbopack treats it as whole-project tracing and
 * fails the production build. Use string paths + turbopackIgnore on fs calls.
 */
import fs from "node:fs";
import { localMediaPath, unwrapNextImageUrl } from "@/lib/cloudinaryImage";

const MEDIA_ROOT = String(process.env.MEDIA_ROOT || "/app/media").replace(/\/+$/, "");

function diskPathForMediaUrl(mediaPath) {
  const p = String(mediaPath || "").split("?")[0];
  if (!p.startsWith("/media/")) return "";
  const rel = p.slice("/media/".length);
  if (!rel || rel.includes("..") || rel.startsWith("/")) return "";
  return `${MEDIA_ROOT}/${rel}`;
}

function existsMedia(mediaPath) {
  const disk = diskPathForMediaUrl(mediaPath);
  if (!disk) return false;
  try {
    return fs.existsSync(/* turbopackIgnore: true */ disk);
  } catch {
    return false;
  }
}

/** Strip known size suffixes to get the master stem path. */
export function mediaMasterPath(mediaPath) {
  const p = String(mediaPath || "").split("?")[0];
  return p.replace(/-(400|sm|800|1200|full)\.(webp|jpe?g|png|gif|avif)$/i, ".$2");
}

/**
 * @param {string} src
 * @param {{ prefer?: Array<"sm"|"400"|"800"|"1200"|"original"> }} [opts]
 */
export function resolveExistingLocalMedia(src, opts = {}) {
  const prefer = opts.prefer || ["sm", "400", "original"];
  const raw = unwrapNextImageUrl(src);
  const pathOnly =
    localMediaPath(raw) ||
    (String(raw || "").startsWith("/media/") ? String(raw).split("?")[0] : "");
  if (!pathOnly) return String(src || "").trim();

  const master = mediaMasterPath(pathOnly);
  const stem = master.replace(/\.(webp|jpe?g|png|gif|avif)$/i, "");

  const candidates = [];
  for (const kind of prefer) {
    if (kind === "sm") candidates.push(`${stem}-sm.webp`);
    else if (kind === "400") candidates.push(`${stem}-400.webp`);
    else if (kind === "800") candidates.push(`${stem}-800.webp`);
    else if (kind === "1200") candidates.push(`${stem}-1200.webp`);
    else if (kind === "original") {
      candidates.push(master);
      if (!/\.webp$/i.test(master)) candidates.push(`${stem}.webp`);
    }
  }
  // Last-resort fallback only when prefer already asked for original, or nothing else exists.
  if (prefer.includes("original") && !candidates.includes(master)) candidates.push(master);

  for (const c of candidates) {
    if (existsMedia(c)) return c;
  }
  return master || pathOnly;
}

/**
 * OG / Twitter metadata — keep preferring `-800` then master (unchanged URL policy for Phase 1B).
 * Do not use this for the visible gallery.
 */
export function pdpImageUrlExisting(src) {
  return resolveExistingLocalMedia(src, { prefer: ["800", "original", "400", "sm"] });
}

/**
 * Visible PDP gallery / LCP preload — prefer `-800` then `-1200`.
 * Mobile PSI (412×1.75 ≈ 721px) selects 800w from srcset; using 1200 as <img src>
 * while preload imageSrcSet picked 800 caused a non-reused fetch (load delay ~310ms).
 */
export function galleryImageUrlExisting(src) {
  return resolveExistingLocalMedia(src, { prefer: ["800", "1200", "400", "original"] });
}

/** Desktop/retina gallery candidate — prefer -1200 when on disk. */
export function galleryImageUrl1200Existing(src) {
  return resolveExistingLocalMedia(src, { prefer: ["1200", "800", "400", "original"] });
}

/** Thumbnail strip / tiny cards — prefer small derivatives. */
export function thumbImageUrlExisting(src) {
  return resolveExistingLocalMedia(src, { prefer: ["400", "sm", "800", "original"] });
}

/**
 * Responsive srcset that only lists derivatives present on disk.
 * Falls back to -400 / master when -800/-1200 are missing (avoids browser 404s).
 * @param {string} src
 * @param {{ mode?: "card" | "gallery" }} [opts]
 */
export function localMediaSrcSetExisting(src, { mode = "card" } = {}) {
  const pathOnly =
    localMediaPath(unwrapNextImageUrl(src)) ||
    (String(src || "").startsWith("/media/") ? String(src).split("?")[0] : "");
  if (!pathOnly) return "";
  if (!/\/media\/(categories|products|uploads|blogs|vehicles|cars|brand)\//i.test(pathOnly)) {
    return "";
  }
  const master = mediaMasterPath(pathOnly);
  const stem = master.replace(/\.(webp|jpe?g|png|gif|avif)$/i, "");
  const as400 = `${stem}-400.webp`;
  const as800 = `${stem}-800.webp`;
  const as1200 = `${stem}-1200.webp`;
  const parts = [];
  if (mode === "gallery") {
    if (existsMedia(as800)) parts.push(`${as800} 800w`);
    if (existsMedia(as1200)) parts.push(`${as1200} 1200w`);
    if (!parts.length && existsMedia(as400)) parts.push(`${as400} 400w`);
    if (!parts.length && existsMedia(master)) parts.push(`${master} 1200w`);
    return parts.join(", ");
  }
  if (existsMedia(as400)) parts.push(`${as400} 400w`);
  if (existsMedia(as800)) parts.push(`${as800} 800w`);
  if (!parts.length && existsMedia(as1200)) parts.push(`${as1200} 800w`);
  if (!parts.length && existsMedia(master)) parts.push(`${master} 400w`);
  return parts.join(", ");
}

export function mediaRootPath() {
  return MEDIA_ROOT;
}

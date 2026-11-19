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
 * Visible PDP gallery / LCP preload — prefer `-1200` then `-800`; master only if variants missing.
 */
export function galleryImageUrlExisting(src) {
  return resolveExistingLocalMedia(src, { prefer: ["1200", "800", "400", "original"] });
}

/** Thumbnail strip / tiny cards — prefer small derivatives. */
export function thumbImageUrlExisting(src) {
  return resolveExistingLocalMedia(src, { prefer: ["400", "sm", "800", "original"] });
}

export function mediaRootPath() {
  return MEDIA_ROOT;
}

/**
 * Server-only: pick a /media derivative that actually exists on disk.
 * Prefer -sm → -400 → original. Never return a path that is missing.
 *
 * MEDIA root: bind-mounted at /app/media in production (= /data/crazzycars/media on host).
 */
import fs from "node:fs";
import path from "node:path";
import { localMediaPath, unwrapNextImageUrl } from "@/lib/cloudinaryImage";

const MEDIA_ROOT = process.env.MEDIA_ROOT || path.join(process.cwd(), "media");

function diskPathForMediaUrl(mediaPath) {
  const p = String(mediaPath || "").split("?")[0];
  if (!p.startsWith("/media/")) return "";
  // Prevent path traversal
  const rel = p.slice("/media/".length);
  if (!rel || rel.includes("..")) return "";
  return path.join(MEDIA_ROOT, rel);
}

function existsMedia(mediaPath) {
  const disk = diskPathForMediaUrl(mediaPath);
  if (!disk) return false;
  try {
    return fs.existsSync(disk) && fs.statSync(disk).isFile();
  } catch {
    return false;
  }
}

/** Strip known size suffixes to get the master stem path. */
export function mediaMasterPath(mediaPath) {
  const p = String(mediaPath || "").split("?")[0];
  return p.replace(/-(400|sm|800)\.(webp|jpe?g|png|gif|avif)$/i, ".$2");
}

/**
 * @param {string} src - product/category image URL or /media path
 * @param {{ prefer?: Array<"sm"|"400"|"800"|"original"> }} [opts]
 * @returns {string} best existing URL path (or original input if not local /media)
 */
export function resolveExistingLocalMedia(src, opts = {}) {
  const prefer = opts.prefer || ["sm", "400", "original"];
  const raw = unwrapNextImageUrl(src);
  const pathOnly = localMediaPath(raw) || (String(raw || "").startsWith("/media/") ? String(raw).split("?")[0] : "");
  if (!pathOnly) return String(src || "").trim();

  const master = mediaMasterPath(pathOnly);
  const stem = master.replace(/\.(webp|jpe?g|png|gif|avif)$/i, "");
  const extMatch = master.match(/\.(webp|jpe?g|png|gif|avif)$/i);
  const ext = extMatch ? extMatch[0] : ".webp";

  const candidates = [];
  for (const kind of prefer) {
    if (kind === "sm") candidates.push(`${stem}-sm.webp`);
    else if (kind === "400") candidates.push(`${stem}-400.webp`);
    else if (kind === "800") candidates.push(`${stem}-800.webp`);
    else if (kind === "original") {
      candidates.push(master);
      // also try .webp master if original was jpg
      if (!/\.webp$/i.test(master)) candidates.push(`${stem}.webp`);
    }
  }
  // Always end with master
  if (!candidates.includes(master)) candidates.push(master);

  for (const c of candidates) {
    if (existsMedia(c)) return c;
  }
  // Nothing on disk — still return master path (caller/onError handles 404)
  return master || pathOnly;
}

/** PDP / OG / preload: never advertise a missing -sm. */
export function pdpImageUrlExisting(src) {
  return resolveExistingLocalMedia(src, { prefer: ["sm", "400", "original"] });
}

export function mediaRootPath() {
  return MEDIA_ROOT;
}

/**
 * Server-only: pick a /media derivative that actually exists on disk.
 * Prefer -sm → -400 → original.
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
  return p.replace(/-(400|sm|800)\.(webp|jpe?g|png|gif|avif)$/i, ".$2");
}

/**
 * @param {string} src
 * @param {{ prefer?: Array<"sm"|"400"|"800"|"original"> }} [opts]
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
    else if (kind === "original") {
      candidates.push(master);
      if (!/\.webp$/i.test(master)) candidates.push(`${stem}.webp`);
    }
  }
  if (!candidates.includes(master)) candidates.push(master);

  for (const c of candidates) {
    if (existsMedia(c)) return c;
  }
  return master || pathOnly;
}

export function pdpImageUrlExisting(src) {
  return resolveExistingLocalMedia(src, { prefer: ["sm", "400", "original"] });
}

export function mediaRootPath() {
  return MEDIA_ROOT;
}

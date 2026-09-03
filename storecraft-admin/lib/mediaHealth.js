/**
 * Local VPS media health (permanent free hosting).
 * Cloudinary is legacy — we only report it as optional/info when still referenced.
 */
import { mediaRootWritable } from "@/lib/mediaStorage";
import { cloudNameFromUrl, getCloudinaryCloudName } from "@/lib/cloudinaryConfig";
import { checkCloudinaryHealth } from "@/lib/cloudinaryHealth";

const CACHE_MS = 45_000;
let cached = null;

/**
 * @param {{ sampleUrl?: string, bypassCache?: boolean, catalog?: object }} [opts]
 */
export async function checkMediaHealth(opts = {}) {
  const now = Date.now();
  if (!opts.bypassCache && cached && now - cached.at < CACHE_MS) {
    return cached.result;
  }

  const started = Date.now();
  const writable = await mediaRootWritable();
  const catalog = opts.catalog || null;
  const clouds = catalog?.urlClouds || {};
  const mediaUrls = Number(clouds["crazzycars.pk"] || clouds.media || 0);
  // Count host keys that look like /media on our store
  let localHostCount = 0;
  let remoteBrokenLikely = 0;
  for (const [host, n] of Object.entries(clouds)) {
    if (host === "media" || host === "local" || /crazzycars\.pk/i.test(host)) localHostCount += n;
    if (/dquier8fv|cloudinary/i.test(host)) remoteBrokenLikely += n;
  }

  const cloudinaryConfigured = Boolean(getCloudinaryCloudName() && process.env.CLOUDINARY_API_KEY);
  let cloudinary = null;
  if (cloudinaryConfigured && remoteBrokenLikely > 0) {
    try {
      cloudinary = await checkCloudinaryHealth({
        sampleUrl: opts.sampleUrl,
        bypassCache: opts.bypassCache,
      });
    } catch {
      cloudinary = { ok: false, code: "error", message: "Cloudinary check failed" };
    }
  }

  const ok = writable.ok;
  const result = {
    ok,
    storage: "local",
    mediaRoot: writable.root,
    writable: writable.ok,
    writableError: writable.ok ? null : writable.error,
    code: writable.ok ? "ok" : "media_not_writable",
    message: writable.ok
      ? remoteBrokenLikely > 0
        ? `Local media volume OK. ${remoteBrokenLikely} catalog URLs still point at Cloudinary — run scripts/rehost-media-to-vps.mjs --apply (and/or provide --from-zip).`
        : "Local media volume is writable. New uploads do not use Cloudinary."
      : `Media volume not writable at ${writable.root}. Mount Coolify volume (uid 1001). See docs/MEDIA-HOSTING.md`,
    catalog,
    localHostCount,
    remoteBrokenLikely,
    cloudinary,
    ms: Date.now() - started,
    checkedAt: new Date().toISOString(),
  };

  cached = { at: now, result };
  return result;
}

export function clearMediaHealthCache() {
  cached = null;
}

export { cloudNameFromUrl };

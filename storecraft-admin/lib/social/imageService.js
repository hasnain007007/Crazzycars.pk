/**
 * Social image processing: JPG q90 sRGB, IG aspect pad (4:5 … 1.91:1), max 1440w.
 */
import { mkdir, unlink, readdir, rm, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import mongoose from "mongoose";
import {
  getMediaRoot,
  publicMediaUrl,
  ensureMediaRoot,
} from "@/lib/mediaStorage";
import { getSocialMediaFolder, getSocialPublicBaseUrl } from "@/lib/social/config";

export const MAX_SOCIAL_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_SOCIAL_IMAGES = 10;
export const MAX_WIDTH = 1440;
/** Instagram feed: min 4:5 (0.8), max 1.91:1 */
export const MIN_ASPECT = 4 / 5;
export const MAX_ASPECT = 1.91;

const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export function isAllowedSocialImageMime(mime, filename = "") {
  const m = String(mime || "").toLowerCase();
  if (ALLOWED_MIME.has(m)) return true;
  const ext = path.extname(filename).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
}

/**
 * Pad (white) to nearest allowed Instagram aspect ratio. Never crops.
 * @returns {{ width: number, height: number, targetW: number, targetH: number }}
 */
export function computePaddedSize(width, height) {
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);
  let aspect = w / h;

  let targetW = w;
  let targetH = h;

  if (aspect < MIN_ASPECT) {
    // Too tall → widen
    targetW = Math.ceil(h * MIN_ASPECT);
    targetH = h;
  } else if (aspect > MAX_ASPECT) {
    // Too wide → heighten
    targetW = w;
    targetH = Math.ceil(w / MAX_ASPECT);
  }

  // Scale down if wider than MAX_WIDTH
  if (targetW > MAX_WIDTH) {
    const scale = MAX_WIDTH / targetW;
    targetW = MAX_WIDTH;
    targetH = Math.max(1, Math.round(targetH * scale));
  }

  // Also scale source fit dims
  let fitW = w;
  let fitH = h;
  if (fitW > targetW || fitH > targetH) {
    const s = Math.min(targetW / fitW, targetH / fitH);
    fitW = Math.max(1, Math.round(fitW * s));
    fitH = Math.max(1, Math.round(fitH * s));
  }

  return {
    width: Math.round(fitW),
    height: Math.round(fitH),
    targetW: Math.round(targetW),
    targetH: Math.round(targetH),
  };
}

/**
 * Process a buffer into IG-safe JPEG.
 * @returns {Promise<{ buffer: Buffer, width: number, height: number }>}
 */
export async function processSocialImageBuffer(inputBuffer) {
  if (!Buffer.isBuffer(inputBuffer) || !inputBuffer.length) {
    throw new Error("Empty image buffer");
  }
  if (inputBuffer.length > MAX_SOCIAL_IMAGE_BYTES) {
    throw new Error(`Image exceeds ${MAX_SOCIAL_IMAGE_BYTES / (1024 * 1024)} MB limit`);
  }

  const meta = await sharp(inputBuffer, { failOn: "none" }).metadata();
  const srcW = meta.width || 0;
  const srcH = meta.height || 0;
  if (!srcW || !srcH) throw new Error("Could not read image dimensions");

  const { width: fitW, height: fitH, targetW, targetH } = computePaddedSize(srcW, srcH);

  const left = Math.floor((targetW - fitW) / 2);
  const top = Math.floor((targetH - fitH) / 2);

  const composed = await sharp(inputBuffer, { failOn: "none" })
    .rotate()
    .resize(fitW, fitH, { fit: "fill" })
    .extend({
      top,
      bottom: Math.max(0, targetH - fitH - top),
      left,
      right: Math.max(0, targetW - fitW - left),
      background: { r: 255, g: 255, b: 255 },
    })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  // Strip metadata by re-encoding without withMetadata
  const cleaned = await sharp(composed.data)
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: cleaned.data,
    width: cleaned.info.width || targetW,
    height: cleaned.info.height || targetH,
  };
}

export function socialPostDir(postId) {
  const folder = getSocialMediaFolder();
  const id = String(postId || "").trim();
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid post id for media folder");
  }
  return path.join(folder, id).replace(/\\/g, "/");
}

export function socialImagePublicUrl(postId, order) {
  const rel = `${socialPostDir(postId)}/${order}.jpg`;
  // Prefer media helper (uses MEDIA_PUBLIC_BASE_URL / store URL)
  const viaMedia = publicMediaUrl(rel);
  if (viaMedia.startsWith("http")) return viaMedia;
  const base = getSocialPublicBaseUrl();
  return `${base}/media/${rel}`;
}

/**
 * Process + write image as MEDIA_ROOT/social/<postId>/<order>.jpg
 */
export async function saveProcessedSocialImage({ postId, order, buffer }) {
  const n = Math.max(1, Math.min(MAX_SOCIAL_IMAGES, Math.round(Number(order) || 1)));
  const processed = await processSocialImageBuffer(buffer);
  const relDir = socialPostDir(postId);
  const root = await ensureMediaRoot();
  const absDir = path.join(root, relDir);
  await mkdir(absDir, { recursive: true });
  const filename = `${n}.jpg`;
  const abs = path.join(absDir, filename);
  await writeFile(abs, processed.buffer);
  const relativePath = `${relDir}/${filename}`.replace(/\\/g, "/");
  return {
    path: relativePath,
    url: socialImagePublicUrl(postId, n),
    width: processed.width,
    height: processed.height,
    order: n,
    absolutePath: abs,
    bytes: processed.buffer.length,
  };
}

export async function deleteSocialPostMedia(postId) {
  try {
    const relDir = socialPostDir(postId);
    const absDir = path.join(getMediaRoot(), relDir);
    await rm(absDir, { recursive: true, force: true });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function deleteSocialImageFile(relativePath) {
  const rel = String(relativePath || "").replace(/^\/+/, "");
  if (!rel || rel.includes("..")) return { ok: false, error: "bad path" };
  const abs = path.join(getMediaRoot(), rel);
  try {
    await unlink(abs);
    return { ok: true };
  } catch (e) {
    if (e?.code === "ENOENT") return { ok: true };
    return { ok: false, error: e?.message || String(e) };
  }
}

/**
 * List image files for a post folder (for cleanup / health).
 */
export async function listSocialPostFiles(postId) {
  try {
    const absDir = path.join(getMediaRoot(), socialPostDir(postId));
    const names = await readdir(absDir);
    return names.filter((n) => /\.jpe?g$/i.test(n));
  } catch {
    return [];
  }
}

/**
 * HEAD/GET check that a public image URL returns 200 + image/jpeg.
 */
export async function probePublicImageUrl(url, { timeoutMs = 15000 } = {}) {
  const target = String(url || "").trim();
  if (!target.startsWith("http")) {
    return { ok: false, status: 0, contentType: "", error: "URL must be absolute https" };
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let res = await fetch(target, { method: "HEAD", signal: ctrl.signal, redirect: "follow" });
    // Some hosts reject HEAD — fall back to GET range
    if (res.status === 405 || res.status === 403) {
      res = await fetch(target, {
        method: "GET",
        signal: ctrl.signal,
        headers: { Range: "bytes=0-0" },
        redirect: "follow",
      });
    }
    const contentType = String(res.headers.get("content-type") || "").split(";")[0].trim();
    const ok = res.ok && /image\/jpeg/i.test(contentType);
    return {
      ok,
      status: res.status,
      contentType,
      error: ok ? "" : `Expected 200 image/jpeg, got ${res.status} ${contentType || "(no type)"}`,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      contentType: "",
      error: e?.name === "AbortError" ? "Timeout" : e?.message || "Fetch failed",
    };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Local / VPS media storage (permanent free replacement for Cloudinary).
 * Coolify: mount persistent volume at MEDIA_ROOT (default /app/media).
 */
import { mkdir, access } from "fs/promises";
import { constants as fsConstants } from "fs";
import path from "path";

export const DEFAULT_MEDIA_ROOT = "/app/media";
export const MEDIA_URL_PREFIX = "/media";

export function getMediaRoot() {
  const fromEnv = String(process.env.MEDIA_ROOT || "").trim();
  if (fromEnv) return path.resolve(fromEnv);
  if (process.env.NODE_ENV === "production") return DEFAULT_MEDIA_ROOT;
  return path.resolve(process.cwd(), "media");
}

export function getStorePublicOrigin() {
  const raw =
    process.env.MEDIA_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_STORE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "";
  let origin = String(raw).trim().replace(/\/$/, "");
  if (/\/media$/i.test(origin)) origin = origin.replace(/\/media$/i, "");
  return origin;
}

export function publicMediaUrl(relativePath) {
  const rel = String(relativePath || "")
    .replace(/^\/+/, "")
    .replace(/\\/g, "/");
  const pathPart = `${MEDIA_URL_PREFIX}/${rel}`.replace(/\/{2,}/g, "/");
  const origin = getStorePublicOrigin();
  if (!origin) return pathPart;
  return `${origin}${pathPart}`;
}

export function resolveMediaFilePath(urlPath) {
  const cleaned = String(urlPath || "")
    .replace(/^\/+/, "")
    .replace(/^media\//i, "")
    .replace(/\\/g, "/");
  if (!cleaned || cleaned.includes("..")) return null;
  const root = getMediaRoot();
  const abs = path.resolve(root, cleaned);
  if (!abs.startsWith(path.resolve(root) + path.sep) && abs !== path.resolve(root)) {
    return null;
  }
  return abs;
}

export async function ensureMediaRoot() {
  const root = getMediaRoot();
  await mkdir(root, { recursive: true });
  return root;
}

export async function mediaRootReadable() {
  try {
    const root = await ensureMediaRoot();
    await access(root, fsConstants.R_OK);
    return { ok: true, root };
  } catch (err) {
    return { ok: false, root: getMediaRoot(), error: String(err?.message || err).slice(0, 200) };
  }
}

export function contentTypeForExt(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".avif": "image/avif",
    ".svg": "image/svg+xml",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
  };
  return map[ext] || "application/octet-stream";
}

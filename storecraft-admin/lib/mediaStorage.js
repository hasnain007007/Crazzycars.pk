/**
 * Local / VPS media storage (permanent free replacement for Cloudinary).
 *
 * Coolify: mount the same persistent volume on store + admin at MEDIA_ROOT
 * (default /app/media). Public URLs are {STORE_URL}/media/...
 */
import { mkdir, writeFile, access } from "fs/promises";
import { constants as fsConstants } from "fs";
import path from "path";
import { randomBytes } from "crypto";

export const DEFAULT_MEDIA_ROOT = "/app/media";
export const MEDIA_URL_PREFIX = "/media";

export function getMediaRoot() {
  const fromEnv = String(process.env.MEDIA_ROOT || "").trim();
  if (fromEnv) return path.resolve(/*turbopackIgnore: true*/ fromEnv);
  if (process.env.NODE_ENV === "production") return DEFAULT_MEDIA_ROOT;
  // Local dev: keep files outside Next public/ so they persist and are served via /media route
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), "media");
}

export function getStorePublicOrigin() {
  const raw =
    process.env.MEDIA_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_STORE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "";
  let origin = String(raw).trim().replace(/\/$/, "");
  // If MEDIA_PUBLIC_BASE_URL already includes /media, strip it — we append prefix ourselves
  if (/\/media$/i.test(origin)) origin = origin.replace(/\/media$/i, "");
  return origin;
}

/** Absolute public URL for a file under MEDIA_ROOT (path relative to root). */
export function publicMediaUrl(relativePath) {
  const rel = String(relativePath || "")
    .replace(/^\/+/, "")
    .replace(/\\/g, "/");
  const pathPart = `${MEDIA_URL_PREFIX}/${rel}`.replace(/\/{2,}/g, "/");
  const origin = getStorePublicOrigin();
  if (!origin) return pathPart;
  return `${origin}${pathPart}`;
}

export function sanitizeMediaFolder(raw) {
  const s = String(raw || "products")
    .toLowerCase()
    .replace(/[^a-z0-9/_-]/gi, "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");
  return s || "products";
}

export function sanitizeMediaFilename(name, fallbackExt = ".webp") {
  const base = String(name || "upload")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  const extMatch = base.match(/(\.[a-z0-9]{1,8})$/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : fallbackExt;
  const stem = (extMatch ? base.slice(0, -ext.length) : base) || "upload";
  const unique = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  return `${stem}-${unique}${ext.startsWith(".") ? ext : `.${ext}`}`;
}

/**
 * Resolve a request path under /media to an absolute file path.
 * Returns null if path escapes MEDIA_ROOT.
 */
export function resolveMediaFilePath(urlPath) {
  const cleaned = String(urlPath || "")
    .replace(/^\/+/, "")
    .replace(/^media\//i, "")
    .replace(/\\/g, "/");
  if (!cleaned || cleaned.includes("..")) return null;
  const root = getMediaRoot();
  const abs = path.resolve(/*turbopackIgnore: true*/ root, cleaned);
  const rootAbs = path.resolve(/*turbopackIgnore: true*/ root);
  if (!abs.startsWith(rootAbs + path.sep) && abs !== rootAbs) {
    return null;
  }
  return abs;
}

export async function ensureMediaRoot() {
  const root = getMediaRoot();
  await mkdir(root, { recursive: true });
  return root;
}

/** Prebuild card thumbs so PDP/grid do not 404 on *-400.webp after upload. */
async function writeCardThumbBeside(absMasterPath, folder) {
  const folderKey = String(folder || "").toLowerCase();
  if (!/^(products|categories|uploads|blogs|vehicles|cars|brand)(\/|$)/.test(folderKey)) {
    return null;
  }
  const ext = path.extname(absMasterPath);
  if (!/\.(webp|jpe?g|png|gif|avif)$/i.test(ext)) return null;
  if (/-400\./i.test(absMasterPath) || /-800\./i.test(absMasterPath)) return null;
  const outAbs = absMasterPath.replace(/\.(webp|jpe?g|png|gif|avif)$/i, "-400.webp");
  try {
    const sharp = (await import("sharp")).default;
    await sharp(absMasterPath)
      .rotate()
      .resize(400, 400, { fit: "cover", position: "centre", withoutEnlargement: false })
      .webp({ quality: 72, effort: 4 })
      .toFile(outAbs);
    return outAbs;
  } catch (err) {
    console.warn("[mediaStorage] -400 thumb failed:", err?.message || err);
    return null;
  }
}

export async function writeMediaFile({ folder, filename, buffer }) {
  const root = await ensureMediaRoot();
  const safeFolder = sanitizeMediaFolder(folder);
  const safeName = filename.includes("/")
    ? sanitizeMediaFilename(path.basename(filename))
    : filename;
  const dir = path.join(root, safeFolder);
  await mkdir(dir, { recursive: true });
  const abs = path.join(dir, safeName);
  await writeFile(abs, buffer);
  await writeCardThumbBeside(abs, safeFolder);
  const relative = path.join(safeFolder, safeName).replace(/\\/g, "/");
  return {
    absolutePath: abs,
    relativePath: relative,
    url: publicMediaUrl(relative),
    publicId: `local:${relative}`,
  };
}

export async function mediaRootWritable() {
  try {
    const root = await ensureMediaRoot();
    await access(root, fsConstants.W_OK);
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

/**
 * Local / VPS media storage (permanent free replacement for Cloudinary).
 *
 * Coolify: mount the same persistent volume on store + admin at MEDIA_ROOT
 * (default /app/media). Public URLs are {STORE_URL}/media/...
 */
import { mkdir, writeFile, access, stat, unlink } from "fs/promises";
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

/**
 * Product pages load `{stem}-sm.webp` (≤1200 px) first and only fall back to the master on
 * 404 — build it on upload so a new photo shows straight away without a failed request.
 */
async function writePdpSizeBeside(absMasterPath, folder) {
  if (folder !== "products") return null;
  if (!/\.(webp|jpe?g|png|gif|avif)$/i.test(absMasterPath) || /-(400|800|sm)\./i.test(absMasterPath)) return null;
  const outAbs = absMasterPath.replace(/\.(webp|jpe?g|png|gif|avif)$/i, "-sm.webp");
  try {
    const sharp = (await import("sharp")).default;
    await sharp(absMasterPath)
      .rotate()
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toFile(outAbs);
    return outAbs;
  } catch (err) {
    console.warn("[mediaStorage] -sm build failed:", err?.message || err);
    return null;
  }
}

/** Above this a product master is too heavy for the product page — build a -800 copy. */
export const HEAVY_MASTER_BYTES = 200 * 1024;

/**
 * Product page size: ≤1000 px webp. Only written for heavy masters (PNG/JPEG or > 200 KB);
 * the store's PDP prefers `-800.webp` when it exists and keeps the master for zoom.
 */
async function writePdpMidBeside(absMasterPath, folder) {
  if (folder !== "products") return null;
  if (!/\.(webp|jpe?g|png|gif|avif)$/i.test(absMasterPath) || /-(400|800|sm)\./i.test(absMasterPath)) return null;
  try {
    const st = await stat(absMasterPath);
    if (st.size <= HEAVY_MASTER_BYTES && /\.webp$/i.test(absMasterPath)) return null;
    const outAbs = absMasterPath.replace(/\.(webp|jpe?g|png|gif|avif)$/i, "-800.webp");
    const sharp = (await import("sharp")).default;
    await sharp(absMasterPath)
      .rotate()
      .resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toFile(outAbs);
    // Never serve a "lighter" copy that is not clearly lighter (e.g. flat PNG artwork).
    if ((await stat(outAbs)).size > st.size * 0.8) {
      await unlink(outAbs).catch(() => {});
      return null;
    }
    return outAbs;
  } catch (err) {
    console.warn("[mediaStorage] -800 build failed:", err?.message || err);
    return null;
  }
}

async function fileSize(abs) {
  try {
    return (await stat(abs)).size;
  } catch {
    return 0;
  }
}

/**
 * Website Check › "Make photos lighter": build the smaller copies an older product photo is
 * missing (-400 card, -sm, -800 product page). Never changes or deletes the original.
 * @param {string} url  /media/products/... or https://store/media/products/...
 */
export async function optimiseProductPhoto(url) {
  const rel = String(url || "").replace(/^https?:\/\/[^/]+/i, "").split("?")[0];
  if (!/^\/media\/products\//i.test(rel) || /-(400|800|sm)\.webp$/i.test(rel)) {
    return { url, status: "skipped" };
  }
  const abs = resolveMediaFilePath(rel);
  if (!abs) return { url, status: "skipped" };
  const masterBytes = await fileSize(abs);
  if (!masterBytes) return { url, status: "missing" };
  const stem = abs.replace(/\.(webp|jpe?g|png|gif|avif)$/i, "");
  const built = [];
  if (!(await fileSize(`${stem}-400.webp`)) && (await writeCardThumbBeside(abs, "products"))) built.push("400");
  if (!(await fileSize(`${stem}-sm.webp`)) && (await writePdpSizeBeside(abs, "products"))) built.push("sm");
  if (!(await fileSize(`${stem}-800.webp`)) && (await writePdpMidBeside(abs, "products"))) built.push("800");
  const pageBytes = (await fileSize(`${stem}-800.webp`)) || masterBytes;
  return { url, status: built.length ? "built" : "ok", built, masterBytes, pageBytes };
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
  await writePdpSizeBeside(abs, safeFolder);
  await writePdpMidBeside(abs, safeFolder);
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

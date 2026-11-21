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

const DERIV_NAME_RE = /-(400|800|1200|sm|full)\./i;
export const MAX_STORED_MASTER_WIDTH = 2400;
export const HEAVY_MASTER_BYTES = 200 * 1024;

/** Prebuild card thumbs so PDP/grid do not 404 on *-400.webp after upload. */
async function writeCardThumbBeside(absMasterPath, folder) {
  const folderKey = String(folder || "").toLowerCase();
  if (!/^(products|categories|uploads|blogs|vehicles|cars|brand)(\/|$)/.test(folderKey)) {
    return null;
  }
  const ext = path.extname(absMasterPath);
  if (!/\.(webp|jpe?g|png|gif|avif)$/i.test(ext)) return null;
  if (DERIV_NAME_RE.test(absMasterPath)) return null;
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
 * Lossy WebP can come out HEAVIER than a small flat-colour PNG master (logos, graphics),
 * and product pages always prefer the -800 / -1200 copy. When that happens, re-encode
 * losslessly and keep whichever file is smaller, so a copy never bloats the page.
 */
async function keepLighterCopy(absMasterPath, outAbs, maxPx) {
  try {
    const [master, out] = await Promise.all([stat(absMasterPath), stat(outAbs)]);
    if (out.size <= master.size) return;
    const sharp = (await import("sharp")).default;
    const lossless = await sharp(absMasterPath)
      .rotate()
      .resize(maxPx, maxPx, { fit: "inside", withoutEnlargement: true })
      .webp({ lossless: true, effort: 4 })
      .toBuffer();
    if (lossless.length < out.size) await writeFile(outAbs, lossless);
  } catch (err) {
    console.warn("[mediaStorage] lighter-copy check failed:", err?.message || err);
  }
}

/** Legacy `-sm.webp` (≤1200) — kept for category banners / older clients. */
async function writePdpSizeBeside(absMasterPath, folder) {
  if (folder !== "products") return null;
  if (!/\.(webp|jpe?g|png|gif|avif)$/i.test(absMasterPath) || DERIV_NAME_RE.test(absMasterPath)) return null;
  const outAbs = absMasterPath.replace(/\.(webp|jpe?g|png|gif|avif)$/i, "-sm.webp");
  try {
    const sharp = (await import("sharp")).default;
    await sharp(absMasterPath)
      .rotate()
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toFile(outAbs);
    await keepLighterCopy(absMasterPath, outAbs, 1200);
    return outAbs;
  } catch (err) {
    console.warn("[mediaStorage] -sm build failed:", err?.message || err);
    return null;
  }
}

/** Card/desktop mid size: max 800 px wide WebP. */
async function writePdpMidBeside(absMasterPath, folder) {
  if (folder !== "products") return null;
  if (!/\.(webp|jpe?g|png|gif|avif)$/i.test(absMasterPath) || DERIV_NAME_RE.test(absMasterPath)) return null;
  try {
    const outAbs = absMasterPath.replace(/\.(webp|jpe?g|png|gif|avif)$/i, "-800.webp");
    const sharp = (await import("sharp")).default;
    await sharp(absMasterPath)
      .rotate()
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toFile(outAbs);
    await keepLighterCopy(absMasterPath, outAbs, 800);
    return outAbs;
  } catch (err) {
    console.warn("[mediaStorage] -800 build failed:", err?.message || err);
    return null;
  }
}

/** PDP gallery size: max 1200 px wide WebP. */
async function writePdpLargeBeside(absMasterPath, folder) {
  if (folder !== "products") return null;
  if (!/\.(webp|jpe?g|png|gif|avif)$/i.test(absMasterPath) || DERIV_NAME_RE.test(absMasterPath)) return null;
  try {
    const outAbs = absMasterPath.replace(/\.(webp|jpe?g|png|gif|avif)$/i, "-1200.webp");
    const sharp = (await import("sharp")).default;
    await sharp(absMasterPath)
      .rotate()
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toFile(outAbs);
    await keepLighterCopy(absMasterPath, outAbs, 1200);
    return outAbs;
  } catch (err) {
    console.warn("[mediaStorage] -1200 build failed:", err?.message || err);
    return null;
  }
}

/**
 * Cap stored master at 2400 px; convert PNG→WebP when there is no real alpha.
 * Returns { buffer, filename } (filename may change extension to .webp).
 */
export async function prepareMasterBuffer(buffer, filename) {
  const sharp = (await import("sharp")).default;
  let name = String(filename || "upload.webp");
  let pipeline = sharp(buffer, { failOn: "none" }).rotate();
  const meta = await pipeline.metadata();
  const hasAlpha = Boolean(meta.hasAlpha);
  const width = Number(meta.width) || 0;

  if (width > MAX_STORED_MASTER_WIDTH) {
    pipeline = pipeline.resize({
      width: MAX_STORED_MASTER_WIDTH,
      withoutEnlargement: true,
      fit: "inside",
    });
  }

  const isPng = /\.png$/i.test(name) || String(meta.format || "").toLowerCase() === "png";
  if (isPng && !hasAlpha) {
    const out = await pipeline.webp({ quality: 82, effort: 4 }).toBuffer();
    name = name.replace(/\.png$/i, ".webp");
    if (!/\.webp$/i.test(name)) name = `${name.replace(/\.[^.]+$/, "")}.webp`;
    return { buffer: out, filename: name, converted: "png_to_webp", hasAlpha: false };
  }

  // Still re-encode when we resized, to strip metadata and persist the cap.
  if (width > MAX_STORED_MASTER_WIDTH) {
    if (/\.webp$/i.test(name) || String(meta.format || "").toLowerCase() === "webp") {
      const out = await pipeline.webp({ quality: 82, effort: 4 }).toBuffer();
      return { buffer: out, filename: name, converted: "resize_webp", hasAlpha };
    }
    if (/\.jpe?g$/i.test(name) || String(meta.format || "").toLowerCase() === "jpeg") {
      const out = await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
      return { buffer: out, filename: name, converted: "resize_jpeg", hasAlpha };
    }
    // PNG with real transparency — keep PNG, just resized.
    if (isPng && hasAlpha) {
      const out = await pipeline.png({ compressionLevel: 9 }).toBuffer();
      return { buffer: out, filename: name, converted: "resize_png_alpha", hasAlpha: true };
    }
  }

  return { buffer, filename: name, converted: "none", hasAlpha };
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
  if (!/^\/media\/products\//i.test(rel) || /-(400|800|1200|sm|full)\.webp$/i.test(rel)) {
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
  if (!(await fileSize(`${stem}-1200.webp`)) && (await writePdpLargeBeside(abs, "products"))) built.push("1200");
  const pageBytes =
    (await fileSize(`${stem}-1200.webp`)) ||
    (await fileSize(`${stem}-800.webp`)) ||
    masterBytes;
  return { url, status: built.length ? "built" : "ok", built, masterBytes, pageBytes };
}

export async function writeMediaFile({ folder, filename, buffer, processImage = false }) {
  const root = await ensureMediaRoot();
  const safeFolder = sanitizeMediaFolder(folder);
  let safeName = filename.includes("/")
    ? sanitizeMediaFilename(path.basename(filename))
    : filename.includes("-") && /\d{10,}-[a-f0-9]{8}/i.test(filename)
      ? filename // already unique from sanitizeMediaFilename upstream
      : sanitizeMediaFilename(filename);

  let outBuffer = buffer;
  let processMeta = null;
  if (processImage) {
    const prepared = await prepareMasterBuffer(buffer, safeName);
    outBuffer = prepared.buffer;
    // Preserve unique stem; only swap extension when PNG→WebP.
    if (prepared.filename !== safeName) {
      const stem = safeName.replace(/\.[^.]+$/, "");
      const newExt = path.extname(prepared.filename) || ".webp";
      safeName = `${stem}${newExt}`;
    }
    processMeta = { converted: prepared.converted, hasAlpha: prepared.hasAlpha };
  }

  const dir = path.join(root, safeFolder);
  await mkdir(dir, { recursive: true });
  const abs = path.join(dir, safeName);
  await writeFile(abs, outBuffer);
  await writeCardThumbBeside(abs, safeFolder);
  await writePdpSizeBeside(abs, safeFolder);
  await writePdpMidBeside(abs, safeFolder);
  await writePdpLargeBeside(abs, safeFolder);
  const relative = path.join(safeFolder, safeName).replace(/\\/g, "/");
  return {
    absolutePath: abs,
    relativePath: relative,
    url: publicMediaUrl(relative),
    publicId: `local:${relative}`,
    bytes: outBuffer.length,
    processMeta,
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

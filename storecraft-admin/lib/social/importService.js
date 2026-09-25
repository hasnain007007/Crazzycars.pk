/**
 * Temp import store under MEDIA_ROOT/_imports/<importId>/
 */
import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile, readdir, rm, stat } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import JSZip from "jszip";
import { getMediaRoot, ensureMediaRoot } from "@/lib/mediaStorage";
import { parseWeekSheet } from "@/lib/social/sheetParser";
import { matchPhotosToPosts } from "@/lib/social/photoMatch";
import { isAllowedSocialImageMime, processSocialImageBuffer } from "@/lib/social/imageService";
import { getSocialPublicBaseUrl } from "@/lib/social/config";

const IMPORT_TTL_MS = 48 * 60 * 60 * 1000;
const MAX_ZIP_BYTES = 200 * 1024 * 1024;
const MAX_FILES = 200;

export function importsRoot() {
  return path.join(getMediaRoot(), "_imports");
}

export function importDir(importId) {
  return path.join(importsRoot(), String(importId));
}

async function ensureImportDir(importId) {
  await ensureMediaRoot();
  const dir = importDir(importId);
  await mkdir(path.join(dir, "files"), { recursive: true });
  return dir;
}

function safeRelPath(name) {
  const cleaned = String(name || "")
    .replace(/\\/g, "/")
    .split("/")
    .filter((p) => p && p !== ".." && p !== ".")
    .join("/");
  if (!cleaned || cleaned.includes("..")) throw new Error("Unsafe file path blocked");
  return cleaned;
}

export async function cleanupOldImports() {
  try {
    const root = importsRoot();
    if (!existsSync(root)) return;
    const entries = await readdir(root, { withFileTypes: true });
    const now = Date.now();
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const dir = path.join(root, ent.name);
      try {
        const st = await stat(dir);
        if (now - st.mtimeMs > IMPORT_TTL_MS) {
          await rm(dir, { recursive: true, force: true });
        }
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

async function extractZip(buffer, destDir) {
  if (buffer.length > MAX_ZIP_BYTES) throw new Error("Zip is larger than 200 MB");
  const zip = await JSZip.loadAsync(buffer);
  let count = 0;
  const entries = Object.keys(zip.files);
  for (const entryName of entries) {
    const entry = zip.files[entryName];
    if (!entry || entry.dir) continue;
    const rel = safeRelPath(entryName);
    if (!rel) continue;
    count += 1;
    if (count > MAX_FILES) throw new Error("Zip has more than 200 files");
    const out = path.join(destDir, "files", rel);
    await mkdir(path.dirname(out), { recursive: true });
    const data = await entry.async("nodebuffer");
    await writeFile(out, data);
  }
}

/**
 * Accept multipart parts: sheet + images and/or zip.
 * Returns preview payload.
 */
export async function previewImportFromParts(parts) {
  await cleanupOldImports();
  const importId = randomUUID();
  const dir = await ensureImportDir(importId);
  const filesDir = path.join(dir, "files");

  let sheetBuffer = null;
  let sheetName = "";
  const imageFiles = [];
  let fileCount = 0;

  for (const part of parts) {
    const filename = part.filename || part.name || "file";
    const buf = part.buffer;
    if (!buf?.length) continue;
    fileCount += 1;
    if (fileCount > MAX_FILES) throw new Error("Too many files (max 200)");

    const lower = filename.toLowerCase();
    if (lower.endsWith(".zip")) {
      await extractZip(buf, dir);
      continue;
    }
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv")) {
      sheetBuffer = buf;
      sheetName = filename;
      await writeFile(path.join(dir, "sheet" + path.extname(lower)), buf);
      continue;
    }
    // image
    const rel = safeRelPath(filename);
    const abs = path.join(filesDir, rel);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, buf);
    imageFiles.push({ name: rel, abs });
  }

  // Collect images already extracted from zip
  async function walk(base, prefix = "") {
    const entries = await readdir(base, { withFileTypes: true });
    for (const ent of entries) {
      const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
      const abs = path.join(base, ent.name);
      if (ent.isDirectory()) await walk(abs, rel);
      else {
        const lower = ent.name.toLowerCase();
        if (/\.(jpe?g|png|webp|heic)$/i.test(lower)) {
          if (!imageFiles.some((f) => f.abs === abs)) {
            imageFiles.push({ name: rel, abs });
          }
        } else if (!sheetBuffer && /\.(xlsx|xls|csv)$/i.test(lower)) {
          sheetBuffer = await readFile(abs);
          sheetName = ent.name;
        }
      }
    }
  }
  await walk(filesDir);

  if (!sheetBuffer) throw new Error("Please drop an XLSX or CSV week sheet");

  const parsed = parseWeekSheet(sheetBuffer, sheetName || "sheet.xlsx");
  const codes = parsed.rows.map((r) => r.data.postCode).filter(Boolean);

  // Register tmp images with ids
  const registered = [];
  for (const img of imageFiles) {
    const tmpId = randomUUID().slice(0, 8);
    const meta = {
      tmpId,
      name: path.basename(img.name),
      relPath: img.name,
      abs: img.abs,
    };
    registered.push(meta);
  }
  await writeFile(
    path.join(dir, "manifest.json"),
    JSON.stringify({
      importId,
      sheetName,
      createdAt: new Date().toISOString(),
      files: registered.map(({ tmpId, name, relPath }) => ({ tmpId, name, relPath })),
      sheetWarnings: parsed.warnings,
    })
  );

  const { byCode, unmatched } = matchPhotosToPosts(
    registered.map((f) => ({ name: f.relPath, tmpId: f.tmpId })),
    codes
  );

  const baseUrl = getSocialPublicBaseUrl();

  const rows = [];
  for (const row of parsed.rows) {
    const imgs = (byCode[row.data.postCode] || []).map((m) => {
      const full = registered.find((r) => r.tmpId === m.tmpId);
      return {
        tmpId: m.tmpId,
        name: full?.name || m.name,
        order: m.order,
        thumbUrl: `${baseUrl}/media/_imports/${importId}/files/${encodeURI(full?.relPath || m.name)}`,
      };
    });
    const errors = [...row.errors];
    const warnings = [...row.warnings, ...parsed.warnings.filter(() => false)];
    if ((row.data.platforms.includes("fb") || row.data.platforms.includes("ig")) && imgs.length === 0) {
      errors.push("Instagram/Facebook needs at least 1 photo");
    }
    if (imgs.length > 10) errors.push("Carousel max 10 photos");
    if (row.data.caption && row.data.caption.length > 2000) {
      errors.push("Caption is too long");
    }
    rows.push({
      ...row,
      errors,
      warnings,
      images: imgs,
      include: errors.length === 0,
    });
  }

  // proximity warnings
  const timed = rows
    .filter((r) => r.data.scheduledAt)
    .sort((a, b) => new Date(a.data.scheduledAt) - new Date(b.data.scheduledAt));
  for (let i = 1; i < timed.length; i++) {
    const prev = new Date(timed[i - 1].data.scheduledAt).getTime();
    const cur = new Date(timed[i].data.scheduledAt).getTime();
    if (cur - prev < 60 * 60 * 1000) {
      timed[i].warnings.push("Less than 60 minutes after previous post");
    }
  }

  await writeFile(path.join(dir, "preview.json"), JSON.stringify({ rows, unmatched }, null, 2));

  return {
    importId,
    sheetName,
    sheetWarnings: parsed.warnings,
    rows: rows.map(sanitizeRow),
    unmatched: unmatched.map((u) => {
      const full = registered.find((r) => r.tmpId === u.tmpId);
      return {
        tmpId: u.tmpId,
        name: full?.name || u.name,
        thumbUrl: `${baseUrl}/media/_imports/${importId}/files/${encodeURI(full?.relPath || u.name)}`,
      };
    }),
  };
}

function sanitizeRow(row) {
  return {
    rowNo: row.rowNo,
    include: row.include !== false && !(row.errors || []).length,
    skip: Boolean(row.skip),
    errors: row.errors || [],
    warnings: row.warnings || [],
    data: row.data,
    images: row.images || [],
  };
}

export async function loadImportPreview(importId) {
  const dir = importDir(importId);
  const raw = await readFile(path.join(dir, "preview.json"), "utf8");
  return JSON.parse(raw);
}

export async function saveImportPreview(importId, preview) {
  const dir = importDir(importId);
  await writeFile(path.join(dir, "preview.json"), JSON.stringify(preview, null, 2));
}

export async function readImportManifest(importId) {
  const dir = importDir(importId);
  return JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8"));
}

export async function resolveTmpFile(importId, tmpId) {
  const manifest = await readImportManifest(importId);
  const hit = (manifest.files || []).find((f) => f.tmpId === tmpId);
  if (!hit) throw new Error("Photo not found in this import");
  const abs = path.join(importDir(importId), "files", hit.relPath);
  return { ...hit, abs };
}

export { isAllowedSocialImageMime, processSocialImageBuffer };

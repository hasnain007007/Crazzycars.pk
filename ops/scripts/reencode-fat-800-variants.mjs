#!/usr/bin/env node
/**
 * Re-encode oversized -800.webp derivatives (masters untouched).
 * Target: every -800.webp ≤ MAX_BYTES (default 250 KiB).
 *
 * Usage on VPS:
 *   MEDIA_ROOT=/data/crazzycars/media node ops/scripts/reencode-fat-800-variants.mjs
 *   DRY_RUN=1 ... 
 */
import { access, copyFile, mkdir, readdir, stat, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY = process.env.DRY_RUN === "1" || process.argv.includes("--dry-run");
const MEDIA_ROOT = process.env.MEDIA_ROOT || "/app/media";
const PRODUCTS = path.join(MEDIA_ROOT, "products");
const MAX_BYTES = Number(process.env.MAX_800_BYTES || 250 * 1024);
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const BACKUP_DIR =
  process.env.BACKUP_DIR ||
  path.join("/data/crazzycars-media-backups", `fat-800-${stamp}`);

const DERIV_800 = /-800\.webp$/i;
const MASTER_EXT = /\.(webp|jpe?g|png|gif|avif)$/i;

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function masterCandidates(stem) {
  return [".webp", ".png", ".jpg", ".jpeg", ".gif", ".avif"].map((ext) => `${stem}${ext}`);
}

async function findMaster(stem) {
  for (const name of masterCandidates(stem)) {
    const abs = path.join(PRODUCTS, name);
    if (await exists(abs)) return abs;
  }
  return "";
}

async function encodeToBudget(sharp, masterAbs, outAbs, maxBytes) {
  // Prefer readable infographics: start q=78 @ width 800, then step down.
  const qualities = [78, 72, 68, 64, 60, 56, 52];
  const widths = [800, 760, 720, 680];
  let best = null;
  for (const w of widths) {
    for (const q of qualities) {
      const buf = await sharp(masterAbs, { failOn: "none" })
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: q, effort: 6 })
        .toBuffer();
      if (!best || buf.length < best.buf.length) best = { buf, w, q };
      if (buf.length <= maxBytes) return { buf, w, q, hit: true };
    }
  }
  return { ...best, hit: false };
}

async function main() {
  const sharp = (await import("sharp")).default;
  const entries = await readdir(PRODUCTS);
  const fat = [];
  for (const name of entries) {
    if (!DERIV_800.test(name)) continue;
    const abs = path.join(PRODUCTS, name);
    const st = await stat(abs);
    if (!st.isFile() || st.size <= MAX_BYTES) continue;
    fat.push({ name, abs, size: st.size });
  }
  fat.sort((a, b) => b.size - a.size);

  console.log(
    JSON.stringify({
      mediaRoot: MEDIA_ROOT,
      fatCount: fat.length,
      maxBytes: MAX_BYTES,
      dryRun: DRY,
      backupDir: BACKUP_DIR,
    })
  );

  if (!DRY && fat.length) await mkdir(BACKUP_DIR, { recursive: true });

  const report = [];
  let rebuilt = 0;
  let failed = 0;

  for (const f of fat) {
    const stem = f.name.replace(DERIV_800, "");
    const master = await findMaster(stem);
    if (!master) {
      failed += 1;
      report.push({ name: f.name, before: f.size, action: "skip", note: "no master" });
      console.log(JSON.stringify({ skip: f.name, reason: "no-master" }));
      continue;
    }
    try {
      const { buf, w, q, hit } = await encodeToBudget(sharp, master, f.abs, MAX_BYTES);
      const row = {
        name: f.name,
        beforeKb: Math.round(f.size / 1024),
        afterKb: Math.round(buf.length / 1024),
        width: w,
        quality: q,
        underBudget: hit,
      };
      if (DRY) {
        report.push({ ...row, action: "dry-run" });
        console.log(JSON.stringify({ dry: row }));
        continue;
      }
      await copyFile(f.abs, path.join(BACKUP_DIR, f.name));
      await writeFile(f.abs, buf);
      rebuilt += 1;
      report.push({ ...row, action: "rewrote" });
      console.log(JSON.stringify({ rebuilt: row }));
    } catch (err) {
      failed += 1;
      report.push({ name: f.name, action: "fail", error: String(err?.message || err) });
      console.log(JSON.stringify({ fail: f.name, error: String(err?.message || err) }));
    }
  }

  const outJson = path.join(
    DRY ? "/tmp" : BACKUP_DIR,
    `reencode-fat-800-${stamp}.json`
  );
  await writeFile(
    outJson,
    JSON.stringify({ at: stamp, maxBytes: MAX_BYTES, rebuilt, failed, report }, null, 2)
  );
  console.log(JSON.stringify({ done: true, rebuilt, failed, reportPath: outJson }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
